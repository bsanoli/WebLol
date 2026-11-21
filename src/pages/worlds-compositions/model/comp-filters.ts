import DATA from "@dataset/summary"
import { championSlug } from "@/entities/match"

export type CompGame = (typeof DATA.comps)[number]

export const compChampionLanes = new Map<string, Set<string>>()
for (const game of DATA.comps) {
  for (const [lane, blue, , , red] of game.p) {
    for (const name of [String(blue), String(red)]) {
      const lanes = compChampionLanes.get(name) ?? new Set<string>()
      compChampionLanes.set(name, lanes.add(String(lane)))
    }
  }
}

export const compChampions = new Map(
  [...compChampionLanes.keys()].sort((a, b) => a.localeCompare(b, "pt-BR")).map(name => [championSlug(name), name]),
)

export const compFilters = {
  team: "",
  query: "",
  stage: "",
  champions: new Set<string>(),
  winsOnly: false,
}

export const hasCompFilters = () =>
  Boolean(
    compFilters.query || compFilters.team || compFilters.stage || compFilters.champions.size || compFilters.winsOnly,
  )

const getStageOrder = (game: CompGame) => {
  const numbers = game.s.match(/(\d+)/g) || []
  const base = game.s.startsWith("play")
    ? 0
    : game.s.includes("quarter")
      ? 200
      : game.s.includes("semi")
        ? 300
        : game.s.includes("final")
          ? 400
          : 100
  return base + (Number(numbers[0]) || 0) * 10 + (Number(numbers[1]) || 0) / 100
}

export const sortCompGames = () => DATA.comps.slice().sort((a, b) => getStageOrder(b) - getStageOrder(a) || b.g - a.g)

export function filterCompGames(games: CompGame[], query: string, champions: string[]) {
  const { team, stage, winsOnly } = compFilters
  return games.filter(game => {
    const championColumns = winsOnly ? [game.bw ? 1 : 4] : [1, 4]
    const isTeamMatch = winsOnly ? (game.bw ? game.b : game.r) === team : game.b === team || game.r === team
    return (
      (!team || isTeamMatch) &&
      (!stage || game.st === stage) &&
      champions.every(name => game.p.some(row => championColumns.some(column => row[column] === name))) &&
      (!query ||
        game.p.some(row =>
          championColumns.some(
            column => row[column].toLowerCase().includes(query) || row[column + 1].toLowerCase().includes(query),
          ),
        ))
    )
  })
}

export function setCompositionRoute(query: string, params: URLSearchParams) {
  compFilters.query = query
  compFilters.team = params.get("time") || ""
  compFilters.winsOnly = params.get("vitorias") === "1"
  compFilters.stage = params.get("fase") || ""
  compFilters.champions = new Set((params.get("campeoes") || "").split(",").filter(slug => compChampions.has(slug)))
  if (!DATA.comps.some(game => game.b === compFilters.team || game.r === compFilters.team)) compFilters.team = ""
  if (!DATA.comps.some(game => game.st === compFilters.stage)) compFilters.stage = ""
}
