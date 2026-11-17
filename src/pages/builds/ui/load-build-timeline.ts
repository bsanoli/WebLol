import timelineUrl from "@dataset/build-timeline-url"
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom"
import { revealContent } from "@/shared/lib/motion"
import { buildTimelineLoading } from "./build-details"
import { renderBuildTimeline, type TimelineGame } from "./build-timeline"

let gamesRequest: Promise<TimelineGame[]> | undefined

function loadGames() {
  gamesRequest ??= fetch(timelineUrl)
    .then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data.games)) throw new Error("Invalid build timeline")
      return data.games as TimelineGame[]
    })
  return gamesRequest
}

async function loadBuildTimeline(section: HTMLElement) {
  section.dataset.timelineState = "loading"
  const request = loadGames()
  try {
    const games = await request
    if (!section.isConnected) return
    renderBuildTimeline(section, games)
    section.dataset.timelineState = "ready"
    enhanceAnalyticsUI()
    revealContent(section.querySelector(".build-timeline-games"), true)
  } catch {
    if (gamesRequest === request) gamesRequest = undefined
    if (!section.isConnected) return
    section.dataset.timelineState = "error"
    section.innerHTML = `<header class="build-timeline-header"><h4>Compras jogo a jogo</h4></header>
      <p class="build-data-sample" role="status">Não foi possível carregar o histórico de compras.</p>
      <button type="button" data-slot="button" data-variant="outline" data-size="sm">Tentar novamente</button>`
    section.querySelector("button")?.addEventListener("click", () => {
      section.tabIndex = -1
      section.focus({ preventScroll: true })
      section.innerHTML = buildTimelineLoading()
      void loadBuildTimeline(section)
    }, { once: true })
  }
}

export function hydrateBuildTimelines(root: ParentNode) {
  for (const section of root.querySelectorAll<HTMLElement>("[data-build-timeline]:not([data-timeline-state])")) {
    void loadBuildTimeline(section)
  }
}
