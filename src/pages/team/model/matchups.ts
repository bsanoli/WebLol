import { uid, type Composition } from "./local-state"
import { isEnemy } from "./composition-side"
// Confronto: uma comp nossa contra uma adversária, com tática própria.
// Fica dentro da comp nossa (`matchups`), para seguir a sincronização das comps.

export type Matchup = { id: string; enemy: string; updated: number }
export type MatchupEntry = { ours: Composition; enemy: Composition; matchup: Matchup }

/** Chave da tática do confronto no armazenamento de táticas. */
export const matchupKey = (id: string) => `mx-${id}`
export const isMatchupKey = (key: string | null): key is string => !!key && key.startsWith("mx-")

export const matchupTitle = (ours: Composition, enemy: Composition) => `${ours.name} x ${enemy.name}`

export function matchupsOf(comp: Composition): Matchup[] {
  if (!Array.isArray(comp.matchups)) return []
  return comp.matchups.filter(item => !!item && typeof item.id === "string" && typeof item.enemy === "string")
}

/** Cria o confronto; se o par já existir, devolve o existente. */
export function addMatchup(comp: Composition, enemyId: string, now = Date.now()): Matchup {
  const found = matchupsOf(comp).find(item => item.enemy === enemyId)
  if (found) return found
  const created: Matchup = { id: uid(), enemy: enemyId, updated: now }
  comp.matchups = [...matchupsOf(comp), created]
  return created
}

export function removeMatchup(comp: Composition, id: string) {
  comp.matchups = matchupsOf(comp).filter(item => item.id !== id)
  if (!comp.matchups.length) delete comp.matchups
}

/** Confrontos válidos (nossa e adversária existentes), na ordem das comps. */
export function allMatchups(comps: Composition[]): MatchupEntry[] {
  const byId = new Map(comps.map(comp => [comp.id, comp]))
  const list: MatchupEntry[] = []
  for (const ours of comps) {
    if (isEnemy(ours)) continue
    for (const matchup of matchupsOf(ours)) {
      const enemy = byId.get(matchup.enemy)
      if (enemy && isEnemy(enemy)) list.push({ ours, enemy, matchup })
    }
  }
  return list
}

export const findMatchup = (comps: Composition[], id: string | null | undefined) =>
  id ? (allMatchups(comps).find(entry => entry.matchup.id === id) ?? null) : null

/** Remove confrontos cujo par não existe mais e devolve os ids removidos (para apagar as táticas). */
export function pruneMatchups(comps: Composition[]): string[] {
  const alive = new Set(allMatchups(comps).map(entry => entry.matchup.id))
  const dropped: string[] = []
  for (const comp of comps) {
    const all = matchupsOf(comp)
    if (all.length === (comp.matchups?.length ?? 0) && all.every(item => alive.has(item.id))) continue
    for (const item of all) if (!alive.has(item.id)) dropped.push(item.id)
    comp.matchups = all.filter(item => alive.has(item.id))
    if (!comp.matchups.length) delete comp.matchups
  }
  return dropped
}

/** Uma adversária já colocada no draft vira confronto. Devolve true se algo mudou. */
export function adoptEnemies(comps: Composition[]): boolean {
  let changed = false
  const enemies = new Set(comps.filter(isEnemy).map(comp => comp.id))
  for (const ours of comps) {
    const rival = ours.draft?.enemyId
    if (isEnemy(ours) || !rival || !enemies.has(rival)) continue
    if (!matchupsOf(ours).some(item => item.enemy === rival)) {
      addMatchup(ours, rival)
      changed = true
    }
  }
  return changed
}

export type DraftSideKey = "blue" | "red"
/** `place`: comp que muda de lado no draft. `matchup`: par a abrir. `open`: comp a abrir quando falta o par. */
export type CompDrop = {
  place: { id: string; side: DraftSideKey }
  matchup: { ours: string; enemy: string } | null
  open: string
}

/**
 * O que acontece ao soltar uma comp num lado do quadro da gaveta de Táticas.
 * A comp solta fica nesse lado; a comp do time oposto, aberta (ou do confronto aberto), vira o par dela.
 */
export function resolveCompDrop(
  comps: Composition[],
  openId: string | null,
  openMatchupId: string | null,
  droppedId: string,
  side: DraftSideKey,
): CompDrop | null {
  const dropped = comps.find(comp => comp.id === droppedId)
  if (!dropped) return null
  const matchup = findMatchup(comps, openMatchupId)
  const open = matchup ? [matchup.ours, matchup.enemy] : comps.filter(comp => comp.id === openId)
  const partner = open.find(comp => comp.id !== dropped.id && isEnemy(comp) !== isEnemy(dropped)) ?? null
  if (!partner) return { place: { id: dropped.id, side }, matchup: null, open: dropped.id }
  const ours = isEnemy(dropped) ? partner : dropped,
    enemy = isEnemy(dropped) ? dropped : partner
  // O lado do confronto fica guardado na comp nossa; a adversária fica no lado oposto.
  const oursSide: DraftSideKey = isEnemy(dropped) ? (side === "blue" ? "red" : "blue") : side
  return { place: { id: ours.id, side: oursSide }, matchup: { ours: ours.id, enemy: enemy.id }, open: ours.id }
}
