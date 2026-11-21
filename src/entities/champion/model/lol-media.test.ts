import { describe, expect, it } from "vitest"
import { LOL_DATA, lolAsset, lolChampion, lolImage, lolKey } from "./lol-media"

describe("lolKey", () => {
  it("tira acentos de pontuação, espaços e maiúsculas", () => {
    expect(lolKey("Kai'Sa")).toBe("kaisa")
    expect(lolKey("Dr. Mundo")).toBe("drmundo")
  })
})

describe("lolChampion", () => {
  it("acha o campeão pelo id ou pelo nome, sem diferenciar a escrita", () => {
    const [id, champion] = Object.entries(LOL_DATA.champions)[0]
    expect(lolChampion(id)).toBe(champion)
    expect(lolChampion(champion.name.toUpperCase())).toBe(champion)
  })

  it("devolve vazio para nomes que não existem", () => {
    expect(lolChampion("Campeão Inventado")).toBeUndefined()
  })
})

describe("lolImage", () => {
  it("monta a imagem decorativa com o caminho dentro de assets/", () => {
    expect(lolAsset("a/b.png")).toBe("assets/a/b.png")
    const html = lolImage("a/b.png", "ico")
    expect(html).toContain('src="assets/a/b.png"')
    expect(html).toContain('class="ico"')
    expect(html).toContain('alt=""')
  })

  it("sem caminho não gera imagem", () => {
    expect(lolImage(undefined)).toBe("")
  })
})
