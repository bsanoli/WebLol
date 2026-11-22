import { describe, expect, it } from "vitest"
import { confirmedFinalSeries } from "./final-series"

const game = (g: number, didBlueWin: boolean, b = "T1", r = "G2") => ({
  series: "W",
  stage: "Final",
  game: g,
  blue: b,
  red: r,
  blueWon: didBlueWin,
})

describe("confirmedFinalSeries", () => {
  it("confirma a série quando um lado chega a 3 vitórias no último jogo, mesmo trocando de lado", () => {
    // T1 vence os jogos 1 e 3 e o jogo 4 (T1 de vermelho); G2 vence o 2.
    const series = [game(1, true), game(2, false), game(3, true), game(4, false, "G2", "T1")]
    expect(confirmedFinalSeries(series)).toEqual({ winner: "T1", runnerUp: "G2", score: [3, 1] })
  })

  it("recusa série incompleta, jogos fora de ordem ou com jogo depois do título", () => {
    expect(confirmedFinalSeries([game(1, true), game(2, true)])).toBeUndefined()
    expect(confirmedFinalSeries([game(1, true), game(2, true), game(3, true), game(4, true)])).toBeUndefined()
    expect(confirmedFinalSeries([game(1, true), game(3, true), game(4, true)])).toBeUndefined()
  })
})
