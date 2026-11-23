/** Rota, depois campeão, jogador e KDA do lado azul e do vermelho. */
export type CompLaneRow = [
  lane: string,
  blueChampion: string,
  bluePlayer: string,
  blueKda: string,
  redChampion: string,
  redPlayer: string,
  redKda: string,
]

/** Um jogo do torneio, com as linhas de rota dos dois lados. */
export type SummaryGame = {
  stage: string
  series: string
  game: number
  blue: string
  red: string
  blueWon: boolean
  lanes: CompLaneRow[]
}

/** Rota em que o campeão apareceu, sem amostra de desempenho coletada (acontece no Worlds). */
type SummaryLanePicks = { picks: number }

/** Rota com a amostra de desempenho do campeão. */
export type SummaryLaneSample = {
  picks: number
  sampleGames: number
  wins: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  players: [name: string, games: number][]
  teams: [name: string, games: number][]
}

type SummaryLane = SummaryLanePicks | SummaryLaneSample

export type SummaryChampion = {
  name: string
  main: string
  picks: number
  wins: number
  bans: number
  lanes: Record<string, SummaryLane>
}

type SummaryPlayer = {
  name: string
  team: string
  lane: string
  games: number
  wins: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  champions: [name: string, games: number][]
}

/** Linha de confronto: adversário seguido de contagens posicionais. */
type SummaryMatchupRow = [opponent: string, ...counts: number[]]

/** Origem e data da coleta (só no resumo da SoloQ). */
type SummaryMeta = { asOf?: string; regions?: string[]; pros?: number; days?: number }

/** Resumo do torneio (Worlds) ou da SoloQ: o formato único dos dois JSONs. A SoloQ não tem jogos de composição (`comps` e `players` vazios). */
export type TournamentSummary = {
  games: number
  comps: SummaryGame[]
  champs: SummaryChampion[]
  players: SummaryPlayer[]
  matchups: Record<string, Record<string, SummaryMatchupRow[] | undefined>>
  meta?: SummaryMeta
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
const isText = (value: unknown) => typeof value === "string"
const isCount = (value: unknown) => typeof value === "number" && Number.isFinite(value)
const isArrayOf = (value: unknown, isItem: (item: unknown) => boolean) => Array.isArray(value) && value.every(isItem)
const hasFields = (value: unknown, fields: Record<string, (field: unknown) => boolean>) =>
  isRecord(value) && Object.entries(fields).every(([key, isField]) => isField(value[key]))

const isLaneRow = (row: unknown) => Array.isArray(row) && row.length === 7 && row.every(isText)
const isNamedCount = (row: unknown) => Array.isArray(row) && row.length === 2 && isText(row[0]) && isCount(row[1])
const isLaneSample = (lane: unknown) =>
  hasFields(lane, {
    picks: isCount,
    sampleGames: isCount,
    wins: isCount,
    avgKills: isCount,
    avgDeaths: isCount,
    avgAssists: isCount,
    players: field => isArrayOf(field, isNamedCount),
    teams: field => isArrayOf(field, isNamedCount),
  })
const isSummaryLane = (lane: unknown) =>
  hasFields(lane, { picks: isCount }) && (!isRecord(lane) || !("sampleGames" in lane) || isLaneSample(lane))
const isSummaryGame = (game: unknown) =>
  hasFields(game, {
    stage: isText,
    series: isText,
    game: isCount,
    blue: isText,
    red: isText,
    blueWon: field => typeof field === "boolean",
    lanes: field => isArrayOf(field, isLaneRow),
  })
const isSummaryChampion = (champion: unknown) =>
  hasFields(champion, {
    name: isText,
    main: isText,
    picks: isCount,
    wins: isCount,
    bans: isCount,
    lanes: field => isRecord(field) && Object.values(field).every(isSummaryLane),
  })
const isSummaryPlayer = (player: unknown) =>
  hasFields(player, {
    name: isText,
    team: isText,
    lane: isText,
    games: isCount,
    wins: isCount,
    avgKills: isCount,
    avgDeaths: isCount,
    avgAssists: isCount,
    champions: field => isArrayOf(field, isNamedCount),
  })
const isMatchupRow = (row: unknown) => Array.isArray(row) && isText(row[0]) && row.slice(1).every(isCount)
const isMatchups = (matchups: unknown) =>
  isRecord(matchups) &&
  Object.values(matchups).every(
    lane => isRecord(lane) && Object.values(lane).every(rows => isArrayOf(rows, isMatchupRow)),
  )

const optional = (isValid: (field: unknown) => boolean) => (field: unknown) => field === undefined || isValid(field)
const isMeta = optional(field =>
  hasFields(field, {
    asOf: optional(isText),
    regions: optional(value => isArrayOf(value, isText)),
    pros: optional(isCount),
    days: optional(isCount),
  }),
)

/** Confere o JSON de resumo e devolve o tipo canônico; falha com o campo que não bate. */
export function parseTournamentSummary(raw: unknown): TournamentSummary {
  const checks: Record<string, (field: unknown) => boolean> = {
    games: isCount,
    comps: field => isArrayOf(field, isSummaryGame),
    champs: field => isArrayOf(field, isSummaryChampion),
    players: field => isArrayOf(field, isSummaryPlayer),
    matchups: isMatchups,
    meta: isMeta,
  }
  if (!isRecord(raw)) throw new Error("Resumo do torneio inválido: esperado um objeto")
  for (const [key, test] of Object.entries(checks)) {
    if (!test(raw[key])) throw new Error(`Resumo do torneio inválido: campo "${key}" fora do formato`)
  }
  return raw as TournamentSummary
}
