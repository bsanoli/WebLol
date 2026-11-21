import { describe, expect, it } from "vitest"
import {
  collectImageIds,
  docFromLegacy,
  docWithCompNotes,
  plainTextOf,
  printNode,
  readTacticDoc,
  type TacticDoc,
} from "./tactic-doc"

const text = (value: string) => ({ type: "paragraph", content: [{ type: "text", text: value }] })

describe("readTacticDoc", () => {
  it("aceita só documentos com tipo doc e conteúdo em lista", () => {
    const doc = { type: "doc", content: [] }
    expect(readTacticDoc(doc)).toBe(doc)
    expect(readTacticDoc(null)).toBeNull()
    expect(readTacticDoc({ type: "doc", content: "x" })).toBeNull()
    expect(readTacticDoc({ type: "outro", content: [] })).toBeNull()
  })
})

describe("docFromLegacy", () => {
  it("vira um parágrafo por linha e põe os prints no fim", () => {
    const doc = docFromLegacy("a\r\nb", ["img1"])
    expect(doc.content.map(node => node.type)).toEqual(["paragraph", "paragraph", "tacticPrint"])
    expect(doc.content[2]).toEqual(printNode("img1"))
  })

  it("sem texto nem prints deixa um parágrafo vazio", () => {
    expect(docFromLegacy("", []).content).toEqual([{ type: "paragraph" }])
  })
})

describe("docWithCompNotes", () => {
  const empty: TacticDoc = { type: "doc", content: [{ type: "paragraph" }] }

  it("sem anotações devolve o mesmo documento", () => {
    expect(docWithCompNotes(empty, { general: " ", draft: [{ label: "Top", text: "" }] })).toBe(empty)
  })

  it("coloca os planos no início e troca o parágrafo vazio", () => {
    const doc = docWithCompNotes(empty, { general: "Jogar de lado", draft: [{ label: "Top", text: "Banir X" }] })
    expect(doc.content.map(node => node.type)).toEqual(["heading", "paragraph", "heading", "paragraph", "paragraph"])
    expect(plainTextOf(doc)).toContain("Plano do draft · Top")
  })

  it("mantém o conteúdo existente depois dos planos", () => {
    const base: TacticDoc = { type: "doc", content: [text("já escrito")] }
    const doc = docWithCompNotes(base, { general: "Plano", draft: [] })
    expect(doc.content.at(-1)).toEqual(text("já escrito"))
  })
})

describe("plainTextOf", () => {
  it("junta parágrafos, menções e quebras sem excesso de linhas vazias", () => {
    const doc: TacticDoc = {
      type: "doc",
      content: [
        text("um"),
        { type: "paragraph" },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "mention", attrs: { label: "Ahri" } }] },
      ],
    }
    expect(plainTextOf(doc)).toBe("um\n\n@Ahri")
  })
})

describe("collectImageIds", () => {
  it("reúne print, desenho e prévia sem repetir e ignora vazios", () => {
    const doc: TacticDoc = {
      type: "doc",
      content: [
        { type: "tacticPrint", attrs: { src: "a", sketch: "b", preview: null } },
        { type: "blockquote", content: [{ type: "tacticPrint", attrs: { src: "a", sketch: "", preview: "c" } }] },
      ],
    }
    expect(collectImageIds(doc)).toEqual(["a", "b", "c"])
  })
})
