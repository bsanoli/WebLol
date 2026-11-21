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
}

export const oursOf = <T extends Composition>(comps: T[]) => comps.filter(comp => !isEnemy(comp))
export const enemiesOf = <T extends Composition>(comps: T[]) => comps.filter(isEnemy)

export const oppositeSide = (side: DraftSide): DraftSide => (side === "blue" ? "red" : "blue")

/** Ordem das posições nos picks da comp adversária, do lado oposto ao da nossa no confronto. */
export function enemyOrder(enemy: Composition, oursSide: DraftSide) {
  return draftOf(enemy).order[oppositeSide(oursSide)]
}
