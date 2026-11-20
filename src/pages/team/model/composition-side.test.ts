import { describe, expect, it } from "vitest"
import {
  compTitle,
  enemiesOf,
  isEnemy,
  oppositeSide,
  oursOf,
  rivalOf,
  rivalOrder,
  setRival,
  settleTeam,
  teamOf,
} from "./composition-side"
import { blank, type Composition } from "./local-state"

function comp(name: string, extra: Partial<Composition> & Record<string, unknown> = {}): Composition {
  return Object.assign(blank(name), { id: name.toLowerCase().replace(/\s+/g, "-") }, extra)
}

describe("teamOf", () => {
  it("usa o campo `team` quando existe", () => {
    expect(teamOf(comp("A", { team: "enemy" }))).toBe("enemy")
    expect(teamOf(comp("B", { team: "mine" }))).toBe("mine")
  })

  it("lê o lado das antigas táticas salvas em `tacticTeam`", () => {
    expect(teamOf(comp("A", { tacticTeam: "enemy" }))).toBe("enemy")
  })

  it("trata comp antiga sem lado como nossa", () => {
    expect(teamOf(comp("A"))).toBe("mine")
    expect(isEnemy(comp("A"))).toBe(false)
  })
})

describe("settleTeam", () => {
  it("grava o lado e remove as marcas das antigas táticas salvas", () => {
    const legacy = comp("A", { tactic: true, tacticViews: {}, tacticTeam: "enemy" })
    settleTeam(legacy)
    expect(legacy.team).toBe("enemy")
    expect(legacy).not.toHaveProperty("tactic")
    expect(legacy).not.toHaveProperty("tacticViews")
    expect(legacy).not.toHaveProperty("tacticTeam")
  })

  it("tira a adversária do draft quando a comp passa a ser adversária", () => {
    const ours = comp("A")
    setRival(ours, "rival")
    settleTeam(ours, "enemy")
    expect(ours.draft?.rival).toBeUndefined()
  })
})

describe("oursOf e enemiesOf", () => {
  it("separam as comps pelo lado, mantendo a ordem", () => {
    const comps = [comp("A"), comp("B", { team: "enemy" }), comp("C"), comp("D", { tacticTeam: "enemy" })]
    expect(oursOf(comps).map(item => item.id)).toEqual(["a", "c"])
    expect(enemiesOf(comps).map(item => item.id)).toEqual(["b", "d"])
  })
})

describe("rivalOf e compTitle", () => {
  const enemy = comp("Time rival", { team: "enemy" })

  it("acham a adversária colocada no draft", () => {
    const ours = comp("Nossa base")
    setRival(ours, enemy.id)
    expect(rivalOf(ours, [ours, enemy])).toBe(enemy)
    expect(compTitle(ours, [ours, enemy])).toBe("Nossa base x Time rival")
  })

  it("ignoram a adversária que não existe mais", () => {
    const ours = comp("Nossa base")
    setRival(ours, "apagada")
    expect(rivalOf(ours, [ours, enemy])).toBeNull()
    expect(compTitle(ours, [ours, enemy])).toBe("Nossa base")
  })

  it("ignoram uma comp nossa apontada como adversária", () => {
    const ours = comp("Nossa base")
    const other = comp("Outra nossa")
    setRival(ours, other.id)
    expect(rivalOf(ours, [ours, other])).toBeNull()
  })

  it("não dão adversária para uma comp adversária", () => {
    const enemyWithRival = comp("Outra rival", { team: "enemy", draft: undefined })
    enemyWithRival.draft = { side: "blue", order: { blue: [], red: [] }, note: { blue: "", red: "" }, rival: enemy.id }
    expect(rivalOf(enemyWithRival, [enemyWithRival, enemy])).toBeNull()
  })
})

describe("setRival", () => {
  it("remove a adversária com null", () => {
    const ours = comp("A")
    setRival(ours, "b")
    expect(ours.draft?.rival).toBe("b")
    setRival(ours, null)
    expect(ours.draft).not.toHaveProperty("rival")
  })
})

describe("rivalOrder", () => {
  it("usa a ordem da adversária do lado oposto ao nosso", () => {
    const ours = comp("A")
    const enemy = comp("B", { team: "enemy" })
    ours.draft = { side: "red", order: { blue: [], red: [] }, note: { blue: "", red: "" } }
    enemy.draft = {
      side: "blue",
      order: { blue: ["top", "jg", "mid", "adc", "sup"], red: ["sup", "adc", "mid", "jg", "top"] },
      note: { blue: "", red: "" },
    }
    expect(oppositeSide("red")).toBe("blue")
    expect(rivalOrder(ours, enemy)).toEqual(["top", "jg", "mid", "adc", "sup"])
  })
})
