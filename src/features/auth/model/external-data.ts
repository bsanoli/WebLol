// Validação do que vem do Firestore em JSON: versão oficial e envios. Dado fora do formato
// vira `null` (quem chama decide: "bad" na sincronização, envio quebrado na Administração).
import * as z from "zod/mini"
import { type Change, withOwnMatchups } from "@/shared/lib/team-changes"
import type { Official } from "./session"

const list = z.array(z.looseObject({}))

const officialShape = z.looseObject({
  version: z.number(),
  at: z.optional(z.number()),
  data: z.looseObject({
    comps: z.optional(list),
    plays: z.optional(list),
    tactics: z.optional(list),
    matchups: z.optional(list),
  }),
  log: z.optional(z.array(z.looseObject({ sid: z.string() }))),
})

const submissionShape = z.looseObject({
  id: z.string(),
  from: z.optional(z.string()),
  at: z.optional(z.number()),
  baseVersion: z.optional(z.number()),
  changes: z.array(z.looseObject({ kind: z.string(), op: z.string(), id: z.string() })),
})

function parseJson(text: unknown): unknown {
  try {
    return JSON.parse(String(text))
  } catch {
    return null
  }
}

/** Versão oficial gravada em `dados/oficial`; completa `data` e `log` que faltarem. */
export function parseOfficial(text: unknown): Official | null {
  const result = officialShape.safeParse(parseJson(text))
  if (!result.success) return null
  const value = result.data as unknown as Omit<Official, "data"> & { data: Partial<Official["data"]> }
  return {
    ...value,
    at: value.at ?? 0,
    data: withOwnMatchups(value.data),
    log: value.log ?? [],
  }
}

export type ParsedSubmission = { id: string; from: string; at: number; baseVersion: number; changes: Change[] }

/** Envio gravado em `envios/{doc}`; campos de número que faltarem viram 0. */
export function parseSubmission(text: unknown): ParsedSubmission | null {
  const result = submissionShape.safeParse(parseJson(text))
  if (!result.success) return null
  const value = result.data
  return {
    ...(value as unknown as ParsedSubmission),
    from: value.from ?? "",
    at: value.at ?? 0,
    baseVersion: value.baseVersion ?? 0,
  }
}
