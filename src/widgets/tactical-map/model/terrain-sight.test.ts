import { describe, expect, it } from "vitest"
import type { MapPoint } from "./faelights"
import { occupiedBrush, terrainSightOutline } from "./terrain-sight"

const pointsOf = (outline: string) =>
  outline
    .slice(1, -1)
    .split("L")
    .map(pair => pair.split(" ").map(Number))
const extent = (outline: string) => {
  const points = pointsOf(outline)
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys))
}

describe("terrainSightOutline", () => {
  it("traça 256 raios fechados em um único contorno", () => {
    const outline = terrainSightOutline([50, 50], "minimap", 900)
    expect(outline.startsWith("M")).toBe(true)
    expect(outline.endsWith("Z")).toBe(true)
    expect(pointsOf(outline)).toHaveLength(256)
  })

  it("fora do terreno mostra só o marcador, sem alcance", () => {
    expect(extent(terrainSightOutline([0, 0], "minimap", 900))).toBe(
      extent(terrainSightOutline([0, 0], "minimap", 100)),
    )
  })

  it("mais alcance nunca encolhe a área vista", () => {
    const samples: MapPoint[] = [
      [50, 50],
      [30, 30],
      [70, 70],
      [20, 60],
    ]
    let hasGrown = false
    for (const point of samples) {
      const near = extent(terrainSightOutline(point, "minimap", 300))
      const far = extent(terrainSightOutline(point, "minimap", 1200))
      expect(far).toBeGreaterThanOrEqual(near)
      if (far > near) hasGrown = true
    }
    expect(hasGrown).toBe(true)
  })
})

describe("occupiedBrush", () => {
  it("fora do mapa não há arbusto", () => {
    expect(occupiedBrush([0, 0], "minimap")).toBeUndefined()
  })

  it("em algum ponto do mapa há um arbusto com contorno e preenchimento", () => {
    let found: ReturnType<typeof occupiedBrush>
    for (let x = 5; x < 95 && !found; x += 2)
      for (let y = 5; y < 95 && !found; y += 2) found = occupiedBrush([x, y], "minimap")
    expect(found?.fill).toMatch(/^M/)
    expect(found?.edge).toMatch(/^M/)
    expect(found?.transform).toContain("scale(")
  })

  it("devolve o mesmo contorno em consultas repetidas", () => {
    let spot: MapPoint | undefined
    for (let x = 5; x < 95 && !spot; x += 2)
      for (let y = 5; y < 95 && !spot; y += 2) if (occupiedBrush([x, y], "realistic")) spot = [x, y]
    expect(spot).toBeDefined()
    if (spot) expect(occupiedBrush(spot, "realistic")).toBe(occupiedBrush(spot, "realistic"))
  })
})
