import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { TournamentOverview } from "@/widgets/tournament-overview"
import DATA from "@dataset/summary"
import { LANES } from "@/entities/match"
import { exposeFrameHandlers, isEmbedded, navigateHost, sendHostAnalytics, signalHost } from "@/shared/api/host-bridge"
import { initializeTheme } from "@/shared/config/theme"
import { revealContent } from "@/shared/lib/motion"
import { DATASET } from "@/shared/config/dataset"
import "@/app/styles/index.css"
import { hideTip } from "@/widgets/analytics-tooltip"
import { buildsView, wireBuilds, setBuildRoute, disposeBuilds } from "@/pages/builds"
import { compsView, wireComps, setCompositionRoute, disposeCompositions } from "@/pages/worlds-compositions"
import { championSummaries, overview, renderKpis, renderWorldsFinal, wireLaneOverview } from "@/pages/worlds-overview"
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom"
initializeTheme()
renderKpis()
renderWorldsFinal()
const G = DATA.games
const defaultTab = DATASET.source === "soloq" ? "builds" : "geral"
const laneById = new Map(LANES.map(([lane]) => [lane.toLowerCase(), lane]))
const worldsPaths = { geral: "", builds: "/builds", comps: "/composicoes" }
type PageId = keyof typeof worldsPaths
type RouteFilters = Record<string, string | number | null | undefined>
const laneFromParam = (value: string | null | undefined) => (value && laneById.get(value)) || ""

function publishWorlds(id: PageId, parts: string[] = [], filters: RouteFilters = {}, replace = false) {
  const embedded = isEmbedded()
  const path =
    id === "builds" && embedded
      ? buildsPath(DATASET.source, parts, filters)
      : (id === "comps" && embedded ? worldsPaths.comps : DATASET.root + worldsPaths[id]) +
        parts.map(part => "/" + part).join("") +
        routeQuery(filters)
  if (embedded) navigateHost({ path, replace })
  else if (location.hash !== "#" + path) history[replace ? "replaceState" : "pushState"](null, "", "#" + path)
}

function routeQuery(filters: RouteFilters) {
  const entries = Object.entries(filters).flatMap(([key, value]) =>
    value ? [[key, String(value)] as [string, string]] : [],
  )
  const query = new URLSearchParams(entries).toString()
  return query ? "?" + query : ""
}

function buildsPath(source: string, parts: string[], filters: RouteFilters) {
  return "/builds" + parts.map(part => "/" + part).join("") + routeQuery({ fonte: source, ...filters })
}

function applyRoute([page, first, second]: (string | undefined)[], params = new URLSearchParams()) {
  if (page === "jogadores") {
    render("geral")
    publishWorlds("geral", [], {}, true)
    return
  }
  const legacyChampions = page === "campeoes"
  const legacyMatchups = page === "confrontos"
  const id =
    legacyChampions || legacyMatchups
      ? "builds"
      : (Object.keys(worldsPaths) as PageId[]).find(key => worldsPaths[key] === "/" + page) || defaultTab
  const query = params.get("busca") || ""
  const lane = laneFromParam(params.get("posicao"))
  if (id === "builds") {
    const champion = (legacyMatchups ? second : first) || ""
    const position = legacyMatchups ? laneFromParam(first) : lane || (legacyChampions ? "Top" : "")
    const minGames = setBuildRoute({
      champion,
      opponent: params.get("adversario") || "",
      query,
      lane: position,
      minGames: params.get("minJogos"),
    })
    render(id)
    if (legacyChampions || legacyMatchups)
      publishWorlds(
        "builds",
        champion ? [champion] : [],
        { posicao: position.toLowerCase(), busca: query, minJogos: minGames },
        true,
      )
    return
  }
  if (id === "comps") setCompositionRoute(query, params)
  render(id)
}
exposeFrameHandlers({ applyWebLolRoute: applyRoute })

function go(id: string) {
  const lane = laneById.get(id)
  const tab = lane ? "builds" : defaultTab
  const filters: Record<string, string> = lane ? { posicao: id } : {}
  applyRoute([worldsPaths[tab].slice(1)], new URLSearchParams(filters))
  publishWorlds(tab, [], filters)
}

let standaloneOverview: Root | undefined
function render(id: PageId) {
  const previousPage = document.body.dataset.page
  disposeBuilds()
  hideTip()
  disposeCompositions()
  standaloneOverview?.unmount()
  standaloneOverview = undefined
  signalHost("weblol:analytics-clear")
  const kpis = document.getElementById("kpis")
  if (kpis) kpis.hidden = isEmbedded() || id !== "geral"
  const final = document.getElementById("worlds-final")
  if (final?.hasAttribute("data-confirmed")) final.hidden = id !== "geral"
  const builds = id === "builds"
  const header = document.querySelector<HTMLElement>(".wrap > header")
  if (header) header.hidden = builds
  const foot = document.querySelector<HTMLElement>(".wrap > .foot")
  if (foot) foot.hidden = builds && DATASET.source === "worlds"
  const v = document.getElementById("view")
  if (!v) return
  if (id === "geral") {
    v.innerHTML = overview()
    wireLaneOverview(v, go)
  } else if (id === "comps") {
    v.innerHTML = compsView()
    wireComps(publishWorlds)
  } else if (id === "builds") {
    v.innerHTML = buildsView()
    wireBuilds({ publishWorlds, buildsPath })
  }
  document.body.dataset.page = id
  if (previousPage !== document.body.dataset.page) revealContent(v)
  const analyticsRoot = v.querySelector("#analytics-root")
  if (id === "geral" && !isEmbedded() && analyticsRoot) {
    standaloneOverview = createRoot(analyticsRoot)
    standaloneOverview.render(
      createElement(TournamentOverview, { champions: championSummaries(), games: G, showSummary: false }),
    )
  }
  if (id === "geral") sendHostAnalytics({ games: G, champions: championSummaries() })
  enhanceAnalyticsUI()
}

if (!isEmbedded()) {
  const applyStandaloneRoute = () => {
    const [path = "", query] = location.hash.slice(1).split("?", 2)
    const params = new URLSearchParams(query)
    const shortChampionRoute = path.match(/^\/?(builds|campeoes)(?:\/([a-z0-9-]+))?$/)
    if (path.startsWith(DATASET.root + "/")) applyRoute(path.split("/").slice(2), params)
    else if (shortChampionRoute) {
      const [, page, champion] = shortChampionRoute
      const canonicalPath = DATASET.root + "/" + page + (champion ? "/" + champion : "") + (query ? "?" + query : "")
      history.replaceState(null, "", "#" + canonicalPath)
      applyRoute([page, champion], params)
    } else if (path === "jogadores") applyRoute([path], params)
    else if (laneById.has(path)) applyRoute(["builds"], new URLSearchParams({ posicao: path }))
    else applyRoute([worldsPaths[path as PageId]?.slice(1) || ""], params)
  }
  addEventListener("hashchange", applyStandaloneRoute)
  applyStandaloneRoute()
} else {
  render(defaultTab)
  signalHost("weblol:route-ready")
}
