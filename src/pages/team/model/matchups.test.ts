import { describe, expect, it } from "vitest"
import { withOwnMatchups } from "@/shared/lib/team-changes"
import { blank, type Composition } from "./local-state"
import {
  addMatchup,
  allMatchups,
  detachMissingComps,
  findMatchup,
  isMatchupKey,
  matchupKey,
  matchupsOfComp,
  matchupTitle,
  removeMatchup,
  resolveCompDrop,
  sanitizeMatchups,
  swapMatchupSides,
  type Matchup,
} from "./matchups"

/** Garante que o valor existe e o devolve sem `undefined`. */
function defined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Valor ausente no teste")
  return value
}

function comp(id: string, owner: "ours" | "enemy" = "ours"): Composition {
  return Object.assign(blank(id), { id, owner })
}

describe("matchupKey", () => {
  it("prefixa o id com mx- e reconhece a chave", () => {
    expect(matchupKey("abc")).toBe("mx-abc")
    expect(isMatchupKey("mx-abc")).toBe(true)
    expect(isMatchupKey("abc")).toBe(false)
    expect(isMatchupKey(null)).toBe(false)
  })
})

describe("sanitizeMatchups", () => {
  it("descarta confrontos malformados e ids repetidos", () => {
    const list = sanitizeMatchups([{ id: "1", enemy: "b", side: "red", updated: 1 }, null, { id: 2 }, { id: "1" }])
    expect(list).toEqual([{ id: "1", enemy: "b", side: "red", updated: 1 }])
  })

  it("devolve lista vazia quando não é lista", () => {
    expect(sanitizeMatchups(undefined)).toEqual([])
    expect(sanitizeMatchups("x")).toEqual([])
  })
})

describe("addMatchup e removeMatchup", () => {
  it("permite pares repetidos, cada um com id próprio", () => {
    const list: Matchup[] = []
    const first = addMatchup(list, { ours: "a", enemy: "b" })
    const second = addMatchup(list, { ours: "a", enemy: "b" })
    expect(list).toHaveLength(2)
    expect(first.id).not.toBe(second.id)
    removeMatchup(list, first.id)
    expect(list.map(item => item.id)).toEqual([second.id])
  })
})

describe("matchupTitle e allMatchups", () => {
  const comps = [comp("a"), comp("b", "enemy")]

  it("usa o nome dado ou 'Nossa x Adversária'", () => {
    const list: Matchup[] = []
    const plain = addMatchup(list, { ours: "a", enemy: "b" })
    const named = addMatchup(list, { ours: "a", enemy: "b", name: "Final" })
    expect(matchupTitle(defined(findMatchup(comps, list, plain.id)))).toBe("a x b")
    expect(matchupTitle(defined(findMatchup(comps, list, named.id)))).toBe("Final")
  })

  it("mantém o confronto com o lado vazio quando a comp não existe mais", () => {
    const list: Matchup[] = []
    addMatchup(list, { ours: "a", enemy: "sumiu" })
    const [entry] = allMatchups(comps, list)
    expect(entry.enemy).toBeNull()
    expect(matchupTitle(entry)).toBe("a x Sem adversária")
  })
})

describe("detachMissingComps", () => {
  it("tira só o lado que perdeu a comp e devolve os confrontos mexidos", () => {
    const list: Matchup[] = []
    const kept = addMatchup(list, { ours: "a", enemy: "b" })
    const lost = addMatchup(list, { ours: "a", enemy: "x" })
    const changed = detachMissingComps(list, [comp("a"), comp("b", "enemy")])
    expect(changed).toEqual([lost])
    expect(lost.enemy).toBeUndefined()
    expect(lost.ours).toBe("a")
    expect(kept.enemy).toBe("b")
  })
})

describe("matchupsOfComp", () => {
  it("lista os confrontos da comp, do mais recente ao mais antigo", () => {
    const list: Matchup[] = []
    const old = addMatchup(list, { ours: "a", enemy: "b" }, 1)
    const recent = addMatchup(list, { ours: "a", enemy: "c" }, 9)
    addMatchup(list, { ours: "z", enemy: "c" }, 5)
    expect(matchupsOfComp(list, "a").map(item => item.id)).toEqual([recent.id, old.id])
  })
})

describe("swapMatchupSides", () => {
  it("inverte o lado da nossa comp", () => {
    const item = addMatchup([], { ours: "a", enemy: "b", side: "blue" })
    swapMatchupSides(item, 7)
    expect(item.side).toBe("red")
    expect(item.updated).toBe(7)
  })
})

describe("resolveCompDrop", () => {
  const comps = [comp("a"), comp("b", "enemy"), comp("c", "enemy")]

  it("sem confronto aberto, cria um com a comp solta no lado dela", () => {
    const list: Matchup[] = []
    const result = defined(resolveCompDrop(comps, list, null, "b", "red"))
    expect(result.created).toBe(true)
    expect(list).toHaveLength(1)
    expect(result.matchup).toMatchObject({ enemy: "b", side: "blue" })
  })

  it("a adversária solta completa o confronto aberto sem trocar os lados", () => {
    const list: Matchup[] = []
    const open = addMatchup(list, { ours: "a", side: "blue" })
    const result = defined(resolveCompDrop(comps, list, open.id, "b", "red"))
    expect(result.created).toBe(false)
    expect(result.swapped).toBe(false)
    expect(open).toMatchObject({ ours: "a", enemy: "b", side: "blue" })
  })

  it("soltar a nossa no lado da adversária inverte os lados", () => {
    const list: Matchup[] = []
    const open = addMatchup(list, { ours: "a", enemy: "b", side: "blue" })
    const result = defined(resolveCompDrop(comps, list, open.id, "a", "red"))
    expect(result.swapped).toBe(true)
    expect(open.side).toBe("red")
  })

  it("trocar a adversária pela outra mantém os lados", () => {
    const list: Matchup[] = []
    const open = addMatchup(list, { ours: "a", enemy: "b", side: "red" })
    const result = defined(resolveCompDrop(comps, list, open.id, "c", "blue"))
    expect(result.swapped).toBe(false)
    expect(open).toMatchObject({ enemy: "c", side: "red" })
  })

  it("devolve null para uma comp que não existe", () => {
    expect(resolveCompDrop(comps, [], null, "nada", "blue")).toBeNull()
  })
})

describe("withOwnMatchups (migração)", () => {
  const data = () => ({
    comps: [
      { id: "a", team: "mine", draft: { side: "red", rival: "e1" }, matchups: [{ id: "m1", enemy: "e2", updated: 4 }] },
      { id: "e1", team: "enemy" },
      { id: "e2", team: "enemy" },
    ],
  })

  it("leva os confrontos embutidos e o rival do draft para a lista, mantendo os ids e o lado", () => {
    const out = withOwnMatchups(data() as never)
    expect(out.matchups).toEqual([
      { id: "m1", ours: "a", enemy: "e2", side: "red", updated: 4 },
      { id: "a-e1", ours: "a", enemy: "e1", side: "red", updated: 0 },
    ])
    expect(out.comps[0]).not.toHaveProperty("matchups")
  })

  it("é idempotente", () => {
    const once = withOwnMatchups(data() as never)
    expect(withOwnMatchups(once)).toEqual(once)
  })
})
