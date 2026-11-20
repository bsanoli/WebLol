import { describe, expect, it } from "vitest"
import { compositionFromSaved, compositionToSaved, teamStateToSaved } from "./composition-storage"

const saved = (value: unknown) => JSON.stringify(value)

const oursSaved = {
  id: "a",
  name: "Nossa",
  team: "mine",
  lanes: { top: ["Ornn"], ban: ["Zed"] },
  draft: { side: "blue", rival: "b", note: { blue: "", red: "" } },
  updated: 1,
}
const enemySaved = { id: "b", name: "Deles", team: "enemy", lanes: { top: [] }, updated: 2 }

describe("compositionFromSaved", () => {
  it("troca team por owner e rival por enemyId", () => {
    const comp = compositionFromSaved(oursSaved) as unknown as Record<string, unknown>
    expect(comp.owner).toBe("ours")
    expect(comp).not.toHaveProperty("team")
    expect(comp.draft).toMatchObject({ enemyId: "b" })
    expect(comp.draft).not.toHaveProperty("rival")
  })

  it("mantém a composição adversária", () => {
    expect(compositionFromSaved(enemySaved)).toMatchObject({ owner: "enemy" })
  })

  it("deixa sem owner a composição antiga sem team", () => {
    const comp = compositionFromSaved({ id: "x", name: "Antiga" }) as unknown as Record<string, unknown>
    expect(comp).not.toHaveProperty("owner")
    expect(comp).not.toHaveProperty("team")
  })

  it("não mexe em valor desconhecido nem em dado que não é objeto", () => {
    expect(compositionFromSaved({ id: "x", team: "outro" })).toEqual({ id: "x", team: "outro" })
    expect(compositionFromSaved({ id: "x", team: "toString" })).toEqual({ id: "x", team: "toString" })
    expect(compositionFromSaved(null)).toBeNull()
    expect(compositionFromSaved("texto")).toBe("texto")
  })

  it("preserva as tácticas antigas em tacticTeam", () => {
    expect(compositionFromSaved({ id: "t", tactic: true, tacticTeam: "enemy" })).toEqual({
      id: "t",
      tactic: true,
      tacticTeam: "enemy",
    })
  })
})

describe("ida e volta", () => {
  it.each([oursSaved, enemySaved, { id: "x", name: "Antiga", lanes: {} }, { id: "y", team: "outro" }])(
    "devolve o mesmo JSON, com a mesma ordem das chaves (%#)",
    original => {
      const back = compositionToSaved(compositionFromSaved(original))
      expect(saved(back)).toBe(saved(original))
    },
  )

  it("teamStateToSaved converte cada composição e mantém o resto do estado", () => {
    const state = {
      comps: [compositionFromSaved(oursSaved), compositionFromSaved(enemySaved)],
      cur: "a",
      view: "draft",
    }
    expect(saved(teamStateToSaved(state))).toBe(saved({ comps: [oursSaved, enemySaved], cur: "a", view: "draft" }))
  })
})
