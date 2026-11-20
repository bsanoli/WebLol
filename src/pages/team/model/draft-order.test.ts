import { describe, expect, it } from "vitest"
import { DRAFT_PHASES, PICKNAME } from "./draft-order"

const slots = DRAFT_PHASES.flatMap(([, phase]) => phase)

/** Numera os picks na ordem do draft: B1, R1, R2, B2... */
function pickOrder() {
  const count = new Map<string, number>()
  return slots
    .filter(slot => slot.endsWith(":pick"))
    .map(slot => {
      const side = slot[0]
      count.set(side, (count.get(side) ?? 0) + 1)
      return `${side}${count.get(side)}`
    })
}

describe("DRAFT_PHASES", () => {
  it("tem 5 bans e 5 picks para cada lado", () => {
    for (const side of ["B", "R"]) {
      expect(slots.filter(slot => slot === `${side}:ban`)).toHaveLength(5)
      expect(slots.filter(slot => slot === `${side}:pick`)).toHaveLength(5)
    }
  })

  it("segue a ordem de picks do draft competitivo", () => {
    expect(pickOrder()).toEqual(["B1", "R1", "R2", "B2", "B3", "R3", "R4", "B4", "B5", "R5"])
  })
})

describe("PICKNAME", () => {
  it("dá nome a todos os picks", () => {
    expect(Object.keys(PICKNAME).sort()).toEqual([...pickOrder()].sort())
  })

  it("só chama de dupla dois picks seguidos do mesmo lado", () => {
    const order = pickOrder()
    for (const [pick, name] of Object.entries(PICKNAME)) {
      const pair = name.match(/^Dupla (\w\d)\/(\w\d)$/)
      if (!pair) continue
      const [, first, second] = pair
      expect([first, second]).toContain(pick)
      expect(order.indexOf(second)).toBe(order.indexOf(first) + 1)
    }
  })
})
