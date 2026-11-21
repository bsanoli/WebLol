// Conversão entre o formato salvo da composição (`lol-comps-time-v1`, backup e Firestore) e o formato do código.
// Salvo: `team: "mine" | "enemy"` (os bans já são `bans`; `lanes.ban` só é lido). O confronto e o lado da nossa comp
// ficam na lista `matchups` do time (docs/decisoes/0009-confronto-proprio.md).
// Código: `owner: "ours" | "enemy"`.
// Os nomes salvos são contrato e só mudam com migração e ADR (docs/convencoes.md).
//
// A conversão preserva a ordem das chaves e a ausência dos campos: a sincronização compara cada composição pelo JSON,
// então uma composição que o código não tocou precisa voltar byte a byte igual ao que foi lido.
import type { Composition } from "./local-state"

type PlainObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Copia o objeto trocando o nome de chaves sem mudar a posição delas. */
function renameKeys(source: PlainObject, names: Record<string, string>): PlainObject {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [names[key] ?? key, value]))
}

const OWNER_FROM_SAVED: Record<string, string> = { mine: "ours", enemy: "enemy" }
const OWNER_TO_SAVED: Record<string, string> = { ours: "mine", enemy: "enemy" }

/**
 * Lê `lanes.ban` (formato antigo) como `bans`, logo depois de `lanes` e preservando a ordem das chaves.
 * O formato salvo atual já é `bans` na raiz; `lanes.ban` só é lido, nunca mais gravado (ADR 0007).
 */
function readLegacyBans(comp: PlainObject): PlainObject {
  if (!isPlainObject(comp.lanes) || !("ban" in comp.lanes)) return comp
  const { ban, ...positions } = comp.lanes
  const entries: [string, unknown][] = []
  for (const [key, value] of Object.entries(comp)) {
    if (key === "bans") continue
    if (key === "lanes") entries.push(["lanes", positions], ["bans", ban])
    else entries.push([key, value])
  }
  return Object.fromEntries(entries)
}

function convertComposition(raw: PlainObject, direction: "read" | "write"): PlainObject {
  const isReading = direction === "read"
  const ownerKey = isReading ? "team" : "owner"
  const values = isReading ? OWNER_FROM_SAVED : OWNER_TO_SAVED

  let comp = raw
  // Valor fora do esperado fica como está, no nome salvo, e o código o trata como composição nossa.
  const owner = raw[ownerKey]
  if (typeof owner === "string" && Object.hasOwn(values, owner)) {
    comp = renameKeys(comp, { [ownerKey]: isReading ? "owner" : "team" })
    comp[isReading ? "owner" : "team"] = values[owner]
  }
  return isReading ? readLegacyBans(comp) : comp
}

/** Diz se o estado salvo ainda tem alguma composição com `lanes.ban` (formato antigo, ADR 0007). */
export const hasLegacyBans = (state: unknown) =>
  isPlainObject(state) &&
  Array.isArray(state.comps) &&
  state.comps.some(comp => isPlainObject(comp) && isPlainObject(comp.lanes) && "ban" in comp.lanes)

export const compositionFromSaved = (raw: unknown) =>
  (isPlainObject(raw) ? convertComposition(raw, "read") : raw) as Composition

export const compositionToSaved = (comp: Composition) => convertComposition(comp as unknown as PlainObject, "write")

/** Estado da Área do time no formato salvo, pronto para `JSON.stringify`. */
export function teamStateToSaved<T extends { comps: Composition[] }>(state: T) {
  return { ...state, comps: state.comps.map(compositionToSaved) }
}
