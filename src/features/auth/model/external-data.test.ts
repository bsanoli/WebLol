import { describe, expect, it } from "vitest"
import { parseOfficial, parseSubmission } from "./external-data"

describe("parseOfficial", () => {
  it("aceita a versão oficial e completa o que faltar", () => {
    const official = parseOfficial(JSON.stringify({ version: 3, data: { comps: [{ id: "a" }] } }))
    expect(official?.version).toBe(3)
    expect(official?.data).toEqual({ comps: [{ id: "a" }], plays: [], tactics: [], matchups: [] })
    expect(official?.log).toEqual([])
  })
  it("recusa JSON quebrado e formato errado", () => {
    expect(parseOfficial("{")).toBeNull()
    expect(parseOfficial(JSON.stringify({ version: "1", data: {} }))).toBeNull()
    expect(parseOfficial(JSON.stringify({ version: 1, data: { comps: "x" } }))).toBeNull()
  })
})

describe("parseSubmission", () => {
  it("aceita um envio com alterações", () => {
    const sent = parseSubmission(
      JSON.stringify({ id: "s1", from: "a#B", at: 5, changes: [{ kind: "comp", op: "add", id: "c" }] }),
    )
    expect(sent).toMatchObject({ id: "s1", from: "a#B", at: 5, baseVersion: 0 })
  })
  it("recusa envio sem lista de alterações", () => {
    expect(parseSubmission(JSON.stringify({ id: "s1" }))).toBeNull()
    expect(parseSubmission(undefined)).toBeNull()
  })
})
