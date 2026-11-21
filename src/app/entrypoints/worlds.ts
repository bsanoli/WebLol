import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { TournamentOverview } from "@/widgets/tournament-overview"
import DATA from "@dataset/summary"
import { LANES } from "@/entities/match"
import { exposeFrameHandlers, isEmbedded, navigateHost, sendHostAnalytics, signalHost } from "@/shared/host-bridge"
import { initializeTheme } from "@/shared/config"
import { revealContent } from "@/shared/lib/motion"
import { DATASET } from "@/shared/dataset"
import "@/app/styles/index.css"
import { hideTip } from "@/widgets/analytics-tooltip"
import { championSummaries, overview, renderKpis, renderWorldsFinal, wireLaneOverview } from "@/pages/worlds-overview"
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom"
// Builds e Composições trazem os maiores arquivos de dados; só carregam quando a aba é aberta.
type BuildsPage = typeof import("@/pages/builds")
type CompositionsPage = typeof import("@/pages/worlds-compositions")
let buildsPage: BuildsPage | undefined
let compositionsPage: CompositionsPage | undefined
let navigation = 0
async function loadPage(id: string) {
  try {
    if (id === "builds") buildsPage ??= await import("@/pages/builds")
    else if (id === "comps") compositionsPage ??= await import("@/pages/worlds-compositions")
    return true
  } catch {
    const view = document.getElementById("view")
    if (view) view.textContent = "Não foi possível carregar esta seção. Recarregue a página para tentar novamente."
    return false
  }
}
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

async function applyRoute([page, first, second]: (string | undefined)[], params = new URLSearchParams()) {
  const current = ++navigation
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
  const loaded = await loadPage(id)
  if (!loaded || current !== navigation) return
  const query = params.get("busca") || ""
  const lane = laneFromParam(params.get("posicao"))
  if (id === "builds") {
    const champion = (legacyMatchups ? second : first) || ""
    const position = legacyMatchups ? laneFromParam(first) : lane || (legacyChampions ? "Top" : "")
    const minGames = buildsPage?.setBuildRoute({
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
  if (id === "comps") compositionsPage?.setCompositionRoute(query, params)
  render(id)
}
exposeFrameHandlers({ applyWebLolRoute: applyRoute })

async function go(id: string) {
  const lane = laneById.get(id)
  const tab = lane ? "builds" : defaultTab
  const filters: Record<string, string> = lane ? { posicao: id } : {}
  const pending = applyRoute([worldsPaths[tab].slice(1)], new URLSearchParams(filters))
  const current = navigation
  await pending
  if (current !== navigation) return
  publishWorlds(tab, [], filters)
}

let standaloneOverview: Root | undefined
function render(id: PageId) {
  const previousPage = document.body.dataset.page
  buildsPage?.disposeBuilds()
  hideTip()
  compositionsPage?.disposeCompositions()
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
    wireLaneOverview(v, id => void go(id))
  } else if (id === "comps") {
    if (compositionsPage) {
      v.innerHTML = compositionsPage.compsView()
      compositionsPage.wireComps(publishWorlds)
    }
  } else if (id === "builds") {
    if (buildsPage) {
      v.innerHTML = buildsPage.buildsView()
      buildsPage.wireBuilds({ publishWorlds, buildsPath })
    }
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
    if (path.startsWith(DATASET.root + "/")) void applyRoute(path.split("/").slice(2), params)
    else if (shortChampionRoute) {
      const [, page, champion] = shortChampionRoute
      const canonicalPath = DATASET.root + "/" + page + (champion ? "/" + champion : "") + (query ? "?" + query : "")
      history.replaceState(null, "", "#" + canonicalPath)
      void applyRoute([page, champion], params)
    } else if (path === "jogadores") void applyRoute([path], params)
    else if (laneById.has(path)) void applyRoute(["builds"], new URLSearchParams({ posicao: path }))
    else void applyRoute([worldsPaths[path as PageId]?.slice(1) || ""], params)
  }
  addEventListener("hashchange", applyStandaloneRoute)
  applyStandaloneRoute()
} else {
  const initial = ++navigation
  void loadPage(defaultTab).then(loaded => {
    if (loaded && initial === navigation) render(defaultTab)
    signalHost("weblol:route-ready")
  })
}
