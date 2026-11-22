import { describe, expect, it } from "vitest"
import soloqSummary from "../../../data/soloq/summary.json"
import worldsSummary from "../../../data/worlds.json"
import { parseTournamentSummary } from "./summary"

describe("Resumo do torneio", () => {
  it("o resumo do Worlds tem o formato canônico", () => {
    expect(parseTournamentSummary(worldsSummary).comps.length).toBeGreaterThan(0)
  })

  it("o resumo da SoloQ tem o formato canônico", () => {
    expect(parseTournamentSummary(soloqSummary).champs.length).toBeGreaterThan(0)
  })

  it("rejeita o que não é objeto", () => {
    expect(() => parseTournamentSummary(null)).toThrow("esperado um objeto")
  })

  it("aponta o campo que saiu do formato", () => {
    const broken = { ...worldsSummary, comps: [{ ...worldsSummary.comps[0], blueWon: "sim" }] }
    expect(() => parseTournamentSummary(broken)).toThrow('campo "comps"')
  })

  it("rejeita linha de rota com colunas faltando", () => {
    const [game] = worldsSummary.comps
    const broken = { ...worldsSummary, comps: [{ ...game, lanes: [game.lanes[0].slice(0, 5)] }] }
    expect(() => parseTournamentSummary(broken)).toThrow('campo "comps"')
  })
  it("aponta o campo meta quando a data da coleta não é texto", () => {
    expect(() => parseTournamentSummary({ ...soloqSummary, meta: { asOf: 20261122 } })).toThrow('campo "meta"')
  })
})
