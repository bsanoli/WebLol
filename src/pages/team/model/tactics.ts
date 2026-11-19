import { blank, type Composition } from "./local-state"
// Táticas do time: texto livre, geral ou ligado a uma composição.
// Cada tática é um item próprio em `tactics`, sincronizado como as comps e jogadas.
export const GENERAL_TACTIC = "geral"

export type Tactic = {
  id: string
  comp: string | null
  name: string
  text: string
  images?: string[]
  updated: number
}

type TacticsState = { tactics?: unknown; tacticsGeneral?: unknown }

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
export function readTactic(state: TacticsState, compId: string | null): string {
  return ensureTactics(state).find(item => item.id === tacticId(compId))?.text ?? ""
}

/** Grava o texto; uma tática vazia sai da lista para não gerar envio sem conteúdo. */
export function writeTactic(state: TacticsState, compId: string | null, compName: string, text: string, now: number, images?: string[]) {
  const list = ensureTactics(state)
  const id = tacticId(compId)
  const index = list.findIndex(item => item.id === id)
  const keptImages = images ?? (index >= 0 ? list[index].images ?? [] : [])
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
export function readTacticImages(state: TacticsState, compId: string | null): string[] {
  const images = ensureTactics(state).find(item => item.id === tacticId(compId))?.images
  return Array.isArray(images) ? images.filter(id => typeof id === "string") : []
}

export const hasTactic = (state: TacticsState, compId: string | null) =>
  !!readTactic(state, compId).trim() || readTacticImages(state, compId).length > 0

// Táticas salvas: ficam na lista de comps com a marca `tactic`, mas não são composições.
// Aparecem em Opções por posição ou na Ordem do draft só quando a parte correspondente foi preenchida.
export type TacticPanel = "draft" | "lane"
type TacticItem = Composition & { tactic?: boolean; tacticViews?: Partial<Record<TacticPanel, boolean>> }

export const isSavedTactic = (item: unknown): boolean => (item as TacticItem | undefined)?.tactic === true

const hasChampions = (item: Composition) => Object.values(item.lanes).some(list => list.length > 0)

/** Cria a tática salva a partir de uma comp (cópia dos picks) ou vazia. */
export function createSavedTactic(source: Composition | null, id: string, name: string, now: number, panel: TacticPanel): TacticItem {
  const base = source ? structuredClone(source) as TacticItem : blank(name) as TacticItem
  const item: TacticItem = { ...base, id, name, updated: now, tactic: true, tacticViews: {} }
  if (hasChampions(item)) item.tacticViews = { [panel]: true }
  return item
}

/** Marca em qual visão a tática foi preenchida; sem campeões ela some das outras abas. */
export function markTacticPanel(item: Composition, panel: TacticPanel) {
  const tactic = item as TacticItem
  if (!tactic.tactic) return
  tactic.tacticViews = hasChampions(item) ? { ...tactic.tacticViews, [panel]: true } : {}
}

/** Comps que aparecem numa visão do editor: táticas salvas primeiro, só se preenchidas naquela visão. */
export function itemsForView<T extends Composition>(items: T[], panel: TacticPanel): T[] {
  const tactics = items.filter(item => isSavedTactic(item) && (item as TacticItem).tacticViews?.[panel])
  return [...tactics, ...items.filter(item => !isSavedTactic(item))]
}
