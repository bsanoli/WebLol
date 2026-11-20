import { describe, expect, it } from "vitest"
import { compositionFromSaved, compositionToSaved } from "./composition-storage"
import { parseOfficialBaseline, sanitizeComposition, viewFromMode } from "./saved-data"

const read = (saved: unknown) => sanitizeComposition(compositionFromSaved(saved))

describe("bans", () => {
  const saved = {
    id: "a",
    name: "Nossa",
    lanes: { top: ["Ornn"], jg: [], mid: [], adc: [], sup: [], ban: ["Zed", "Ahri"] },
    laneNotes: {},
    notes: "",
    updated: 1,
    team: "mine",
  }

  it("lê lanes.ban como bans e tira o ban das posições", () => {
    const comp = read(structuredClone(saved))
    expect(comp?.bans).toEqual(["Zed", "Ahri"])
    expect(comp?.lanes).not.toHaveProperty("ban")
    expect(comp?.lanes.top).toEqual(["Ornn"])
  })

  it("grava de volta o mesmo JSON do formato salvo", () => {
    const comp = read(structuredClone(saved))
    expect(JSON.stringify(compositionToSaved(comp as never))).toBe(JSON.stringify(saved))
  })
})

describe("sanitizeComposition", () => {
  it("descarta o que não é composição", () => {
    for (const bad of [null, "texto", 7, [], {}, { name: "sem id" }, { id: 3 }])
      expect(sanitizeComposition(bad)).toBeNull()
  })

  it("corrige campos inválidos sem perder o resto", () => {
    const comp = sanitizeComposition({
      id: "x",
      name: 5,
      lanes: { top: "Ornn", jg: ["Vi", 3, null], mid: undefined },
      bans: "Zed",
      notes: null,
      opgg: "https://op.gg/x",
    })
    expect(comp).toMatchObject({
      id: "x",
      name: "Sem nome",
      lanes: { top: [], jg: ["Vi"], mid: [], adc: [], sup: [] },
      bans: [],
      notes: "",
      opgg: "https://op.gg/x",
    })
  })

  it("mantém só as notas de posição que são texto", () => {
    expect(sanitizeComposition({ id: "x", laneNotes: { top: "ok", jg: 1 } })?.laneNotes).toEqual({ top: "ok" })
  })

  it("não troca a posição das chaves que já existiam", () => {
    const comp = sanitizeComposition({ draft: { side: "red" }, id: "x", name: "N", lanes: { sup: ["Rell"], top: [] } })
    expect(Object.keys(comp ?? {}).slice(0, 3)).toEqual(["draft", "id", "name"])
    expect(Object.keys(comp?.lanes ?? {}).slice(0, 2)).toEqual(["sup", "top"])
  })
})

describe("parseOfficialBaseline", () => {
  it("aceita ausente, completa e recusa conteúdo inválido", () => {
    expect(parseOfficialBaseline(null)).toBeNull()
    expect(
      parseOfficialBaseline(JSON.stringify({ version: 3, data: { comps: [], plays: [], tactics: [] } })),
    ).toMatchObject({
      version: 3,
    })
    expect(parseOfficialBaseline("{")).toBeUndefined()
    expect(parseOfficialBaseline(JSON.stringify({ data: { comps: [] } }))).toBeUndefined()
    expect(parseOfficialBaseline("null")).toBeUndefined()
  })
})

describe("viewFromMode", () => {
  it("abre táticas ou a Ordem do draft", () => {
    expect(viewFromMode("taticas")).toBe("tactics")
    expect(viewFromMode("draft")).toBe("draft")
    expect(viewFromMode("lane")).toBe("draft")
    expect(viewFromMode(null)).toBeNull()
    expect(viewFromMode("")).toBeNull()
  })
})
