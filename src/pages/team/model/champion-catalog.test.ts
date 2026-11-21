import { describe, expect, it } from "vitest"
import { CH } from "./champion-catalog"

describe("catálogo de campeões", () => {
  it("tem id e nome únicos, sem campos vazios", () => {
    expect(CH.length).toBeGreaterThan(150)
    expect(new Set(CH.map(champion => champion.id)).size).toBe(CH.length)
    expect(new Set(CH.map(champion => champion.n)).size).toBe(CH.length)
    for (const champion of CH) {
      expect(champion.n).not.toBe("")
      expect(champion.id).not.toBe("")
    }
  })

  it("traduz as letras de posição e só aceita as cinco posições", () => {
    const lanes = new Set(["top", "jg", "mid", "adc", "sup"])
    for (const champion of CH) for (const lane of champion.r) expect(lanes.has(lane)).toBe(true)
    expect(CH.find(champion => champion.id === "Ahri")?.r).toEqual(["mid"])
    expect(CH.find(champion => champion.id === "Brand")?.r).toEqual(["sup", "mid", "jg"])
  })
})
