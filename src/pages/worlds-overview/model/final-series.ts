type FinalGame = { series: string; stage: string; game: number; blue: string; red: string; blueWon: boolean }

export function confirmedFinalSeries(games: readonly FinalGame[]) {
  const final = games.filter(game => game.stage === "Final").sort((a, b) => a.game - b.game)
  const first = final[0]
  if (!first?.series || !first.blue || !first.red || first.blue === first.red || final.length < 3 || final.length > 5)
    return

  const wins = new Map([
    [first.blue, 0],
    [first.red, 0],
  ])
  for (const [index, game] of final.entries()) {
    if (
      game.series !== first.series ||
      game.game !== index + 1 ||
      game.blue === game.red ||
      !wins.has(game.blue) ||
      !wins.has(game.red) ||
      typeof game.blueWon !== "boolean"
    )
      return
    const winner = game.blueWon ? game.blue : game.red
    const count = (wins.get(winner) ?? 0) + 1
    wins.set(winner, count)
    if (count === 3) {
      if (index !== final.length - 1) return
      const runnerUp = winner === first.blue ? first.red : first.blue
      return { winner, runnerUp, score: [count, wins.get(runnerUp) ?? 0] as const }
    }
  }
}
