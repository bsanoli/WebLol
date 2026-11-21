import { STORAGE_KEYS } from "@/shared/config"
import { compositionFromSaved, hasLegacyBans } from "./composition-storage"
import { sanitizeComposition } from "./saved-data"

export const KEY = STORAGE_KEYS.teamAreaState
export const uid = () => Math.random().toString(36).slice(2, 10)

export type DraftSide = "blue" | "red"
export type DraftLane = "top" | "jg" | "mid" | "adc" | "sup"
export type CompositionDraft = {
  side: DraftSide
  order: Record<DraftSide, DraftLane[]>
  /** Plano do draft de cada lado; vai para o bloco de notas da comp na primeira edição. */
  note: Record<DraftSide, string>
  /** Id da composição adversária colocada do outro lado do draft (salvo como `rival`). */
  enemyId?: string
}

export type Composition = {
  id: string
  name: string
  /** Campeões por posição. Os bans ficam em `bans` (salvos como `bans`; o formato antigo `lanes.ban` é só lido, ver composition-storage.ts). */
  lanes: Record<DraftLane, string[]>
  bans: string[]
  laneNotes: Record<string, string>
  notes: string
  updated: number
  /** De quem é a comp: da nossa equipe (padrão) ou da equipe adversária (salvo como `team: "mine" | "enemy"`). */
  owner?: "ours" | "enemy"
  /** Link do OP.GG do time adversário. */
  opgg?: string
  draft?: CompositionDraft
  /** Confrontos da comp nossa contra adversárias, cada um com tática própria. */
  matchups?: { id: string; enemy: string; updated: number }[]
}

export const DRAFT_LANES: DraftLane[] = ["top", "jg", "mid", "adc", "sup"]
const DEFAULT_ORDER: DraftLane[] = ["mid", "jg", "sup", "adc", "top"]

/** Normaliza o draft guardado (lado, ordem dos picks e planos) e o devolve, criando se faltar. */
export function draftOf(c: Composition): CompositionDraft {
  if (!c.draft || typeof c.draft !== "object") c.draft = {} as CompositionDraft
  const d = c.draft
  if (d.side !== "red") d.side = "blue"
  if (!d.note || typeof d.note !== "object") d.note = { blue: "", red: "" }
  if (!d.order || typeof d.order !== "object") d.order = {} as CompositionDraft["order"]
  for (const side of ["blue", "red"] as const) {
    const saved = (Array.isArray(d.order[side]) ? d.order[side] : []).filter(lane => DRAFT_LANES.includes(lane))
    d.order[side] = [...new Set([...saved, ...DEFAULT_ORDER])].slice(0, 5)
  }
  if (typeof d.enemyId !== "string" || !d.enemyId) delete d.enemyId
  return d
}

/** Primeiro campeão de cada lane (top, jg, mid, adc, sup), com "" onde a lane está vazia. */
export const compositionPreview = (c: Composition): string[] => DRAFT_LANES.map(lane => c.lanes[lane]?.[0] ?? "")

export function blank(name = "Nova comp"): Composition {
  return {
    id: uid(),
    name: name || "Nova comp",
    lanes: { top: [], jg: [], mid: [], adc: [], sup: [] },
    bans: [],
    laneNotes: {},
    notes: "",
    updated: Date.now(),
  }
}

/** Estado da Área do time guardado no navegador (`lol-comps-time-v1`), já no formato do código. */
export type TeamState = {
  comps: Composition[]
  cur: string
  view: "draft" | "tactics" | "map"
  /** Última composição nossa aberta; volta para ela ao sair de uma adversária. */
  lastComp?: string
  tacticsMatchup?: string | null
  tacticsGeneral?: boolean
  tacticsDrawer?: boolean
  /** Barra de confronto do draft recolhida em uma linha. */
  matchupBarCollapsed?: boolean
  /** Visão do quadro de Táticas: `draft` (cards com arte) ou `positions` (visão Lane, só ícones). */
  tacticsBoard?: "draft" | "positions"
  /** Aba do Conhecimento aberta (`wave` ou `obj`). */
  kTab?: string
  curPlay?: string
  plays?: { id: string }[]
  tactics?: unknown
}

/** O estado guardado no navegador ainda está no formato antigo dos bans (`lanes.ban`)? */
export function storedStateHasLegacyBans() {
  try {
    return hasLegacyBans(JSON.parse(localStorage.getItem(KEY) ?? "null"))
  } catch {
    return false
  }
}

export function loadTeamState(): TeamState {
  let S: { comps: Composition[]; cur: string } | null
  try {
    S = JSON.parse(localStorage.getItem(KEY) ?? "null")
  } catch {
    S = null
  }
  if (S && Array.isArray(S.comps))
    S.comps = S.comps
      .map(compositionFromSaved)
      .map(sanitizeComposition)
      .filter(comp => comp !== null)
  if (!S || !Array.isArray(S.comps)) {
    // Comp de exemplo (genérica) para quem ainda não tem as comps de um time
    const c = blank("Comp de exemplo: luta em time")
    c.lanes.top = ["Ornn", "Sion"]
    c.lanes.jg = ["Sejuani", "Vi"]
    c.lanes.mid = ["Orianna", "Azir"]
    c.lanes.adc = ["Jinx", "Aphelios"]
    c.lanes.sup = ["Braum", "Rell"]
    c.notes = "Comp de exemplo. Entre com seu usuário e escolha um time para ver e editar as comps do seu time."
    S = { comps: [c], cur: c.id }
  }
  if (!S.comps.length) {
    const c = blank()
    S.comps.push(c)
    S.cur = c.id
  }
  if (!S.comps.some(c => c.id === S.cur)) S.cur = S.comps[0].id
  return S as TeamState
}

/** Posição de uma lista de campeões da composição: as cinco posições ou `"ban"`. */
export type ChampionSlot = DraftLane | "ban"

/** Lista de campeões de uma posição ou dos bans. */
export const championsOf = (comp: Composition, slot: ChampionSlot): string[] =>
  slot === "ban" ? comp.bans : comp.lanes[slot]

export function setChampions(comp: Composition, slot: ChampionSlot, names: string[]) {
  if (slot === "ban") comp.bans = names
  else comp.lanes[slot] = names
}
