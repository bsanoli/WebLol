import { afterEach, describe, expect, it, vi } from "vitest"
import {
  blank,
  championsOf,
  compositionPreview,
  draftOf,
  loadTeamState,
  setChampions,
  storedStateHasLegacyBans,
  KEY,
} from "./local-state"

function stubStorage(value?: string) {
  const store = new Map<string, string>(value === undefined ? [] : [[KEY, value]])
  vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null })
}

afterEach(() => vi.unstubAllGlobals())

describe("draftOf", () => {
  it("completa o draft que falta com planos vazios e a ordem padrão", () => {
    const comp = blank()
    const draft = draftOf(comp)
    expect(draft.note).toEqual({ blue: "", red: "" })
    expect(draft.order.blue).toEqual(["mid", "jg", "sup", "adc", "top"])
  })

  it("mantém a ordem salva, tira lanes inválidas e completa o resto sem repetir", () => {
    const comp = blank()
    comp.draft = {
      order: { blue: ["top", "x" as never, "top"], red: [] },
      note: { blue: "", red: "" },
    }
    const draft = draftOf(comp)
    expect(draft.order.blue).toEqual(["top", "mid", "jg", "sup", "adc"])
    expect("side" in draft).toBe(false)
  })
})

describe("campeões da composição", () => {
  it("lê e grava por posição, com os bans em lista própria", () => {
    const comp = blank()
    setChampions(comp, "mid", ["Ahri"])
    setChampions(comp, "ban", ["Zed"])
    expect(championsOf(comp, "mid")).toEqual(["Ahri"])
    expect(championsOf(comp, "ban")).toEqual(["Zed"])
    expect(comp.bans).toEqual(["Zed"])
  })

  it("a prévia tem uma posição fixa por lane e deixa vazia a que não tem campeão", () => {
    const comp = blank()
    setChampions(comp, "top", ["Ornn", "Sion"])
    setChampions(comp, "sup", ["Braum"])
    expect(compositionPreview(comp)).toEqual(["Ornn", "", "", "", "Braum"])
  })
})

describe("loadTeamState", () => {
  it("sem nada salvo mostra a comp de exemplo", () => {
    stubStorage()
    const state = loadTeamState()
    expect(state.comps).toHaveLength(1)
    expect(state.comps[0].name).toMatch(/exemplo/i)
    expect(state.cur).toBe(state.comps[0].id)
  })

  it("com dado ilegível também cai na comp de exemplo", () => {
    stubStorage("{não é json")
    expect(loadTeamState().comps).toHaveLength(1)
  })

  it("lista vazia ganha uma comp nova e o cur inválido volta à primeira", () => {
    stubStorage(JSON.stringify({ comps: [], cur: "x" }))
    const empty = loadTeamState()
    expect(empty.comps).toHaveLength(1)
    expect(empty.cur).toBe(empty.comps[0].id)

    const comp = blank("Minha")
    stubStorage(JSON.stringify({ comps: [comp], cur: "nao-existe" }))
    const state = loadTeamState()
    expect(state.cur).toBe(comp.id)
  })
})

describe("storedStateHasLegacyBans", () => {
  it("é falso sem dado salvo ou com dado ilegível", () => {
    stubStorage()
    expect(storedStateHasLegacyBans()).toBe(false)
    stubStorage("{x")
    expect(storedStateHasLegacyBans()).toBe(false)
  })
})
