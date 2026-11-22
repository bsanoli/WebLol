import { uid, type Composition, type DraftSide } from "./local-state"
import { isEnemy } from "./composition-side"
// Confronto: item próprio do time (lista `matchups` na raiz do estado), com id, nome opcional, uma comp nossa,
// uma adversária e o lado da nossa no draft. Cada confronto tem tática própria (`mx-<id>`).
// Decisão em docs/decisoes/0009-confronto-proprio.md.

export type Matchup = {
  id: string
  name?: string
  ours?: string
  enemy?: string
  side: DraftSide
  updated: number
}
/** Confronto com as comps resolvidas; um lado fica `null` quando a comp foi excluída ou ainda não foi escolhida. */
export type MatchupEntry = { matchup: Matchup; ours: Composition | null; enemy: Composition | null }

/** Chave da tática do confronto no armazenamento de táticas. */
export const matchupKey = (id: string) => `mx-${id}`
export const isMatchupKey = (key: string | null): key is string => !!key && key.startsWith("mx-")

export const oppositeSideOf = (side: DraftSide): DraftSide => (side === "blue" ? "red" : "blue")

/** Título do confronto: o nome dado ou, sem nome, "Nossa x Adversária". */
export function matchupTitle(entry: Pick<MatchupEntry, "matchup" | "ours" | "enemy">) {
  const name = entry.matchup.name?.trim()
  if (name) return name
  return `${entry.ours?.name ?? "Sem comp nossa"} x ${entry.enemy?.name ?? "Sem adversária"}`
}

/** Só confrontos bem formados; o que vem do armazenamento pode estar incompleto. */
export function sanitizeMatchups(raw: unknown): Matchup[] {
  if (!Array.isArray(raw)) return []
  const list: Matchup[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== "object" || item === null || typeof item.id !== "string" || !item.id || seen.has(item.id))
      continue
    seen.add(item.id)
    const matchup: Matchup = {
      id: item.id,
      side: item.side === "red" ? "red" : "blue",
      updated: Number(item.updated) || 0,
    }
    if (typeof item.name === "string" && item.name.trim()) matchup.name = item.name
    if (typeof item.ours === "string" && item.ours) matchup.ours = item.ours
    if (typeof item.enemy === "string" && item.enemy) matchup.enemy = item.enemy
    list.push(matchup)
  }
  return list
}

function matchupEntry(comps: Composition[], matchup: Matchup): MatchupEntry {
  const byId = (id?: string) => comps.find(comp => comp.id === id) ?? null
  const ours = byId(matchup.ours),
    enemy = byId(matchup.enemy)
  return { matchup, ours: ours && !isEnemy(ours) ? ours : null, enemy: enemy && isEnemy(enemy) ? enemy : null }
}

/** Todos os confrontos, na ordem da lista (inclui os que perderam uma das comps). */
export const allMatchups = (comps: Composition[], matchups: Matchup[]): MatchupEntry[] =>
  matchups.map(matchup => matchupEntry(comps, matchup))

export const findMatchup = (comps: Composition[], matchups: Matchup[], id: string | null | undefined) => {
  const matchup = id ? matchups.find(item => item.id === id) : undefined
  return matchup ? matchupEntry(comps, matchup) : null
}

/** Cria um confronto (pares repetidos são permitidos) e o acrescenta à lista. */
export function addMatchup(
  matchups: Matchup[],
  init: { ours?: string; enemy?: string; side?: DraftSide; name?: string } = {},
  now = Date.now(),
): Matchup {
  const created: Matchup = { id: uid(), side: init.side ?? "blue", updated: now }
  if (init.name?.trim()) created.name = init.name.trim()
  if (init.ours) created.ours = init.ours
  if (init.enemy) created.enemy = init.enemy
  matchups.push(created)
  return created
}

export function removeMatchup(matchups: Matchup[], id: string) {
  const index = matchups.findIndex(item => item.id === id)
  if (index >= 0) matchups.splice(index, 1)
}

/** Confrontos que usam a comp, do mais recente para o mais antigo. */
export const matchupsOfComp = (matchups: Matchup[], compId: string) =>
  matchups.filter(item => item.ours === compId || item.enemy === compId).sort((a, b) => b.updated - a.updated)

/** Tira dos confrontos as comps que não existem mais (o confronto fica com aquele lado vazio). */
export function detachMissingComps(matchups: Matchup[], comps: Composition[]): Matchup[] {
  const alive = new Set(comps.map(comp => comp.id))
  const changed: Matchup[] = []
  for (const item of matchups) {
    let hasTouched = false
    if (item.ours && !alive.has(item.ours)) {
      delete item.ours
      hasTouched = true
    }
    if (item.enemy && !alive.has(item.enemy)) {
      delete item.enemy
      hasTouched = true
    }
    if (hasTouched) changed.push(item)
  }
  return changed
}

/** Troca os lados do confronto (a nossa passa para o lado da adversária). */
export function swapMatchupSides(matchup: Matchup, now = Date.now()) {
  matchup.side = oppositeSideOf(matchup.side)
  matchup.updated = now
}

/** Confronto atualizado ao soltar uma comp num lado do quadro, e se os lados se inverteram. */
export type CompDrop = { matchup: Matchup; created: boolean; swapped: boolean }

/**
 * O que acontece ao soltar uma comp num lado do quadro da gaveta de Táticas.
 * A comp solta ocupa esse lado no confronto aberto (ou num confronto novo, se não houver). Se a nossa for solta no
 * lado em que estava a adversária, os lados se invertem. Devolve `null` para uma comp que não existe.
 */
export function resolveCompDrop(
  comps: Composition[],
  matchups: Matchup[],
  openMatchupId: string | null,
  droppedId: string,
  side: DraftSide,
): CompDrop | null {
  const dropped = comps.find(comp => comp.id === droppedId)
  if (!dropped) return null
  const oursSide = isEnemy(dropped) ? oppositeSideOf(side) : side
  const found = openMatchupId ? matchups.find(item => item.id === openMatchupId) : undefined
  const matchup = found ?? addMatchup(matchups, { side: oursSide })
  const before = matchup.side
  if (isEnemy(dropped)) matchup.enemy = dropped.id
  else matchup.ours = dropped.id
  matchup.side = oursSide
  matchup.updated = Date.now()
  const hasPartner = isEnemy(dropped) ? !!matchup.ours : !!matchup.enemy
  return { matchup, created: !found, swapped: !!found && hasPartner && before !== oursSide }
}
