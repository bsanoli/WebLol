type FinalGame = { s: string; st: string; g: number; b: string; r: string; bw: boolean }

export function confirmedFinalSeries(games: readonly FinalGame[]) {
  const final = games.filter(game => game.st === "Final").sort((a, b) => a.g - b.g)
  const first = final[0]
  if (!first?.s || !first.b || !first.r || first.b === first.r || final.length < 3 || final.length > 5) return

  const wins = new Map([[first.b, 0], [first.r, 0]])
  for (const [index, game] of final.entries()) {
    if (game.s !== first.s || game.g !== index + 1 || game.b === game.r ||
        !wins.has(game.b) || !wins.has(game.r) || typeof game.bw !== "boolean") return
    const winner = game.bw ? game.b : game.r
    const count = (wins.get(winner) ?? 0) + 1
    wins.set(winner, count)
    if (count === 3) {
      if (index !== final.length - 1) return
      const runnerUp = winner === first.b ? first.r : first.b
      return { winner, runnerUp, score: [count, wins.get(runnerUp) ?? 0] as const }
    }
  }
}
