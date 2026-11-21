import { describe, expect, it } from "vitest"
import { clamp, isSide, nearestLane, progressOnLane, readWaves, waveKey, wavePosition } from "./battlefield"

describe("clamp e isSide", () => {
  it("limita ao intervalo de 0 ao máximo", () => {
    expect(clamp(-5)).toBe(0)
    expect(clamp(150)).toBe(100)
    expect(clamp(2, 1)).toBe(1)
  })

  it("aceita só os lados b e r", () => {
    expect(isSide("b")).toBe(true)
    expect(isSide("x")).toBe(false)
  })
})

describe("readWaves", () => {
  it("mantém só waves válidas e a última de cada rota e lado", () => {
    const first = { id: "1", side: "b", lane: "mid", progress: 0.2 }
    const second = { id: "2", side: "b", lane: "mid", progress: 0.8 }
    const other = { id: "3", side: "r", lane: "top", progress: 1 }
    const invalid = [
      { id: "4", side: "b", lane: "mid", progress: 2 },
      { id: "5", side: "z", lane: "mid", progress: 0 },
      {},
    ]
    expect(readWaves([first, second, other, ...invalid])).toEqual([second, other])
    expect(readWaves(null)).toEqual([])
    expect(waveKey({ lane: "mid", side: "b" })).toBe("mid:b")
  })
})

describe("posição na rota", () => {
  it("a posição de uma wave volta ao mesmo progresso na própria rota", () => {
    for (const lane of ["top", "mid", "adc"] as const) {
      const point = wavePosition({ lane, progress: 0.4 }, "minimap")
      expect(progressOnLane(lane, point, "minimap")).toBeCloseTo(0.4, 2)
      expect(nearestLane(point, "minimap").lane).toBe(lane)
    }
  })

  it("o progresso fora de 0 a 1 fica nas pontas da rota", () => {
    expect(wavePosition({ lane: "mid", progress: 5 }, "realistic")).toEqual(
      wavePosition({ lane: "mid", progress: 1 }, "realistic"),
    )
  })
})
