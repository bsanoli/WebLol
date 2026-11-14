// @ts-nocheck -- Integração legada com o DOM; os módulos extraídos mantêm seus tipos próprios.
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { TournamentOverview } from "@/widgets/tournament-overview"
import DATA from "@dataset/summary"
import { LANES } from "@/entities/match"
import { initializeTheme } from "@/shared/config/theme"
import { revealContent } from "@/shared/lib/motion"
import { DATASET } from "@/shared/config/dataset"
import "@/app/styles/index.css";
import { hideTip } from "@/widgets/analytics-tooltip";
import { buildsView, wireBuilds, setBuildRoute, disposeBuilds } from "@/pages/builds";
import { compsView, wireComps, setCompositionRoute, disposeCompositions } from "@/pages/worlds-compositions";
import { championSummaries, overview, renderKpis, wireLaneOverview } from "@/pages/worlds-overview";
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom";
initializeTheme();
renderKpis();
const G = DATA.games;
const defaultTab = DATASET.source === "soloq" ? "builds" : "geral";
const laneById = new Map(LANES.map(([lane]) => [lane.toLowerCase(), lane]));
const worldsPaths = { geral: "", builds: "/builds", comps: "/composicoes" };
const laneFromParam = value => laneById.get(value) || "";

function publishWorlds(id, parts = [], filters = {}, replace = false) {
  const path = id === "builds" && window.frameElement
    ? buildsPath(DATASET.source, parts, filters)
    : (id === "comps" && window.frameElement ? worldsPaths.comps : DATASET.root + worldsPaths[id]) + parts.map(part => "/" + part).join("") + routeQuery(filters);
  if (window.frameElement) window.frameElement.dispatchEvent(new CustomEvent("weblol:navigate", {detail:{path, replace}}));
  else if (location.hash !== "#" + path) history[replace ? "replaceState" : "pushState"](null, "", "#" + path);
}

function routeQuery(filters) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  return query ? "?" + query : "";
}

function buildsPath(source, parts, filters) {
  return "/builds" + parts.map(part => "/" + part).join("") + routeQuery({fonte:source, ...filters});
}

window.applyWebLolRoute = ([page, first, second], params) => {
  if (page === "jogadores") {
    render("geral");
    publishWorlds("geral", [], {}, true);
    return;
  }
  const legacyChampions = page === "campeoes";
  const legacyMatchups = page === "confrontos";
  const id = legacyChampions || legacyMatchups ? "builds" : Object.keys(worldsPaths).find(key => worldsPaths[key] === "/" + page) || defaultTab;
  const query = params.get("busca") || "";
  const lane = laneFromParam(params.get("posicao"));
  if (id === "builds") {
    const champion = (legacyMatchups ? second : first) || "";
    const position = legacyMatchups ? laneFromParam(first) : lane || (legacyChampions ? "Top" : "");
    const minGames = setBuildRoute({ champion, opponent: params.get("adversario") || "", query, lane: position, minGames: params.get("minJogos") });
    render(id);
    if (legacyChampions || legacyMatchups) publishWorlds("builds", champion ? [champion] : [], {posicao:position.toLowerCase(), busca:query, minJogos:minGames}, true);
    return;
  }
  if (id === "comps") setCompositionRoute(query, params);
  render(id);
};
function go(id) {
  const lane = laneById.get(id);
  const tab = lane ? "builds" : defaultTab;
  const filters = lane ? {posicao:id} : {};
  window.applyWebLolRoute([worldsPaths[tab].slice(1)], new URLSearchParams(filters));
  publishWorlds(tab, [], filters);
}

let standaloneOverview;
function render(id){
  const previousPage = document.body.dataset.page;
  disposeBuilds();
  hideTip();
  disposeCompositions();
  standaloneOverview?.unmount();
  standaloneOverview = undefined;
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:analytics-clear"));
  document.getElementById("kpis").hidden = !!window.frameElement || id !== "geral";
  const builds = id === "builds";
  document.querySelector(".wrap > header").hidden = builds;
  document.querySelector(".wrap > .foot").hidden = builds && DATASET.source === "worlds";
  const v = document.getElementById("view");
  if(id==="geral"){v.innerHTML=overview();wireLaneOverview(v, go)}
  else if(id==="comps"){v.innerHTML=compsView();wireComps(publishWorlds)}
  else if(id==="builds"){v.innerHTML=buildsView();wireBuilds({ publishWorlds, buildsPath })}
  document.body.dataset.page = id;
  if(previousPage!==document.body.dataset.page)revealContent(v);
  if (id === "geral" && !window.frameElement) {
    standaloneOverview = createRoot(v.querySelector("#analytics-root"));
    standaloneOverview.render(createElement(TournamentOverview, { champions: championSummaries(), games: G, showSummary: false }));
  }
  if(id === "geral") window.frameElement?.dispatchEvent(new CustomEvent("weblol:analytics", { detail: {
    games: G,
    champions: championSummaries()
  }}));
  enhanceAnalyticsUI();
}

if (!window.frameElement) {
  const applyStandaloneRoute = () => {
    const [path, query] = location.hash.slice(1).split("?", 2);
    const params = new URLSearchParams(query);
    const shortChampionRoute = path.match(/^\/?(builds|campeoes)(?:\/([a-z0-9-]+))?$/);
    if (path.startsWith(DATASET.root + "/")) window.applyWebLolRoute(path.split("/").slice(2), params);
    else if (shortChampionRoute) {
      const [, page, champion] = shortChampionRoute;
      const canonicalPath = DATASET.root + "/" + page + (champion ? "/" + champion : "") + (query ? "?" + query : "");
      history.replaceState(null, "", "#" + canonicalPath);
      window.applyWebLolRoute([page, champion], params);
    } else if (path === "jogadores") window.applyWebLolRoute([path], params);
    else if (laneById.has(path)) window.applyWebLolRoute(["builds"], new URLSearchParams({posicao:path}));
    else window.applyWebLolRoute([worldsPaths[path]?.slice(1) || ""], params);
  };
  addEventListener("hashchange", applyStandaloneRoute);
  applyStandaloneRoute();
} else {
  render(defaultTab);
  window.frameElement.dispatchEvent(new CustomEvent("weblol:route-ready"));
}
