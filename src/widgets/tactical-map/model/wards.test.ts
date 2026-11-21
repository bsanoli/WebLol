import { describe, expect, it } from "vitest"
import { faelights } from "./faelights"
import { addWard, getWardType, placeWard, readWards, wardOnMap, wardTypes, type WardScene } from "./wards"

const scene: WardScene = { style: "minimap", additionalFaelights: false }

describe("getWardType", () => {
  it("usa a Sentinela Invisível quando o tipo é desconhecido", () => {
    expect(getWardType("nao-existe")).toBe(wardTypes[0])
    expect(getWardType("farsight").sight).toBe(500)
  })
})

describe("readWards", () => {
  it("descarta o que não é uma lista de pontos dentro do mapa", () => {
    expect(readWards("x")).toEqual([])
    const valid = { point: [10, 20] }
    expect(readWards([valid, { point: [101, 5] }, { point: [1] }, { point: ["a", "b"] }, null])).toEqual([valid])
  })
})

describe("wardOnMap", () => {
  it("sem Lume usa o ponto salvo e o alcance base", () => {
    const placed = wardOnMap({ point: [30, 40], type: "control", side: "b" }, scene)
    expect(placed).toMatchObject({ point: [30, 40], sight: 900, side: "b" })
    expect(placed.faelight).toBeUndefined()
  })

  it("ward em Lume ganha 25% de alcance e fica no ponto do Lume", () => {
    const spot = faelights.find(item => !item.additional)
    if (!spot) throw new Error("sem Lume base")
    const placed = wardOnMap({ point: [0, 0], faelightId: spot.id }, scene)
    expect(placed.point).toEqual(spot.minimap)
    expect(placed.sight).toBe(900 * 1.25)
  })

  it("ignora o lado inválido", () => {
    expect(wardOnMap({ point: [1, 1], side: "x" as never }, scene).side).toBeUndefined()
  })
})

describe("placeWard e addWard", () => {
  it("soltar longe de um Lume mantém o ponto livre", () => {
    const placed = placeWard({ point: [0, 0], faelightId: "x" }, [0.5, 0.5], scene)
    expect(placed.faelightId).toBeUndefined()
    expect(placed.point).toEqual([0.5, 0.5])
  })

  it("adiciona sem alterar a lista original", () => {
    const list = [{ point: [1, 2] as [number, number] }]
    const next = addWard(list, [50, 50], scene, "stealth")
    expect(next).toHaveLength(2)
    expect(list).toHaveLength(1)
  })
})
