// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest"
import { buildData, buildOpponentOptions, championBuild, directOpponent, opponentBuild } from "./build-statistics"
import { encountersStatus, loadEncounters } from "./encounters"
import DATA from "@dataset/summary"

const champion = DATA.champs.find(item => buildData[item.name]?.all) ?? DATA.champs[0]

describe("directOpponent", () => {
  it("devolve o adversário da mesma rota no outro lado", () => {
    const players = [
      { champion: "A", role: "Mid", side: "b" },
      { champion: "B", role: "Mid", side: "r" },
      { champion: "C", role: "Top", side: "r" },
    ]
    expect(directOpponent(players, players[0])?.champion).toBe("B")
    expect(directOpponent([players[0], players[2]], players[0])).toBeUndefined()
  })
})

describe("championBuild", () => {
  it("sem rota usa o conjunto geral do campeão", () => {
    expect(championBuild(champion, "")).toBe(buildData[champion.name]?.all)
  })
})

describe("buildOpponentOptions e opponentBuild", () => {
  const options = buildOpponentOptions(champion, "")

  beforeAll(() => loadEncounters(champion.name))

  it("carrega os confrontos do campeão sob demanda", () => {
    expect(encountersStatus(champion.name)).toBe("ready")
  })

  it("lista adversários do mais ao menos enfrentado, sem repetir", () => {
    expect(options.length).toBeGreaterThan(0)
    for (let index = 1; index < options.length; index++)
      expect(options[index - 1].games).toBeGreaterThanOrEqual(options[index].games)
    expect(new Set(options.map(option => option.slug)).size).toBe(options.length)
  })

  it("monta a build contra um adversário com percentuais coerentes", () => {
    const build = opponentBuild(champion, "", options[0].slug)
    expect(build?.games).toBe(options[0].games)
    for (const entry of build?.finalItems ?? []) {
      expect(entry.percent).toBeCloseTo((entry.count / (build?.games ?? 1)) * 100)
    }
  })

  it("sem confrontos devolve undefined", () => {
    expect(opponentBuild(champion, "", "nao-existe")).toBeUndefined()
  })
})
