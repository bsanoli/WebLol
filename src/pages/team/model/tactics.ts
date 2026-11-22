import { DRAFT_SIDE } from "./draft-order"
import { draftOf, type Composition } from "./local-state"
import {
  collectImageIds,
  docFromLegacy,
  docWithCompNotes,
  plainTextOf,
  readTacticDoc,
  type TacticDoc,
} from "./tactic-doc"
// Táticas do time: texto livre, geral ou ligado a uma composição.
// Cada tática é um item próprio em `tactics`, sincronizado como as comps e jogadas.
const GENERAL_TACTIC = "geral"

export type Tactic = {
  id: string
  comp: string | null
  name: string
  text: string
  images?: string[]
  /** Documento do editor de texto; táticas antigas só têm `text` e `images`. */
  doc?: TacticDoc
  updated: number
}

type TacticsState = { tactics?: unknown; tacticsGeneral?: unknown; comps?: Composition[] }

const tacticId = (compId: string | null) => (compId ? `comp-${compId}` : GENERAL_TACTIC)

function isTactic(value: unknown): value is Tactic {
  const item = value as Tactic
  return !!item && typeof item.id === "string" && typeof item.text === "string"
}

/** Garante a lista de táticas válida no estado vindo do armazenamento. */
export function ensureTactics(state: TacticsState): Tactic[] {
  if (!Array.isArray(state.tactics)) state.tactics = []
  state.tactics = (state.tactics as unknown[]).filter(isTactic)
  return state.tactics as Tactic[]
}

/** Texto da tática geral (compId nulo) ou da tática de uma composição. */
function readTactic(state: TacticsState, compId: string | null): string {
  return ensureTactics(state).find(item => item.id === tacticId(compId))?.text ?? ""
}

/** Grava o texto; uma tática vazia sai da lista para não gerar envio sem conteúdo. */
export function writeTactic(
  state: TacticsState,
  compId: string | null,
  compName: string,
  text: string,
  now: number,
  images?: string[],
) {
  const list = ensureTactics(state)
  const id = tacticId(compId)
  const index = list.findIndex(item => item.id === id)
  const keptImages = images ?? (index >= 0 ? (list[index].images ?? []) : [])
  if (!text.trim() && !keptImages.length) {
    if (index >= 0) list.splice(index, 1)
    return
  }
  const name = compId ? `Táticas · ${compName}` : "Táticas gerais"
  const item: Tactic = { id, comp: compId, name, text, updated: now }
  if (keptImages.length) item.images = keptImages
  if (index >= 0) list[index] = item
  else list.push(item)
}

/** Ids dos prints anexados à tática; as imagens ficam guardadas à parte. */
function readTacticImages(state: TacticsState, compId: string | null): string[] {
  const images = ensureTactics(state).find(item => item.id === tacticId(compId))?.images
  return Array.isArray(images) ? images.filter(id => typeof id === "string") : []
}

/** Anotações antigas da comp que ainda não entraram no bloco de notas. */
function pendingCompNotes(comp: Composition | undefined) {
  if (!comp) return null
  const note = comp.draft?.note
  const draft = (["blue", "red"] as const)
    .map(side => ({ label: DRAFT_SIDE[side], text: note?.[side] ?? "" }))
    .filter(item => item.text.trim())
  return comp.notes?.trim() || draft.length ? { general: comp.notes ?? "", draft } : null
}

/** Documento da tática; uma tática antiga e as anotações antigas da comp são convertidas na leitura, sem gravar nada. */
export function readTacticDocument(state: TacticsState, compId: string | null): TacticDoc {
  const item = ensureTactics(state).find(entry => entry.id === tacticId(compId))
  const doc = readTacticDoc(item?.doc) ?? docFromLegacy(item?.text ?? "", readTacticImages(state, compId))
  const notes = compId ? pendingCompNotes(state.comps?.find(comp => comp.id === compId)) : null
  return notes ? docWithCompNotes(doc, notes) : doc
}

/** Depois que o bloco de notas gravou as anotações antigas, elas saem da comp para não aparecer duas vezes. */
export function didClearCompNotes(comp: Composition): boolean {
  if (!pendingCompNotes(comp)) return false
  comp.notes = ""
  draftOf(comp).note = { blue: "", red: "" }
  return true
}

/** Grava o documento, o texto puro derivado dele e os ids das imagens referenciadas. */
export function writeTacticDocument(
  state: TacticsState,
  compId: string | null,
  compName: string,
  doc: TacticDoc,
  now: number,
) {
  const text = plainTextOf(doc),
    images = collectImageIds(doc)
  writeTactic(state, compId, compName, text, now, images)
  const item = ensureTactics(state).find(entry => entry.id === tacticId(compId))
  if (item) item.doc = doc
}

export const hasTactic = (state: TacticsState, compId: string | null) =>
  !!readTactic(state, compId).trim() ||
  readTacticImages(state, compId).length > 0 ||
  (!!compId && !!pendingCompNotes(state.comps?.find(comp => comp.id === compId)))

/** Link do OP.GG do time. Aceita só http(s); sem protocolo, assume https. Vazio apaga. */
export function normalizeOpggLink(value: string): string | null {
  const raw = value.trim()
  if (!raw) return ""
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
  } catch {
    return null
  }
}

export const opggOf = (comp: Composition) => comp.opgg || ""

export function setOpgg(comp: Composition, link: string) {
  if (link) comp.opgg = link
  else delete comp.opgg
}
