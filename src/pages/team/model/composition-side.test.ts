import { describe, expect, it } from "vitest"
import {
  compTitle,
  enemiesOf,
  isEnemy,
  oppositeSide,
  oursOf,
  enemyCompositionOf,
  enemyOrder,
  setEnemyId,
  settleOwner,
  ownerOf,
} from "./composition-side"
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

  it("tira a adversária do draft quando a comp passa a ser adversária", () => {
    const ours = comp("A")
    setEnemyId(ours, "rival")
    settleOwner(ours, "enemy")
    expect(ours.draft?.enemyId).toBeUndefined()
  })
})

describe("oursOf e enemiesOf", () => {
  it("separam as comps pelo lado, mantendo a ordem", () => {
    const comps = [comp("A"), comp("B", { owner: "enemy" }), comp("C"), comp("D", { tacticTeam: "enemy" })]
    expect(oursOf(comps).map(item => item.id)).toEqual(["a", "c"])
    expect(enemiesOf(comps).map(item => item.id)).toEqual(["b", "d"])
  })
})

describe("enemyCompositionOf e compTitle", () => {
  const enemy = comp("Time rival", { owner: "enemy" })

  it("acham a adversária colocada no draft", () => {
    const ours = comp("Nossa base")
    setEnemyId(ours, enemy.id)
    expect(enemyCompositionOf(ours, [ours, enemy])).toBe(enemy)
    expect(compTitle(ours, [ours, enemy])).toBe("Nossa base x Time rival")
  })

  it("ignoram a adversária que não existe mais", () => {
    const ours = comp("Nossa base")
    setEnemyId(ours, "apagada")
    expect(enemyCompositionOf(ours, [ours, enemy])).toBeNull()
    expect(compTitle(ours, [ours, enemy])).toBe("Nossa base")
  })

  it("ignoram uma comp nossa apontada como adversária", () => {
    const ours = comp("Nossa base")
    const other = comp("Outra nossa")
    setEnemyId(ours, other.id)
    expect(enemyCompositionOf(ours, [ours, other])).toBeNull()
  })

  it("não dão adversária para uma comp adversária", () => {
    const enemyWithRival = comp("Outra rival", { owner: "enemy", draft: undefined })
    enemyWithRival.draft = {
      side: "blue",
      order: { blue: [], red: [] },
      note: { blue: "", red: "" },
      enemyId: enemy.id,
    }
    expect(enemyCompositionOf(enemyWithRival, [enemyWithRival, enemy])).toBeNull()
  })
})

describe("setEnemyId", () => {
  it("remove a adversária com null", () => {
    const ours = comp("A")
    setEnemyId(ours, "b")
    expect(ours.draft?.enemyId).toBe("b")
    setEnemyId(ours, null)
    expect(ours.draft).not.toHaveProperty("enemyId")
  })
})

describe("enemyOrder", () => {
  it("usa a ordem da adversária do lado oposto ao nosso", () => {
    const ours = comp("A")
    const enemy = comp("B", { owner: "enemy" })
    ours.draft = { side: "red", order: { blue: [], red: [] }, note: { blue: "", red: "" } }
    enemy.draft = {
      side: "blue",
      order: { blue: ["top", "jg", "mid", "adc", "sup"], red: ["sup", "adc", "mid", "jg", "top"] },
      note: { blue: "", red: "" },
    }
    expect(oppositeSide("red")).toBe("blue")
    expect(enemyOrder(ours, enemy)).toEqual(["top", "jg", "mid", "adc", "sup"])
  })
})
