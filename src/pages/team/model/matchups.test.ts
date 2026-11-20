import { describe, expect, it } from "vitest"
import { setRival } from "./composition-side"
import { blank, type Composition } from "./local-state"
import {
  addMatchup,
  adoptRivals,
  allMatchups,
  findMatchup,
  isMatchupKey,
  matchupKey,
  matchupsOf,
  pruneMatchups,
  removeMatchup,
  resolveCompDrop,
} from "./matchups"

function comp(id: string, team: "mine" | "enemy" = "mine"): Composition {
  return Object.assign(blank(id), { id, team })
}

describe("matchupKey", () => {
  it("prefixa o id com mx- e reconhece a chave", () => {
    expect(matchupKey("abc")).toBe("mx-abc")
    expect(isMatchupKey("mx-abc")).toBe(true)
    expect(isMatchupKey("abc")).toBe(false)
    expect(isMatchupKey(null)).toBe(false)
  })
})

describe("matchupsOf", () => {
  it("descarta confrontos malformados vindos do armazenamento", () => {
    const ours = comp("a")
    ours.matchups = [{ id: "1", enemy: "b", updated: 1 }, null, { id: 2, enemy: "c" }] as never
    expect(matchupsOf(ours)).toEqual([{ id: "1", enemy: "b", updated: 1 }])
  })

  it("devolve lista vazia quando o campo falta ou não é lista", () => {
    expect(matchupsOf(comp("a"))).toEqual([])
    expect(matchupsOf(Object.assign(comp("a"), { matchups: "x" as never }))).toEqual([])
  })
})

describe("addMatchup e removeMatchup", () => {
  it("não duplica o mesmo par", () => {
    const ours = comp("a")
    const first = addMatchup(ours, "b", 10)
    const again = addMatchup(ours, "b", 20)
    expect(again).toBe(first)
    expect(ours.matchups).toHaveLength(1)
    expect(first.updated).toBe(10)
  })

  it("apaga o campo quando o último confronto sai", () => {
    const ours = comp("a")
    const created = addMatchup(ours, "b")
    removeMatchup(ours, created.id)
    expect(ours).not.toHaveProperty("matchups")
  })
})

describe("allMatchups e findMatchup", () => {
  it("só listam pares com a nossa e a adversária existentes", () => {
    const ours = comp("a")
    const enemy = comp("b", "enemy")
    const other = comp("c")
    const valid = addMatchup(ours, enemy.id)
    addMatchup(ours, "apagada")
    addMatchup(ours, other.id)
    const comps = [ours, enemy, other]
    expect(allMatchups(comps).map(entry => entry.matchup.id)).toEqual([valid.id])
    expect(findMatchup(comps, valid.id)?.enemy).toBe(enemy)
    expect(findMatchup(comps, null)).toBeNull()
  })

  it("ignoram confrontos guardados numa comp adversária", () => {
    const enemy = comp("b", "enemy")
    const otherEnemy = comp("c", "enemy")
    addMatchup(enemy, otherEnemy.id)
    expect(allMatchups([enemy, otherEnemy])).toEqual([])
  })
})

describe("pruneMatchups", () => {
  it("remove os pares sem adversária e devolve os ids para apagar as táticas", () => {
    const ours = comp("a")
    const enemy = comp("b", "enemy")
    const kept = addMatchup(ours, enemy.id)
    const lost = addMatchup(ours, "apagada")
    expect(pruneMatchups([ours, enemy])).toEqual([lost.id])
    expect(matchupsOf(ours)).toEqual([kept])
  })

  it("não mexe em comps sem confrontos inválidos", () => {
    const ours = comp("a")
    const enemy = comp("b", "enemy")
    const kept = addMatchup(ours, enemy.id)
    const before = ours.matchups
    expect(pruneMatchups([ours, enemy])).toEqual([])
    expect(ours.matchups).toBe(before)
    expect(ours.matchups).toEqual([kept])
  })
})

describe("adoptRivals", () => {
  it("transforma a adversária colocada no draft em confronto", () => {
    const ours = comp("a")
    const enemy = comp("b", "enemy")
    setRival(ours, enemy.id)
    expect(adoptRivals([ours, enemy])).toBe(true)
    expect(matchupsOf(ours).map(item => item.enemy)).toEqual([enemy.id])
    expect(adoptRivals([ours, enemy])).toBe(false)
  })
})

describe("resolveCompDrop", () => {
  const ours = comp("a")
  const enemy = comp("b", "enemy")
  const comps = [ours, enemy]

  it("só posiciona a comp quando não há par aberto", () => {
    expect(resolveCompDrop(comps, null, null, ours.id, "red")).toEqual({
      place: { id: ours.id, side: "red" },
      matchup: null,
      open: ours.id,
    })
  })

  it("forma o confronto com a comp aberta do outro time", () => {
    expect(resolveCompDrop(comps, ours.id, null, enemy.id, "blue")).toEqual({
      place: { id: ours.id, side: "red" },
      matchup: { ours: ours.id, enemy: enemy.id },
      open: ours.id,
    })
  })

  it("devolve null para uma comp que não existe", () => {
    expect(resolveCompDrop(comps, null, null, "apagada", "blue")).toBeNull()
  })
})
