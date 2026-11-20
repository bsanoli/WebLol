// Conversão entre o formato salvo da composição (`lol-comps-time-v1`, backup e Firestore) e o formato do código.
// Salvo: `team: "mine" | "enemy"` e `draft.rival`. Código: `owner: "ours" | "enemy"` e `draft.enemyId`.
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

function convertComposition(raw: PlainObject, direction: "read" | "write"): PlainObject {
  const isReading = direction === "read"
  const ownerKey = isReading ? "team" : "owner"
  const enemyKey = isReading ? "rival" : "enemyId"
  const values = isReading ? OWNER_FROM_SAVED : OWNER_TO_SAVED

  let comp = raw
  // Valor fora do esperado fica como está, no nome salvo, e o código o trata como composição nossa.
  const owner = raw[ownerKey]
  if (typeof owner === "string" && Object.hasOwn(values, owner)) {
    comp = renameKeys(comp, { [ownerKey]: isReading ? "owner" : "team" })
    comp[isReading ? "owner" : "team"] = values[owner]
  }
  if (isPlainObject(raw.draft) && enemyKey in raw.draft) {
    comp = { ...comp, draft: renameKeys(raw.draft, { [enemyKey]: isReading ? "enemyId" : "rival" }) }
  }
  return comp
}

export const compositionFromSaved = (raw: unknown) =>
  (isPlainObject(raw) ? convertComposition(raw, "read") : raw) as Composition

export const compositionToSaved = (comp: Composition) => convertComposition(comp as unknown as PlainObject, "write")

/** Estado da Área do time no formato salvo, pronto para `JSON.stringify`. */
export function teamStateToSaved<T extends { comps: Composition[] }>(state: T) {
  return { ...state, comps: state.comps.map(compositionToSaved) }
}
