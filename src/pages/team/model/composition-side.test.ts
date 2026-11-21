import { describe, expect, it } from "vitest"
import { enemiesOf, isEnemy, oppositeSide, oursOf, enemyOrder, settleOwner, ownerOf } from "./composition-side"
import { blank, type Composition } from "./local-state"

function comp(name: string, extra: Partial<Composition> & Record<string, unknown> = {}): Composition {
  return Object.assign(blank(name), { id: name.toLowerCase().replace(/\s+/g, "-") }, extra)
}

describe("ownerOf", () => {
  it("usa o campo `owner` quando existe", () => {
    expect(ownerOf(comp("A", { owner: "enemy" }))).toBe("enemy")
    expect(ownerOf(comp("B", { owner: "ours" }))).toBe("ours")
  })

  it("lê o lado das antigas táticas salvas em `tacticTeam`", () => {
    expect(ownerOf(comp("A", { tacticTeam: "enemy" }))).toBe("enemy")
  })

  it("trata comp antiga sem lado como nossa", () => {
    expect(ownerOf(comp("A"))).toBe("ours")
    expect(isEnemy(comp("A"))).toBe(false)
  })
})

describe("settleOwner", () => {
  it("grava o lado e remove as marcas das antigas táticas salvas", () => {
    const legacy = comp("A", { tactic: true, tacticViews: {}, tacticTeam: "enemy" })
    settleOwner(legacy)
    expect(legacy.owner).toBe("enemy")
    expect(legacy).not.toHaveProperty("tactic")
    expect(legacy).not.toHaveProperty("tacticViews")
    expect(legacy).not.toHaveProperty("tacticTeam")
  })
})

describe("oursOf e enemiesOf", () => {
  it("separam as comps pelo lado, mantendo a ordem", () => {
    const comps = [comp("A"), comp("B", { owner: "enemy" }), comp("C"), comp("D", { tacticTeam: "enemy" })]
    expect(oursOf(comps).map(item => item.id)).toEqual(["a", "c"])
    expect(enemiesOf(comps).map(item => item.id)).toEqual(["b", "d"])
  })
})

describe("enemyOrder", () => {
  it("usa a ordem da adversária do lado oposto ao nosso", () => {
    const enemy = comp("B", { owner: "enemy" })
    enemy.draft = {
      order: { blue: ["top", "jg", "mid", "adc", "sup"], red: ["sup", "adc", "mid", "jg", "top"] },
      note: { blue: "", red: "" },
    }
    expect(oppositeSide("red")).toBe("blue")
    expect(enemyOrder(enemy, "red")).toEqual(["top", "jg", "mid", "adc", "sup"])
    expect(enemyOrder(enemy, "blue")).toEqual(["sup", "adc", "mid", "jg", "top"])
  })
})
