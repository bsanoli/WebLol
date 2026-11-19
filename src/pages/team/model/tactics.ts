// Táticas do time: texto livre, geral ou ligado a uma composição.
// Cada tática é um item próprio em `tactics`, sincronizado como as comps e jogadas.
export const GENERAL_TACTIC = "geral"

export type Tactic = {
  id: string
  comp: string | null
  name: string
  text: string
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
export function writeTactic(state: TacticsState, compId: string | null, compName: string, text: string, now: number) {
  const list = ensureTactics(state)
  const id = tacticId(compId)
  const index = list.findIndex(item => item.id === id)
  if (!text.trim()) {
    if (index >= 0) list.splice(index, 1)
    return
  }
  const name = compId ? `Táticas · ${compName}` : "Táticas gerais"
  const item: Tactic = { id, comp: compId, name, text, updated: now }
  if (index >= 0) list[index] = item
  else list.push(item)
}

export const hasTactic = (state: TacticsState, compId: string | null) => !!readTactic(state, compId).trim()
