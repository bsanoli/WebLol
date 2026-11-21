import { draftOf, type Composition, type DraftSide } from "./local-state"

// Dono de cada composição: nossa ou adversária. Comps antigas não têm `owner`;
// as antigas "táticas salvas" guardavam o lado em `tacticTeam` (formato salvo, `"mine" | "enemy"`).
export type CompOwner = "ours" | "enemy"

type LegacyComposition = Composition & { tactic?: boolean; tacticViews?: unknown; tacticTeam?: "mine" | "enemy" }

export function ownerOf(comp: Composition): CompOwner {
  if (comp.owner === "enemy" || comp.owner === "ours") return comp.owner
  return (comp as LegacyComposition).tacticTeam === "enemy" ? "enemy" : "ours"
}

export const isEnemy = (comp: Composition) => ownerOf(comp) === "enemy"

/** Grava o dono no formato atual e tira as marcas das antigas táticas salvas. */
export function settleOwner(comp: Composition, owner: CompOwner = ownerOf(comp)) {
  const legacy = comp as LegacyComposition
  comp.owner = owner
  delete legacy.tactic
  delete legacy.tacticViews
  delete legacy.tacticTeam
  if (owner === "enemy" && comp.draft?.enemyId) delete comp.draft.enemyId
}

export const oursOf = <T extends Composition>(comps: T[]) => comps.filter(comp => !isEnemy(comp))
export const enemiesOf = <T extends Composition>(comps: T[]) => comps.filter(isEnemy)

/** Comp adversária colocada do outro lado do draft, se ainda existir. */
export function enemyCompositionOf<T extends Composition>(comp: T, comps: T[]): T | null {
  const id = comp.draft?.enemyId
  if (!id || isEnemy(comp)) return null
  return comps.find(item => item.id === id && isEnemy(item)) ?? null
}

/** Título para listas: a comp nossa que já tem adversária aparece como "Nome x Adversária". */
export function compTitle<T extends Composition>(comp: T, comps: T[]) {
  const enemy = enemyCompositionOf(comp, comps)
  return enemy ? `${comp.name} x ${enemy.name}` : comp.name
}

export function setEnemyId(comp: Composition, enemyId: string | null) {
  const draft = draftOf(comp)
  if (enemyId) draft.enemyId = enemyId
  else delete draft.enemyId
}

export const oppositeSide = (side: DraftSide): DraftSide => (side === "blue" ? "red" : "blue")

/** Ordem das posições nos picks da comp adversária, do lado oposto ao nosso. */
export function enemyOrder(comp: Composition, enemy: Composition) {
  return draftOf(enemy).order[oppositeSide(draftOf(comp).side)]
}

/**
 * Lado em que a comp aparece no quadro. A nossa fica no lado salvo nela; a adversária que uma comp nossa enfrenta
 * fica do lado oposto ao dessa comp (a aberta, se for ela); sem quem a enfrente, vale o lado salvo na adversária.
 */
export function boardSideOf<T extends Composition>(comp: T, comps: T[], currentId?: string | null): DraftSide {
  if (!isEnemy(comp)) return draftOf(comp).side
  const facing = comps.filter(item => enemyCompositionOf(item, comps) === comp)
  const ours = facing.find(item => item.id === currentId) ?? facing[0]
  return ours ? oppositeSide(draftOf(ours).side) : draftOf(comp).side
}
