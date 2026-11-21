import type DATA from "@dataset/summary"
import { champions, opponents as opponentCounts } from "@dataset/builds"
import { championSlug } from "@/entities/match"
import { encountersFor } from "./encounters"

export type Champion = (typeof DATA.champs)[number]
export type LaneSample = Extract<Champion["lanes"][keyof Champion["lanes"]], { n: number }>
export type Frequency<T> = { value: T; count: number; percent: number }
type SampleBuild = (typeof champions.Ezreal)["all"]
export type BuildData = Omit<SampleBuild, "skillOrder" | "starterItems" | "runePage"> & {
  starterItems?: Frequency<number[]>[]
  skillOrder: Pick<SampleBuild["skillOrder"], "observedSequences"> & {
    priority: Pick<NonNullable<SampleBuild["skillOrder"]["priority"]>, "first" | "firstAndSecond"> | null
  }
}

export const buildData: Partial<Record<string, Partial<Record<string, BuildData>>>> = champions
const finalBootIds = new Set(Object.values(champions).flatMap(({ all }) => all.boots.map(entry => entry.value)))

export function championBuild(champion: Champion, lane: string) {
  return buildData[champion.name]?.[lane || "all"]
}

type MatchPlayer = { champion: string; role: string; side: string }

export function directOpponent<Player extends MatchPlayer>(players: Player[], player: Player) {
  return players.find(other => other.role === player.role && other.side !== player.side)
}

/** Adversários diretos do campeão na rota (ou em todas), do mais ao menos enfrentado. */
export function buildOpponentOptions(champion: Champion, lane: string) {
  const counts = (opponentCounts as unknown as Record<string, Record<string, [string, number][]> | undefined>)[
    champion.name
  ]?.[lane]
  return (counts ?? [])
    .map(([name, games]) => ({ name, slug: championSlug(name), games }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name, "pt-BR"))
}

function frequencies<T extends number | string>(values: T[], games: number): Frequency<T>[] {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts]
    .sort(([a, aCount], [b, bCount]) => bCount - aCount || String(a).localeCompare(String(b)))
    .map(([value, count]) => ({ value, count, percent: (count / games) * 100 }))
}

function skillPriority(sequence: string, target: number) {
  const counts = new Map<string, number>()
  const reached: string[] = []
  for (const skill of sequence) {
    if (skill === "R") continue
    const count = (counts.get(skill) ?? 0) + 1
    counts.set(skill, count)
    if (count === target) reached.push(skill)
  }
  return reached
}

const startingTrinkets = new Set([3340, 3364])

export function opponentBuild(champion: Champion, lane: string, opponent: string): BuildData | undefined {
  const players = encountersFor(champion.name, lane)
    .filter(entry => championSlug(entry.opponent) === opponent)
    .map(entry => entry.player)
  const games = players.length
  if (!games) return
  const orders = players.flatMap(player => (player.skillOrder ? [player.skillOrder] : []))
  const target = champions[champion.name as keyof typeof champions]?.all.skillOrder.priority?.pointsToMax
  const priorities = target ? orders.map(order => skillPriority(order, target)) : []
  const first = priorities.flatMap(([skill]) => (skill ? [skill] : []))
  const pairs = priorities.flatMap(([first, second]) => (second ? [first + ">" + second] : []))
  const starters = players
    .map(player =>
      (player.itemEventsByMinute as [number, number[]][])
        .filter(([minute]) => minute === 0)
        .flatMap(([, items]) => items)
        .filter(item => item > 0 && !startingTrinkets.has(item))
        .sort((a, b) => a - b)
        .join(","),
    )
    .filter(Boolean)
  const playerBoots = players.map(player => player.boots ?? player.finalItems.filter(id => finalBootIds.has(id)))
  return {
    games,
    starterItems: frequencies(starters, games).map(entry => ({ ...entry, value: entry.value.split(",").map(Number) })),
    finalItems: frequencies(
      players.flatMap(player => [...new Set(player.finalItems)]),
      games,
    ),
    boots: frequencies(
      playerBoots.flatMap(boots => [...new Set(boots)]),
      games,
    ),
    gamesWithoutFinalBoots: playerBoots.filter(boots => !boots.length).length,
    spells: frequencies(
      players.map(player => [...player.spells].sort().join("+")),
      games,
    ),
    primaryTrees: frequencies(
      players.map(player => player.primaryTree),
      games,
    ),
    secondaryTrees: frequencies(
      players.map(player => player.secondaryTree),
      games,
    ),
    primaryRunes: [0, 1, 2, 3].map(slot =>
      frequencies(
        players.map(player => player.primaryRunes[slot]),
        games,
      ),
    ),
    secondaryRunes: frequencies(
      players.flatMap(player => [...new Set(player.secondaryRunes)]),
      games,
    ),
    shards: [0, 1, 2].map(slot =>
      frequencies(
        players.map(player => player.shards[slot]),
        games,
      ),
    ),
    skillOrder: {
      observedSequences: frequencies(orders, games),
      priority: target
        ? { first: frequencies(first, first.length), firstAndSecond: frequencies(pairs, pairs.length) }
        : null,
    },
  }
}
