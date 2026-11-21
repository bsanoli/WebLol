// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { effectText } from "./effect-text"

describe("effectText", () => {
  it("separa parágrafos e quebra as linhas dentro de cada um", () => {
    const body = effectText("Primeira linha\nSegunda linha\n\nOutro parágrafo", undefined)
    expect(body.className).toBe("game-tip-description")
    const paragraphs = body.querySelectorAll("p")
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].querySelectorAll("br")).toHaveLength(1)
    expect(paragraphs[1].textContent).toBe("Outro parágrafo")
  })

  it("marca o título de um efeito ativo e tira esse título do texto", () => {
    const body = effectText("Disparo\nCausa dano.", { Disparo: "active" })
    const heading = body.querySelector(".effect-heading")
    expect(heading?.querySelector("b")?.textContent).toBe("Disparo")
    expect(heading?.querySelector("small")?.textContent).toBe("Ativo")
    expect(body.querySelector("p")?.textContent).toBe("Causa dano.")
  })

  it("reconhece o título quando há complemento entre parênteses e trata o resto como passiva", () => {
    const body = effectText("Vigor (3s)\nDá escudo.", { Vigor: "passive" })
    expect(body.querySelector(".effect-heading small")?.textContent).toBe("Passiva")
    expect(body.querySelector(".effect-heading b")?.textContent).toBe("Vigor (3s)")
  })

  it("sem efeitos conhecidos não cria título", () => {
    expect(effectText("Texto solto", {}).querySelector(".effect-heading")).toBeNull()
  })
})
