import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { TournamentOverview, type ChampionSummary } from "@/components/analytics"

// The existing iframe continues to own routing, filters and data. React owns only
// the analytical blocks, so Firebase and the team editor remain independent.
interface AnalyticsPayload {
  champions: ChampionSummary[]
  games: number
}
export function connectAnalytics(frame: HTMLIFrameElement) {
  let root: Root | undefined
  const release = () => { root?.unmount(); root = undefined }
  frame.addEventListener("weblol:analytics-clear", release)
  frame.addEventListener("load", release)
  frame.addEventListener("weblol:analytics", event => {
    release()
    const container = frame.contentDocument?.getElementById("analytics-root")
    if (!container) return
    const data = (event as CustomEvent<AnalyticsPayload>).detail
    root = createRoot(container)
    flushSync(() => root!.render(<TournamentOverview champions={data.champions} games={data.games} />))
  })
}
