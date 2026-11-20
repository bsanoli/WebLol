// Validação dos dados que entram na Área do time: composição salva, versão oficial e parâmetro `modo` da URL.
// Decisão em docs/decisoes/0005-bans-e-validacao-de-dados.md. Dado inválido é corrigido ou descartado, nunca lançado.
import * as z from "zod/mini"
import type { Composition } from "./local-state"

/** Lista de nomes de campeões: ignora o que não é texto e vira lista vazia se não for lista. */
const toChampionList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(item => typeof item === "string") : []

/** Lista de nomes de campeões: ignora o que não é texto e vira lista vazia se não for lista. */
const championList = z.pipe(z.unknown(), z.transform(toChampionList))

/** Notas por posição: mantém só os valores que são texto. */
const toTextRecord = (value: unknown): Record<string, string> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([, note]) => typeof note === "string") as [string, string][])
    : {}

const POSITIONS = ["top", "jg", "mid", "adc", "sup"] as const

/** As cinco posições, cada uma com lista de nomes; o que faltar ou estiver errado vira lista vazia. */
const lanesShape = z.pipe(
  z.unknown(),
  z.transform(value => {
    const lanes = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
    return Object.fromEntries(POSITIONS.map(position => [position, toChampionList(lanes[position])]))
  }),
)

const compositionShape = z.looseObject({
  id: z.string(),
  name: z.catch(z.string(), "Sem nome"),
  lanes: lanesShape,
  bans: championList,
  laneNotes: z.pipe(z.unknown(), z.transform(toTextRecord)),
  notes: z.catch(z.string(), ""),
  updated: z.catch(z.number(), () => Date.now()),
})

/**
 * Confere uma composição já no formato do código (`bans`, `owner`...). Devolve `null` se não for um objeto com `id`.
 * Preenche o que o código exige e mantém os campos que o schema não conhece, na ordem em que estavam.
 */
export function sanitizeComposition(raw: unknown): Composition | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null
  // Campos ausentes entram com o valor vazio; os que já existem seguem na posição de origem.
  const result = compositionShape.safeParse({
    name: undefined,
    lanes: undefined,
    bans: undefined,
    laneNotes: undefined,
    notes: undefined,
    updated: undefined,
    ...raw,
  })
  if (!result.success) return null
  const comp = raw as Record<string, unknown>
  const { lanes, ...known } = result.data
  const rawLanes = comp.lanes
  comp.lanes =
    typeof rawLanes === "object" && rawLanes !== null && !Array.isArray(rawLanes)
      ? Object.assign(rawLanes, lanes)
      : lanes
  Object.assign(comp, known)
  return comp as unknown as Composition
}

const officialBaselineShape = z.looseObject({
  version: z.optional(z.unknown()),
  data: z.looseObject({ comps: z.array(z.unknown()), plays: z.array(z.unknown()) }),
})

/** Versão oficial do time guardada no navegador. `null` para ausente; `undefined` quando o conteúdo não presta. */
export function parseOfficialBaseline(raw: string | null) {
  if (raw === null) return null
  try {
    const result = officialBaselineShape.safeParse(JSON.parse(raw))
    return result.success ? result.data : undefined
  } catch {
    return undefined
  }
}

const draftModeShape = z.enum(["draft", "taticas"])

/** Aba pedida pelo parâmetro `modo` da URL. Valor antigo ou desconhecido (como `lane`) abre a Ordem do draft. */
export function viewFromMode(mode: string | null | undefined): "draft" | "tactics" | null {
  if (!mode) return null
  const result = draftModeShape.safeParse(mode)
  return result.success && result.data === "taticas" ? "tactics" : "draft"
}
