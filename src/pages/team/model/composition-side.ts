import { draftOf, type Composition, type DraftSide } from "./local-state"

// Lado de cada composição: nossa ou adversária. Comps antigas não têm `team`;
// as antigas "táticas salvas" guardavam o lado em `tacticTeam`.
export type CompTeam = "mine" | "enemy"

type LegacyComposition = Composition & { tactic?: boolean; tacticViews?: unknown; tacticTeam?: CompTeam }

export function teamOf(comp: Composition): CompTeam {
  if (comp.team === "enemy" || comp.team === "mine") return comp.team
  return (comp as LegacyComposition).tacticTeam === "enemy" ? "enemy" : "mine"
}

export const isEnemy = (comp: Composition) => teamOf(comp) === "enemy"

/** Grava o lado no formato atual e tira as marcas das antigas táticas salvas. */
export function settleTeam(comp: Composition, team: CompTeam = teamOf(comp)) {
  const legacy = comp as LegacyComposition
  comp.team = team
  delete legacy.tactic
  delete legacy.tacticViews
  delete legacy.tacticTeam
  if (team === "enemy" && comp.draft?.rival) delete comp.draft.rival
}

export const oursOf = <T extends Composition>(comps: T[]) => comps.filter(comp => !isEnemy(comp))
export const enemiesOf = <T extends Composition>(comps: T[]) => comps.filter(isEnemy)

/** Comp adversária colocada do outro lado do draft, se ainda existir. */
export function rivalOf<T extends Composition>(comp: T, comps: T[]): T | null {
  const id = comp.draft?.rival
  if (!id || isEnemy(comp)) return null
  return comps.find(item => item.id === id && isEnemy(item)) ?? null
}

/** Título para listas: a comp nossa que já tem adversária aparece como "Nome x Rival". */
export function compTitle<T extends Composition>(comp: T, comps: T[]) {
  const rival = rivalOf(comp, comps)
  return rival ? `${comp.name} x ${rival.name}` : comp.name
}

export function setRival(comp: Composition, rivalId: string | null) {
  const draft = draftOf(comp)
  if (rivalId) draft.rival = rivalId
  else delete draft.rival
}

export const oppositeSide = (side: DraftSide): DraftSide => side === "blue" ? "red" : "blue"

/** Ordem das lanes nos picks da comp adversária, do lado oposto ao nosso. */
export function rivalOrder(comp: Composition, rival: Composition) {
  return draftOf(rival).order[oppositeSide(draftOf(comp).side)]
}
