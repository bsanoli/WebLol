import { describe, expect, it } from "vitest"
import { faelights } from "./faelights"

describe("faelights", () => {
  it("tem 8 Lumes base e 4 adicionais, com ids únicos", () => {
    expect(faelights).toHaveLength(12)
    expect(faelights.filter(item => item.additional)).toHaveLength(4)
    expect(new Set(faelights.map(item => item.id)).size).toBe(12)
  })

  it("mantém posições e contornos dentro do mapa (0 a 100)", () => {
    for (const item of faelights) {
      for (const value of [...item.minimap, ...item.realistic]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
      expect(item.bonusPath).toMatch(/^M[\d. L-]+Z$/)
      const numbers = item.bonusPath.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
      expect(numbers.length % 2).toBe(0)
      for (const value of numbers) expect(value).toBeLessThanOrEqual(100)
    }
  })
})
