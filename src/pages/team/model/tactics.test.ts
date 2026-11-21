import { describe, expect, it } from "vitest"
import { blank } from "./local-state"
import {
  clearCompNotes,
  ensureTactics,
  hasTactic,
  normalizeOpggLink,
  opggOf,
  readTacticDocument,
  setOpgg,
  writeTactic,
  writeTacticDocument,
} from "./tactics"

describe("ensureTactics", () => {
  it("cria a lista quando falta e descarta itens inválidos", () => {
    const empty: { tactics?: unknown } = {}
    expect(ensureTactics(empty)).toEqual([])
    const state = { tactics: [{ id: "a", text: "x" }, null, { id: 3, text: "y" }, { id: "b" }] }
    expect(ensureTactics(state).map(item => item.id)).toEqual(["a"])
  })
})

describe("writeTactic", () => {
  it("cria, atualiza e remove a tática quando fica sem texto e sem prints", () => {
    const state: { tactics?: unknown } = {}
    writeTactic(state, null, "", "Jogar cedo", 1)
    writeTactic(state, "c1", "Luta", "Segurar o dragão", 2, ["img"])
    expect(ensureTactics(state).map(item => item.name)).toEqual(["Táticas gerais", "Táticas · Luta"])
    writeTactic(state, "c1", "Luta", "Novo texto", 3)
    expect(ensureTactics(state)[1]).toMatchObject({ text: "Novo texto", images: ["img"], updated: 3 })
    writeTactic(state, "c1", "Luta", "  ", 4, [])
    expect(ensureTactics(state).map(item => item.id)).toEqual(["geral"])
  })
})

describe("hasTactic e documento", () => {
  it("uma comp com anotações antigas conta como tática e entra no documento na leitura", () => {
    const comp = blank("Luta")
    comp.notes = "Plano antigo"
    const state = { tactics: [], comps: [comp] }
    expect(hasTactic(state, comp.id)).toBe(true)
    expect(hasTactic(state, null)).toBe(false)
    const doc = readTacticDocument(state, comp.id)
    expect(JSON.stringify(doc)).toContain("Plano antigo")
    expect(state.tactics).toEqual([])
  })

  it("clearCompNotes limpa as anotações antigas só uma vez", () => {
    const comp = blank("Luta")
    comp.notes = "Plano"
    expect(clearCompNotes(comp)).toBe(true)
    expect(comp.notes).toBe("")
    expect(clearCompNotes(comp)).toBe(false)
  })

  it("writeTacticDocument guarda o documento, o texto puro e os ids dos prints", () => {
    const state: { tactics?: unknown } = {}
    const doc = {
      type: "doc" as const,
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Olhar o rio" }] },
        { type: "tacticPrint", attrs: { src: "p1" } },
      ],
    }
    writeTacticDocument(state, null, "", doc, 5)
    const [saved] = ensureTactics(state)
    expect(saved).toMatchObject({ text: "Olhar o rio", images: ["p1"], doc })
    expect(readTacticDocument(state, null)).toEqual(doc)
  })
})

describe("OP.GG", () => {
  it("normaliza o link: sem protocolo vira https, vazio apaga e outros protocolos são recusados", () => {
    expect(normalizeOpggLink("op.gg/team")).toBe("https://op.gg/team")
    expect(normalizeOpggLink("  ")).toBe("")
    expect(normalizeOpggLink("javascript:alert(1)")).toBeNull()
    expect(normalizeOpggLink("http://")).toBeNull()
  })

  it("setOpgg grava ou apaga o campo", () => {
    const comp = blank()
    setOpgg(comp, "https://op.gg")
    expect(opggOf(comp)).toBe("https://op.gg")
    setOpgg(comp, "")
    expect(opggOf(comp)).toBe("")
    expect("opgg" in comp).toBe(false)
  })
})
