// @ts-nocheck -- A tela legada ainda usa estado e eventos DOM sem tipos explícitos.
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { ExistingContent, showDialog } from "@/components/ui/dialog-controls"
import { animate } from "motion"
import { TournamentOverview } from "@/components/analytics"
import { Button } from "@/components/ui/button"
import { flushSync } from "react-dom"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { iconMarkup, laneIconMarkup } from "./icon"
import DATA from "@dataset/summary"
import DRAFTS from "@dataset/drafts"
import { LOL_DATA, lolAsset, lolChampion, lolKey } from "./lol-media"
import { abilityDetail, buildDetails, buildGameCount, buildLaneHighlights, buildMatchesQuery, buildMatchups, buildOpponentOptions, buildsTable, hydrateBuildTimelines } from "./worlds-builds"
import { effectText } from "./worlds-effect-text"
import { WorldsOpponentSelect } from "./worlds-opponent-select"
import { LANES, pct, wrPill, ico, esc, championSlug, teamLogo, teamRegion, teamCode } from "./worlds-display"
import { initializeTheme } from "./theme"
import { revealContent } from "./motion"
import { DATASET } from "./dataset"

initializeTheme()

const G=DATA.games, C=DATA.champs;
const tipEl=()=>document.getElementById('tip');
const tipSelector = "[data-game-tip], [data-tip]";
document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-rune-tree-option]");
  if (!button) return;
  const tree = button.closest(".rune-tree");
  tree.querySelectorAll("[data-rune-tree-option]").forEach(option => {
    option.setAttribute("aria-pressed", String(option === button));
  });
  tree.querySelectorAll("[data-rune-view]").forEach(view => {
    view.hidden = view.dataset.runeView !== button.dataset.runeTreeOption;
  });
});
let tipTarget, dismissedGameTip;
let definitionTerm;
function hideDefinition() {
  if (!definitionTerm) return;
  definitionTerm.removeAttribute("aria-describedby");
  definitionTerm = undefined;
  tipEl().querySelector(".effect-definition")?.remove();
}
function showDefinition(term) {
  if (definitionTerm === term) return;
  hideDefinition();
  const definition = document.createElement("div");
  definition.id = "effect-definition";
  definition.className = "effect-definition";
  definition.setAttribute("role", "tooltip");
  definition.textContent = term.dataset.definition;
  tipEl().append(definition);
  definitionTerm = term;
  term.setAttribute("aria-describedby", definition.id);
  const anchor = term.getBoundingClientRect();
  const panel = tipEl().getBoundingClientRect();
  const {width, height} = definition.getBoundingClientRect();
  const right = document.documentElement.clientWidth - width - 8;
  const beside = panel.right <= right ? panel.right : panel.left - width;
  const fitsBeside = beside >= 8 && beside <= right;
  const left = fitsBeside ? beside : anchor.left + (anchor.width - width) / 2;
  const top = fitsBeside || anchor.bottom + height <= innerHeight - 8 ? anchor.bottom : anchor.top - height;
  definition.style.left = Math.max(8, Math.min(left, right)) + "px";
  definition.style.top = Math.max(8, Math.min(top, innerHeight - height - 8)) + "px";
}
function hideTip() {
  hideDefinition();
  if (tipTarget?.dataset.gameTip) tipTarget.removeAttribute("aria-describedby");
  tipEl().hidden = true;
  tipTarget = undefined;
}
function showTip(target, x, y) {
  const el = tipEl();
  const { tip, gameTip } = target.dataset;
  if (gameTip && tipTarget === target && !el.hidden) return;
  hideDefinition();
  if (tipTarget?.dataset.gameTip) tipTarget.removeAttribute("aria-describedby");
  el.classList.toggle("game-tip", Boolean(gameTip));
  el.classList.toggle("ability-tip", gameTip?.startsWith("ability:") ?? false);
  el.setAttribute("role", gameTip ? "region" : "tooltip");
  el.removeAttribute("aria-labelledby");
  el.style.maxHeight = "";
  el.textContent = tip ?? "";
  if (gameTip) {
    const [kind, key, slot] = gameTip.split(":");
    const detail = kind === "rune"
      ? { name: LOL_DATA.runeNames[key], description: LOL_DATA.runeDescriptions[key] }
      : kind === "ability" ? abilityDetail(key, slot) : LOL_DATA[`${kind}Details`][key];
    const heading = document.createElement("strong");
    heading.id = "game-tip-title";
    heading.className = "game-tip-title";
    el.setAttribute("aria-labelledby", heading.id);
    const asset = LOL_DATA[kind]?.[key];
    const icon = detail?.icon ?? (asset ? lolAsset(asset) : target.querySelector("img")?.src);
    if (icon) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = icon;
      heading.append(img);
    }
    if (kind === "ability") {
      const shortcut = document.createElement("kbd");
      shortcut.textContent = slot;
      heading.append(shortcut);
    }
    heading.append(target.dataset.tipName ?? detail?.name ?? key);
    if (detail?.description) el.prepend(heading, effectText(detail.description, detail.effects));
    else el.prepend(heading);
  }
  el.hidden = false;
  tipTarget = target;
  const {width, height} = el.getBoundingClientRect();
  if (gameTip) {
    target.setAttribute("aria-describedby", el.id);
    const anchor = target.getBoundingClientRect();
    const above = Math.max(0, anchor.top - 8);
    const below = Math.max(0, innerHeight - anchor.bottom - 8);
    const placeAbove = height <= above || (height > below && above >= below);
    const availableHeight = placeAbove ? above : below;
    el.style.maxHeight = availableHeight + "px";
    const left = anchor.left + (anchor.width - width) / 2;
    const top = placeAbove ? anchor.top - Math.min(height, availableHeight) : anchor.bottom;
    el.style.left = Math.max(8, Math.min(left, document.documentElement.clientWidth - width - 8)) + "px";
    el.style.top = Math.max(8, top) + "px";
    return;
  }
  const left = x + 14 + width > innerWidth - 8 ? x - width - 14 : x + 14;
  const top = y + 16 + height > innerHeight - 8 ? y - height - 12 : y + 16;
  el.style.left = Math.max(8, left) + "px";
  el.style.top = Math.max(8, top) + "px";
}
document.addEventListener("mousemove", e => {
  if (tipEl().contains(e.target)) {
    const term = e.target.closest(".effect-term");
    if (term) showDefinition(term);
    return;
  }
  if (definitionTerm !== document.activeElement) hideDefinition();
  const target = e.target.closest?.(tipSelector);
  if (target && target === dismissedGameTip) return;
  dismissedGameTip = undefined;
  if (target) showTip(target, e.clientX, e.clientY);
  else hideTip();
});
document.addEventListener("focusin", e => {
  if (tipEl().contains(e.target)) {
    if (e.target.matches(".effect-term")) showDefinition(e.target);
    return;
  }
  const target = e.target.closest(tipSelector);
  if (!target) return;
  const {left, bottom} = target.getBoundingClientRect();
  dismissedGameTip = undefined;
  showTip(target, left, bottom);
});
document.addEventListener("click", e => {
  const term = e.target.closest?.(".effect-term");
  if (term && tipEl().contains(term)) {
    showDefinition(term);
    return;
  }
  const target = e.target.closest?.("[data-game-tip]");
  if (target) showTip(target);
});
document.addEventListener("focusout", e => {
  if (!e.relatedTarget || (!tipEl().contains(e.relatedTarget) && e.relatedTarget !== tipTarget)) hideTip();
});
document.addEventListener("keydown", e => {
  const panel = tipEl();
  if (e.key === "Tab" && tipTarget?.dataset.gameTip && !panel.hidden) {
    const terms = panel.querySelectorAll(".effect-term");
    if (!e.shiftKey && e.target === tipTarget && terms.length) {
      e.preventDefault();
      terms[0].focus();
      return;
    }
    if ((e.shiftKey && e.target === terms[0]) || (!e.shiftKey && e.target === terms[terms.length - 1])) {
      if (e.shiftKey) e.preventDefault();
      hideDefinition();
      tipTarget.focus({preventScroll: true});
      if (!e.shiftKey) hideTip();
      return;
    }
  }
  if (e.key !== "Escape") return;
  if (panel.contains(e.target)) tipTarget?.focus({preventScroll: true});
  if (tipTarget?.dataset.gameTip) dismissedGameTip = tipTarget;
  hideTip();
});
document.addEventListener("scroll", e => {
  if (e.target !== tipEl()) {
    hideTip();
    return;
  }
  hideDefinition();
  const term = document.activeElement;
  if (e.target.contains(term) && term.matches(".effect-term:focus-visible")) {
    const {top, bottom} = term.getBoundingClientRect();
    const panel = e.target.getBoundingClientRect();
    if (top >= panel.top && bottom <= panel.bottom) showDefinition(term);
  }
}, true);
document.addEventListener("pointerdown", event => {
  if (tipTarget?.dataset.gameTip && !tipTarget.contains(event.target) && !tipEl().contains(event.target)) hideTip();
});
const compositionPopovers = [];
function wireFloatingPicker(trigger, picker, search) {
  const anchor = document.createElement("span");
  trigger.before(anchor);
  const root = createRoot(anchor);
  compositionPopovers.push(root);
  picker.remove();
  picker.hidden = false;
  let open = false;
  const setOpen = next => {
    if (next) for (const other of compositionPopovers) {
      if (other !== root) other.dismiss?.();
    }
    open = next;
    trigger.setAttribute("aria-expanded", String(open));
    root.render(createElement(Popover, { open, onOpenChange: setOpen },
      createElement(PopoverAnchor, { virtualRef: { current: trigger } }),
      createElement(PopoverContent, {
        align: "start", className: "wl-composition-popover", "aria-label": picker.getAttribute("aria-label"),
        onOpenAutoFocus: event => { event.preventDefault(); search().focus(); },
        onCloseAutoFocus: event => event.preventDefault(),
        onInteractOutside: event => {
          if (trigger.contains(event.target)) event.preventDefault();
        },
        onEscapeKeyDown: () => trigger.focus(),
      }, createElement(ExistingContent, { element: picker }))));
  };
  root.dismiss = () => { if (open) setOpen(false); };
  trigger.onclick = () => setOpen(!open);
  return () => { setOpen(false); trigger.focus(); };
}
function showSort(sort) {
  document.querySelectorAll("th button[data-k]").forEach(button => {
    const heading = button.closest("th");
    if (button.dataset.k === sort.k) heading.setAttribute("aria-sort", sort.d < 0 ? "descending" : "ascending");
    else heading.removeAttribute("aria-sort");
  });
}

// KPIs
const topBan=[...C].sort((a,b)=>b.bans-a.bans)[0], topPick=[...C].sort((a,b)=>b.picks-a.picks)[0];
if (topBan && topPick) document.getElementById('kpis').innerHTML=[[G,"jogos"],[C.length,"campeões usados"],[topBan.name,`mais banido · ${pct(topBan.bans/G)}`],[topPick.name,`mais pickado · ${topPick.picks}`]]
 .map(([v,l],i)=>`<div class="wl-panel kpi" data-tip="${["Total de jogos do Play-In até as Semifinais","Campeões que foram pickados ou banidos pelo menos uma vez",`${topBan.name} foi banido em ${topBan.bans} de ${G} jogos`,`${topPick.name} foi escolhido em ${topPick.picks} jogos (${topPick.wins} vitórias)`][i]}"><div class="v">${esc(v)}</div><div class="l">${l}</div></div>`).join("");

const defaultTab = DATASET.source === "soloq" ? "builds" : "geral";
const laneById = new Map(LANES.map(([lane]) => [lane.toLowerCase(), lane]));
let buildChampion = "", buildQuery = "", buildOpponent = "";
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
    buildChampion = (legacyMatchups ? second : first) || "";
    buildOpponent = buildChampion ? params.get("adversario") || "" : "";
    buildQuery = query;
    bLane = legacyMatchups ? laneFromParam(first) : lane || (legacyChampions ? "Top" : "");
    buildMinGames = readBuildMinGames(params.get("minJogos"));
  } else if (id === "comps") {
    cQ = query;
    cTeam = params.get("time") || "";
    cWinsOnly = params.get("vitorias") === "1";
    cSt = params.get("fase") || "";
    cChamps = new Set((params.get("campeoes") || "").split(",").filter(slug => compChampions.has(slug)));
    if (!DATA.comps.some(game => game.b === cTeam || game.r === cTeam)) cTeam = "";
    if (!DATA.comps.some(game => game.st === cSt)) cSt = "";
  }
  render(id);
  if (legacyChampions || legacyMatchups) publishWorlds("builds", buildChampion ? [buildChampion] : [], {posicao:bLane.toLowerCase(), busca:query, minJogos:buildMinGames}, true);
};
function go(id) {
  const lane = laneById.get(id);
  const tab = lane ? "builds" : defaultTab;
  const filters = lane ? {posicao:id} : {};
  window.applyWebLolRoute([worldsPaths[tab].slice(1)], new URLSearchParams(filters));
  publishWorlds(tab, [], filters);
}

let standaloneOverview;
let opponentSelectRoot;
let compActionsRoot;
let compStageRoot;
let buildFiltersRoot;
const buildControlRoots = new Map();

function disposeBuildControls() {
  for (const root of buildControlRoots.values()) root.unmount();
  buildControlRoots.clear();
}

function render(id){
  const previousPage = document.body.dataset.page;
  disposeBuildControls();
  hideTip();
  for (const root of compositionPopovers.splice(0)) root.unmount();
  buildFiltersRoot?.unmount();
  buildFiltersRoot = undefined;
  standaloneOverview?.unmount();
  standaloneOverview = undefined;
  opponentSelectRoot?.unmount();
  opponentSelectRoot = undefined;
  compActionsRoot?.unmount();
  compActionsRoot = undefined;
  compStageRoot?.unmount();
  compStageRoot = undefined;
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:analytics-clear"));
  document.getElementById("kpis").hidden = !!window.frameElement || id !== "geral";
  const builds = id === "builds";
  document.querySelector(".wrap > header").hidden = builds;
  document.querySelector(".wrap > .foot").hidden = builds && DATASET.source === "worlds";
  const v = document.getElementById("view");
  if(id==="geral"){v.innerHTML=overview();wireLaneOverview(v)}
  else if(id==="comps"){v.innerHTML=compsView();wireComps()}
  else if(id==="builds"){v.innerHTML=buildsView();wireBuilds()}
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

function championSummaries() {
  return C.map(({ name, picks, wins, bans }) => {
    const portrait = lolChampion(name)?.portrait;
    return { name, picks, wins, bans, portrait: portrait ? lolAsset(portrait) : undefined };
  });
}

function overview(){
  const lanes = LANES.map(([lane]) => {
    const id = lane.toLowerCase();
    const champions = C.filter(c => c.lanes[lane]).sort((a,b) => b.lanes[lane].picks - a.lanes[lane].picks).slice(0, 5);
    const rows = champions.map(c => {
      const name = esc(c.name);
      const games = c.lanes[lane].picks;
      return `<tr>
        <th scope="row"><span class="lane-champion">${ico(c.name)}<span title="${name}">${name}</span></span></th>
        <td data-tip="${name} jogou ${games} vezes de ${lane}">${games}</td>
        <td>${wrPill(c.wins, c.picks)}</td>
      </tr>`;
    }).join("");
    const href = `./#/builds?fonte=worlds&posicao=${id}`;
    return `<article class="wl-panel lane-card" data-go="${id}">
      <h3 class="wl-card-title" id="lane-title-${id}"><span class="lane-label">${laneIconMarkup(lane)}${lane}</span></h3>
      <table data-slot="table" aria-labelledby="lane-title-${id}">
        <thead><tr><th scope="col">Campeão</th><th scope="col" data-tip="Jogos nesta lane">Jogos</th><th scope="col" data-tip="Taxa de vitória do campeão em todas as posições">Vitórias</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a class="lane-card-link" href="${href}" aria-label="Ver todos os campeões de ${lane}">Ver todos os campeões ${iconMarkup("next")}</a>
    </article>`;
  }).join("");
  return `<div id="analytics-root"></div><section class="lane-overview"><h2>Explore por posição</h2><p class="hint">Mais escolhidos em cada posição. A taxa de vitória considera todos os jogos do campeão.</p><div class="lane-grid">${lanes}</div></section>`;
}

function wireLaneOverview(view) {
  view.querySelector(".lane-grid").onclick = event => {
    const card = event.target.closest(".lane-card");
    if (!card || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(card.dataset.go);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
}

// Builds
let bLane="";
let buildMinGames = 0;
let buildSort = {k:"picks", d:-1};
function readBuildMinGames(value) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}
const compactBuilds = matchMedia("(max-width: 767px)");
const reduceBuildMotion = matchMedia("(prefers-reduced-motion: reduce)");
function syncBuildDetailSpan() {
  document.querySelectorAll<HTMLTableCellElement>(".build-inline-detail:not([hidden]) > td").forEach(cell => {
    cell.colSpan = compactBuilds.matches ? 4 : 8;
  });
}
compactBuilds.addEventListener("change", syncBuildDetailSpan);
const buildLaneIcon = lane => lane ? laneIconMarkup(lane) : iconMarkup("layers");
function positionFilter(lanes, current, label, showNames, change) {
  return createElement(ToggleGroup, {
    type: "single", value: current || "all", spacing: 1, size: "sm",
    className: "build-lane-tabs", "aria-label": label,
    onValueChange: value => { if (value) change(value === "all" ? "" : value); },
  }, lanes.map(lane => createElement(ToggleGroupItem, {
    key: lane, value: lane || "all", title: lane || "Todas as posições",
    "aria-label": lane || "Todas as posições", "data-lane": lane,
    "data-slot": "button", "data-variant": "ghost",
  }, createElement("span", { dangerouslySetInnerHTML: { __html: buildLaneIcon(lane) } }),
  showNames ? lane || "Todas" : null)));
}

function buildsView(){
  return `<section class="builds-page" aria-label="Builds">
  <header class="builds-heading">
    <div><h1>Builds</h1><p class="hint">${DATASET.label} · ${G.toLocaleString("pt-BR")} jogos na base</p></div>
    <div class="build-source-options" role="group" aria-label="Fonte das builds">
      ${[["worlds", "Worlds"], ["soloq", "SoloQ"]].map(([source, label]) =>
        `<button type="button" data-slot="button" data-variant="${source === DATASET.source ? "default" : "ghost"}" data-build-source="${source}" aria-pressed="${source === DATASET.source}">${label}</button>`
      ).join("")}
    </div>
  </header>
  <div class="wl-panel tools"><input data-slot="input" id="bq" type="search" placeholder="Buscar campeão ou item…" aria-label="Buscar campeão ou item">
  <div id="build-lane-filter"></div>
  <label class="build-min-games" for="bmin">Mínimo de jogos <input data-slot="input" id="bmin" type="number" min="0" step="1" inputmode="numeric" value="${buildMinGames}"></label>
  <button id="build-clear-all" type="button" data-slot="button" data-variant="outline">${iconMarkup("reset")} Limpar filtros</button></div>
  <div class="bcards" id="bc"></div></section>`}
function wireBuilds(){
  buildFiltersRoot = createRoot(document.getElementById("build-lane-filter"));
  const q=document.getElementById('bq'),bc=document.getElementById('bc');
  const minimum = document.getElementById("bmin");
  const clearAll = document.getElementById("build-clear-all");
  const hasFilters = () => Boolean(buildQuery || bLane || buildMinGames);
  const list = C.filter(champion => champion.picks > 0);
  const games = champion => buildGameCount(champion, bLane);
  const bySlug = new Map(list.map(champion => [championSlug(champion.name), champion]));
  const detailAnimations = new WeakMap<HTMLElement, ReturnType<typeof animate>>();
  const detailContents = new WeakMap<HTMLElement, { element: HTMLElement, root: ReturnType<typeof createRoot> }>();
  let contextAnimation: ReturnType<typeof animate> | undefined;
  let highlights = "";
  const sortBuildRows = () => {
    const body = bc.querySelector(".builds-table tbody");
    if (!body) return;
    const rows = new Map([...body.querySelectorAll(".build-toggle")].map(button => [button.dataset.buildToggle, button.closest("tr")]));
    const value = c => buildSort.k === "wr" ? c.wins / c.picks : buildSort.k === "picks" ? games(c) : c.bans;
    const ordered = list.filter(c => rows.has(championSlug(c.name)))
      .sort((a,b) => (value(a) - value(b)) * buildSort.d || games(b) - games(a));
    body.append(...ordered.flatMap(c => {
      const row = rows.get(championSlug(c.name));
      return [row, row.nextElementSibling];
    }));
    showSort(buildSort);
  };
  q.value=buildQuery;
  const parts = () => buildChampion ? [buildChampion] : [];
  const filters = () => ({posicao:bLane.toLowerCase(), busca:buildQuery, minJogos:buildMinGames, adversario:buildChampion && buildOpponent});
  const publish = (replace = false) => publishWorlds("builds", parts(), filters(), replace);
  const mountSkillOptions = container => {
    for (const host of container.querySelectorAll(".build-skill-options")) {
      if (buildControlRoots.has(host)) continue;
      const options = [...host.querySelectorAll("[data-skill-sequence]")].map(button => ({
        value: button.dataset.skillSequence, label: button.textContent,
      }));
      const panels = host.closest(".build-skills").querySelectorAll("[data-skill-panel]");
      const root = createRoot(host);
      buildControlRoots.set(host, root);
      const select = value => {
        if (!value) return;
      for (const panel of panels) panel.hidden = panel.dataset.skillPanel !== value;
        root.render(createElement(ToggleGroup, {
          type: "single", value, spacing: 1, "aria-label": "Sequências mais frequentes", onValueChange: select,
        }, options.map(option => createElement(ToggleGroupItem, {
          key: option.value, value: option.value, "data-slot": "button", "data-variant": "outline", "data-size": "sm",
        }, option.label))));
      };
      select("0");
    }
  };
  document.querySelector(".build-source-options").onclick = event => {
    const source = event.target.closest("[data-build-source]")?.dataset.buildSource;
    if (!source || source === DATASET.source) return;
    const expanded = bc.querySelector('.build-toggle[aria-expanded="true"]')?.dataset.buildToggle;
    const path = buildsPath(source, expanded ? [expanded] : parts(), filters());
    if (window.frameElement) window.frameElement.dispatchEvent(new CustomEvent("weblol:navigate", {detail:{path, focusSource:true}}));
    else location.assign("./#" + path);
  };
  const championCard = (champion: typeof C[number], position: string, pageSlug?: string, opponents = []) => {
    const inlineContext = pageSlug
      ? `<section class="build-context build-context-inline" aria-label="Confrontos da build">${buildMatchups(champion, position)}</section>`
      : "";
    const selectedOpponent = opponents.find(opponent => opponent.slug === buildOpponent);
    const gameCount = selectedOpponent?.games ?? buildGameCount(champion, position);
    const multiplePositions = Object.values(champion.lanes).filter(lane => lane.picks).length > 1;
    const positionLabel = position || (multiplePositions ? "Todas as posições" : champion.main);
    const heading = pageSlug ? "" : `<header class="build-card-heading">
        <div>
          <h3>${ico(champion.name)}${esc(champion.name)}</h3>
          <div class="build-card-meta">
            <span>${DATASET.label} · ${gameCount} ${gameCount === 1 ? "jogo" : "jogos"} · ${esc(positionLabel)}</span>
            ${selectedOpponent ? "" : `<span class="build-winrate">${wrPill(champion.wins,champion.picks)} <small>de vitórias ${DATASET.scope}</small></span>`}
          </div>
        </div>
        ${opponents.length ? `<div class="build-opponent-filter">
          <label id="build-opponent-label" for="build-opponent-trigger">Adversário direto</label>
          <div class="team-select" data-build-opponent></div>
        </div>` : ""}
      </header>`;
    const action = pageSlug
      ? `<button class="worlds-detail-action" data-slot="button" data-variant="ghost" data-size="sm" type="button" data-build="${pageSlug}" aria-label="Abrir página da build de ${esc(champion.name)}">Ver página ${iconMarkup("next")}</button>`
      : "";
    return `<article class="bcard${pageSlug ? "" : " wl-panel"}">
      ${heading}
      ${buildDetails(champion, position, action, !pageSlug, selectedOpponent?.slug)}
      ${inlineContext}
    </article>`;
  };
  const draw=(restoreOpponentFocus = false, normalizeRoute = false)=>{const f=q.value.trim().toLowerCase();
    disposeBuildControls();
    opponentSelectRoot?.unmount();
    opponentSelectRoot = undefined;
    contextAnimation?.stop();
    contextAnimation = undefined;
    clearAll.setAttribute("aria-disabled", String(!hasFilters()));
    const matches=buildChampion ? [] : list.filter(c=>
      games(c) > 0 && games(c) >= buildMinGames &&
      buildMatchesQuery(c, bLane, f));
    const selectedChampion = buildChampion ? bySlug.get(buildChampion) : undefined;
    const champion = selectedChampion && games(selectedChampion) > 0 ? selectedChampion : undefined;
    const position = bLane;
    const opponents = champion ? buildOpponentOptions(champion, position) : [];
    if (buildOpponent && !opponents.some(opponent => opponent.slug === buildOpponent)) {
      buildOpponent = "";
      if (normalizeRoute) publish(true);
    }
    const context = champion ? buildMatchups(champion, position) : buildLaneHighlights(matches, bLane);
    highlights = champion ? "" : context;
    const content=champion
      ? championCard(champion, position, undefined, opponents)
      : matches.length ? buildsTable(matches, bLane) : "";
    const availableLanes = selectedChampion
      ? LANES.map(([lane]) => lane).filter(lane => buildGameCount(selectedChampion, lane) > 0)
      : [];
    const back = buildChampion ? `<div class="build-back">
      <button data-slot="button" data-variant="outline" data-size="sm" class="build-route" data-build="">Voltar à lista de builds</button>
      ${selectedChampion ? '<div class="build-detail-lanes"></div>' : ""}
    </div>` : "";
    bc.classList.toggle("build-detail", !!buildChampion);
    bc.innerHTML=back+(content
      ? `<div class="builds-workspace">${content}<aside class="wl-panel build-context build-context-side" aria-label="Contexto da build" aria-live="polite"><div class="build-context-transition"><div class="build-context-content">${context}</div></div></aside></div>`
      : buildChampion ? `<div class="empty-state" role="status"><h3>Sem partidas para esta build</h3><p>A base ${DATASET.label} ainda não tem partidas para este campeão${bLane ? ` na posição ${esc(bLane)}` : ""}.</p></div>`
      : list.length ? '<div class="empty-state" role="status"><h3>Nenhum campeão encontrado</h3><p>Ajuste a busca, a posição ou o mínimo de jogos.</p></div>'
      : '<div class="empty-state" role="status"><h3>Ainda não há partidas coletadas</h3><p>As builds aparecem aqui depois da primeira coleta diária.</p></div>');
    const detailLanes = bc.querySelector(".build-detail-lanes");
    if (detailLanes) {
      const root = createRoot(detailLanes);
      buildControlRoots.set(detailLanes, root);
      root.render(positionFilter(["", ...availableLanes], bLane, "Posição do campeão", true, lane => {
        bLane = lane;
        syncLane();
        draw();
        publish();
        requestAnimationFrame(() => bc.querySelector('.build-detail-lanes [data-state="on"]')?.focus({ preventScroll: true }));
      }));
    }
    mountSkillOptions(bc);
    sortBuildRows();
    const opponentSelect = bc.querySelector("[data-build-opponent]");
    if (opponentSelect) {
      opponentSelectRoot = createRoot(opponentSelect);
      opponentSelectRoot.render(createElement(WorldsOpponentSelect, {
        opponents, value: buildOpponent, restoreFocus: restoreOpponentFocus,
        onChange: value => {
          buildOpponent = value;
          draw(true);
          publish();
        },
      }));
    }
    enhanceAnalyticsUI();
    void hydrateBuildTimelines(bc).then(enhanceAnalyticsUI);
  };
  const setExpanded = (button: HTMLButtonElement, expanded: boolean) => {
    const detail = document.getElementById(button.getAttribute("aria-controls")) as HTMLTableRowElement;
    const cell = detail.cells[0];
    const panel = cell.firstElementChild as HTMLElement;
    const startHeight = detail.hidden ? 0 : panel.getBoundingClientRect().height;
    detailAnimations.get(panel)?.stop();
    detailAnimations.delete(panel);

    if (!expanded && detail.contains(document.activeElement)) button.focus({ preventScroll: true });
    button.setAttribute("aria-expanded", String(expanded));
    detail.inert = !expanded;
    detail.hidden = false;
    const content = detailContents.get(panel);
    flushSync(() => content.root.render(createElement(Collapsible, { open: expanded },
      createElement(CollapsibleContent, { forceMount: true },
        createElement(ExistingContent, { element: content.element })))));
    mountSkillOptions(content.element);
    cell.colSpan = compactBuilds.matches ? 4 : 8;
    panel.style.height = "";
    const endHeight = expanded ? panel.getBoundingClientRect().height : 0;
    const settle = () => {
      detail.hidden = !expanded;
      panel.style.height = "";
      panel.style.overflow = "";
      detailAnimations.delete(panel);
    };
    if (reduceBuildMotion.matches || startHeight === endHeight) {
      settle();
      return;
    }
    panel.style.overflow = "clip";
    panel.style.height = `${startHeight}px`;
    const animation = animate(panel, { height: [`${startHeight}px`, `${endHeight}px`] }, {
      duration: 0.24,
      ease: [0.2, 0.7, 0.25, 1],
      onComplete: settle,
    });
    detailAnimations.set(panel, animation);
  };
  const updateBuildContext = (html: string, trigger: HTMLButtonElement) => {
    const viewport = bc.querySelector<HTMLElement>(".build-context-transition");
    const outgoing = viewport.lastElementChild as HTMLElement;
    const startHeight = viewport.getBoundingClientRect().height;
    const startOpacity = getComputedStyle(outgoing).opacity;
    contextAnimation?.stop();
    contextAnimation = undefined;
    viewport.querySelector(".build-context-outgoing")?.remove();
    viewport.style.height = "";
    viewport.style.overflow = "";

    if (outgoing.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    if (!startHeight || reduceBuildMotion.matches) {
      outgoing.innerHTML = html;
      outgoing.style.opacity = "";
      return;
    }

    const incoming = document.createElement("div");
    incoming.className = "build-context-content";
    incoming.innerHTML = html;
    outgoing.inert = true;
    outgoing.setAttribute("aria-hidden", "true");
    outgoing.classList.add("build-context-outgoing");
    viewport.append(incoming);
    const endHeight = viewport.getBoundingClientRect().height;
    viewport.style.overflow = "clip";
    const animation = animate([
      [viewport, { height: [`${startHeight}px`, `${endHeight}px`] }],
      [outgoing, { opacity: [Number(startOpacity), 0] }, { at: 0 }],
      [incoming, { opacity: [0, 1] }, { at: 0 }],
    ], { defaultTransition: { duration: 0.24, ease: [0.2, 0.7, 0.25, 1] } });
    contextAnimation = animation;
    void animation.then(() => {
      if (contextAnimation !== animation) return;
      outgoing.remove();
      incoming.style.opacity = "";
      viewport.style.height = "";
      viewport.style.overflow = "";
      contextAnimation = undefined;
    });
  };
  const toggleBuild = toggle => {
    const previous=bc.querySelector('.build-toggle[aria-expanded="true"]');
    if(previous)setExpanded(previous,false);
    if(previous===toggle){
      updateBuildContext(highlights, toggle);
      return;
    }
    const champion=bySlug.get(toggle.dataset.buildToggle);
    const context=buildMatchups(champion,bLane);
    const panel = document.getElementById(toggle.getAttribute("aria-controls")).cells[0].firstElementChild;
    if (!detailContents.has(panel)) {
      const element = document.createElement("div");
      element.innerHTML = championCard(champion, bLane, toggle.dataset.buildToggle);
      const root = createRoot(panel);
      buildControlRoots.set(panel, root);
      detailContents.set(panel, { element, root });
    }
    setExpanded(toggle,true);
    updateBuildContext(context, toggle);
    enhanceAnalyticsUI();
  };
  bc.onclick=e=>{
    const more = e.target.closest("[data-show-matchups]");
    if (more) {
      const list = more.nextElementSibling;
      list.hidden = false;
      list.querySelector("button")?.focus({ preventScroll: true });
      more.remove();
      return;
    }
    const view = e.target.closest("[data-timeline-view]") as HTMLButtonElement | null;
    if (view) {
      const section = view.closest(".build-timeline")!;
      section.querySelectorAll<HTMLButtonElement>("[data-timeline-view]").forEach(button => {
        button.setAttribute("aria-pressed", String(button === view));
      });
      section.querySelector<HTMLElement>(".build-timeline-games")!.dataset.view = view.dataset.timelineView;
      return;
    }
    const sort = e.target.closest(".builds-table thead button[data-k]");
    if (sort) {
      const k = sort.dataset.k;
      buildSort = {k, d:buildSort.k === k ? -buildSort.d : -1};
      sortBuildRows();
      return;
    }
    const highlight=e.target.closest("[data-highlight-build]");
    const toggle=highlight ? bc.querySelector(`[data-build-toggle="${highlight.dataset.highlightBuild}"]`)
      : e.target.closest("[data-build-toggle]") ??
        (!e.target.closest("button") && e.target.closest(".build-summary-row")?.querySelector("[data-build-toggle]"));
    if(toggle){
      toggleBuild(toggle);
      if(highlight)toggle.focus({preventScroll:true});
      toggle.scrollIntoView({block:"nearest"});
      return;
    }
    const button=e.target.closest("[data-build]");if(!button)return;
    const previous=buildChampion;
    buildOpponent = "";
    if (button.dataset.buildLane) {
      bLane = button.dataset.buildLane;
      syncLane();
    }
    buildChampion=button.dataset.build;
    draw();publish();
    const next=buildChampion ? bc.querySelector(".build-back button")
      : bc.querySelector(`[data-build-toggle="${previous}"]`);
    (next ?? q).focus();
  };
  q.oninput=()=>{buildQuery=q.value;buildChampion="";draw();publish(true)};
  const syncLane = () => {
    buildFiltersRoot.render(positionFilter(["", ...LANES.map(([lane]) => lane)], bLane,
      "Filtrar por posição", false, lane => {
        bLane = lane;
        buildChampion = "";
        syncLane();
        draw();
        publish();
      }));
  };
  syncLane();
  minimum.oninput = () => {
    if (!minimum.validity.valid || (minimum.value && !Number.isSafeInteger(minimum.valueAsNumber))) return;
    const count = readBuildMinGames(minimum.value);
    if (buildMinGames === count) return;
    buildMinGames = count;
    draw();publish(true);
  };
  minimum.onblur = () => { minimum.value = String(buildMinGames); };
  clearAll.onclick = () => {
    if (!hasFilters()) return;
    q.value = buildQuery = "";
    bLane = "";
    buildMinGames = 0;
    minimum.value = "0";
    syncLane();
    draw();publish();
  };
  draw(false, true);
}

// Matchups
const compChampionLanes = new Map();
for (const game of DATA.comps) {
  for (const [lane, blue, , , red] of game.p) {
    for (const name of [blue, red]) {
      if (!compChampionLanes.has(name)) compChampionLanes.set(name, new Set());
      compChampionLanes.get(name).add(lane);
    }
  }
}
const compChampions = new Map(
  [...compChampionLanes.keys()]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map(name => [championSlug(name), name]),
);
let cTeam="",cQ="",cSt="",cChamps=new Set();
let cWinsOnly = false;
const teamFilterLabel = () => cTeam ? `${teamLogo(cTeam)}<span class="comp-team-name" title="${esc(cTeam)}">${esc(cTeam)}</span>` : "Todos os times";
function compPicker({id, label, value, hint, options, image, search, empty, clear, category}) {
  return `<div class="comp-picker-field"><span>${label}</span>
    <button id="${id}" class="comp-picker-trigger" type="button" data-slot="button" data-variant="outline" aria-haspopup="dialog" aria-expanded="false"${hint ? ` aria-describedby="${hint}"` : ""}>
      <span class="comp-picker-value">${value}</span>${iconMarkup("descending")}
    </button>
    <div id="${id}-picker" class="comp-picker" role="group" aria-label="Filtro de ${label.toLowerCase()}" hidden>
      <input data-slot="input" class="comp-picker-search" type="search" aria-label="${search}" placeholder="${search}">
      <div class="comp-picker-categories" role="group" aria-label="${category.label}">
        <button type="button" data-category="" data-slot="button" data-variant="outline" aria-pressed="true">${category.all}</button>
        ${category.values.map(name => `<button type="button" data-category="${esc(name)}" data-slot="button" data-variant="outline" aria-label="${esc(name)}" title="${esc(name)}" aria-pressed="false">${category.icon ? category.icon(name) : esc(name)}</button>`).join("")}
      </div>
      <div class="comp-picker-grid" role="group" aria-label="${label} disponíveis">
        ${[...options].map(([key, name]) => `<button type="button" data-option="${esc(key)}" data-categories="${esc(category.forName(name).join(","))}" aria-label="${esc(name)}" aria-pressed="false" title="${esc(name)}">${image(name)}<span class="comp-picker-check">${iconMarkup("check")}</span></button>`).join("")}
      </div>
      <p class="comp-filter-hint" role="status" hidden>${empty}</p>
      <div class="comp-picker-actions">
        <button type="button" data-picker-clear data-slot="button" data-variant="ghost">${iconMarkup("reset")} ${clear}</button>
      </div>
    </div>
  </div>`;
}
function compsView(){
  const teams=[...new Set(DATA.comps.flatMap(g=>[g.b,g.r]))].sort();
  return `<section class="worlds-compositions" aria-labelledby="comps-title">
    <div class="comps-intro">
      <h2 id="comps-title">Composições do Worlds</h2>
      <p class="hint">Compare campeões, jogadores e KDA nas cinco rotas de cada partida. A base reúne ${DATA.mgames} jogos com draft completo.</p>
    </div>
    <div class="wl-panel comp-filters" role="group" aria-label="Filtrar jogos">
      <label for="cq">Buscar<input data-slot="input" id="cq" type="search" placeholder="Campeão ou jogador" value="${esc(cQ||"")}"></label>
      ${compPicker({id:"cc", label:"Campeões", value:`${iconMarkup("champion-add")} Escolher campeões`, hint:"cc-hint",
        options:compChampions, image:ico, search:"Buscar campeão", empty:"Nenhum campeão encontrado.", clear:"Limpar seleções",
        category:{label:"Rota jogada no Worlds", all:"Todas", values:LANES.map(([lane]) => lane), icon:laneIconMarkup, forName:name => [...compChampionLanes.get(name)]}})}
      ${compPicker({id:"ct", label:"Times", value:teamFilterLabel(),
        options:teams.map(team => [team, team]), image:teamLogo, search:"Buscar time", empty:"Nenhum time encontrado.", clear:"Todos os times",
        category:{label:"Região", all:"Todas", values:[...new Set(teams.map(teamRegion).filter(Boolean))].sort(), forName:name => [teamRegion(name)]}})}
      <div class="comp-picker-field"><span id="comp-stage-label">Fase</span><div id="comp-stage"></div></div>
      <div id="comp-filter-actions" class="comp-filter-actions"></div>
      <p id="cc-hint" hidden>A partida precisa ter todos os campeões selecionados, em qualquer lado.</p>
      <div id="cc-active" class="comp-filter-chips" role="group" aria-label="Campeões selecionados" hidden></div>
    </div>
    <p class="comp-count" id="cn" role="status"></p>
    <div class="cgrid" id="cl"></div>

  </section>`;
}
function wireCompPicker(id, {isSelected, onSelect, onClear}) {
  const trigger = document.getElementById(id);
  const picker = document.getElementById(`${id}-picker`);
  const search = picker.querySelector("input");
  const grid = picker.querySelector(".comp-picker-grid");
  const categories = picker.querySelector(".comp-picker-categories");
  let category = "";
  const empty = picker.querySelector('[role="status"]');
  const clear = picker.querySelector("[data-picker-clear]");
  const options = [...grid.querySelectorAll("button")].map(button => ({
    button,
    name: lolKey(button.getAttribute("aria-label")),
    code: button.querySelector("[data-team]")?.dataset.team || "",
    categories: button.dataset.categories.split(","),
  }));
  const close = wireFloatingPicker(trigger, picker, () => search);
  const filterOptions = () => {
    const query = lolKey(search.value);
    for (const option of options) {
      const matchesCategory = !category || option.categories.includes(category);
      option.button.hidden = !matchesCategory || !(option.name.includes(query) || option.code.includes(query));
    }
    empty.hidden = options.some(({button}) => !button.hidden);
    grid.scrollTop = 0;
  };
  const setCategory = value => {
    category = value;
    for (const chip of categories.querySelectorAll("button")) {
      chip.setAttribute("aria-pressed", String(chip.dataset.category === category));
    }
    filterOptions();
  };
  categories.onclick = e => {
    const chip = e.target.closest("button[data-category]");
    if (chip) setCategory(chip.dataset.category);
  };
  search.oninput = filterOptions;
  grid.onclick = e => {
    const option = e.target.closest("button[data-option]");
    if (option) onSelect(option.dataset.option);
  };
  clear.onclick = () => {
    if (clear.getAttribute("aria-disabled") !== "true") onClear();
  };
  return {trigger, close, resetBrowseFilters() {
    search.value = "";
    setCategory("");
  }, sync() {
    let hasSelection = false;
    for (const {button} of options) {
      const selected = isSelected(button.dataset.option);
      button.setAttribute("aria-pressed", String(selected));
      hasSelection ||= selected;
    }
    clear.setAttribute("aria-disabled", String(!hasSelection));
  }};
}
type DraftSide = "blue" | "red";
type Draft = {
  firstPick: DraftSide;
  blue: { bans: string[]; picks: string[] };
  red: { bans: string[]; picks: string[] };
};
// Champion order per team comes from Rift Graphs. First pick is checked separately
// against Games of Legends, ChainCC or Liquipedia because it can start on either side.
const drafts: Partial<Record<string, Draft>> = DRAFTS;

function compDraft(game: (typeof DATA.comps)[number], panelId: string) {
  const draft = drafts[`${game.s}:${game.g}`];
  if (!draft) return "";

  const teams = { blue: game.b, red: game.r };
  const codes = { blue: teamCode(game.b), red: teamCode(game.r) };
  const first = draft.firstPick;
  const second = first === "blue" ? "red" : "blue";
  const phases = [
    { label: "Bans · Fase 1", kind: "bans", offset: 0, turns: [0, 1, 0, 1, 0, 1] },
    { label: "Picks · Fase 1", kind: "picks", offset: 0, turns: [0, 1, 1, 0, 0, 1] },
    { label: "Bans · Fase 2", kind: "bans", offset: 3, turns: [1, 0, 1, 0] },
    { label: "Picks · Fase 2", kind: "picks", offset: 3, turns: [1, 0, 0, 1] },
  ] as const;
  const team = (side: DraftSide) => `<div class="match-draft-team" data-side="${side}">
    ${teamLogo(teams[side])}<span><strong>${esc(codes[side])}</strong><small>${esc(teams[side])}</small></span>
  </div>`;
  const entry = (side: DraftSide, name: string, number: number, phase: string, highlight = "") => {
    const step = String(number).padStart(2, "0");
    return `<li class="match-draft-action" data-side="${side}" value="${number}" tabindex="0"${highlight ? " data-highlight" : ""}
      data-tip="${esc(`${step} · ${name} · ${teams[side]} · ${phase}`)}">
      <span class="match-draft-number">${step}</span><span aria-hidden="true">${ico(name)}</span>
      <span class="match-draft-action-info">
        <strong>${esc(name)}</strong>
        <span class="match-draft-action-meta">
          <small aria-label="${esc(teams[side])}">${esc(codes[side])}</small>
          ${highlight ? `<span class="match-draft-highlight">${highlight}</span>` : ""}
        </span>
      </span>
    </li>`;
  };
  let number = 0;
  return `<section class="match-draft" id="${panelId}" aria-labelledby="${panelId}-title" hidden>
    <h3 class="match-draft-title" id="${panelId}-title">Ordem de picks e bans</h3>
    <div class="match-draft-content">
    <div class="match-draft-header">
      ${team("blue")}
      <p class="match-draft-first" data-side="${first}">Primeiro pick <strong>${esc(codes[first])}</strong></p>
      ${team("red")}
    </div>
    <div class="match-draft-modes" role="group" aria-label="Visualização do draft">
      <button type="button" data-slot="button" data-variant="outline" data-draft-mode="order" aria-pressed="true">Em ordem</button>
      <button type="button" data-slot="button" data-variant="outline" data-draft-mode="teams" aria-pressed="false">Por equipe</button>
    </div>
    ${phases.map(({ label, kind, offset, turns }) => {
      const next = { blue: offset, red: offset };
      const actions = turns.map(turn => {
        const side = turn === 0 ? first : second;
        number++;
        const highlight = number === 7 ? "First pick" : number === 20 ? "Last pick" : "";
        return { side, markup: entry(side, draft[side][kind][next[side]++], number, label, highlight) };
      });
      const startingSide = actions[0].side;
      const otherSide = startingSide === "blue" ? "red" : "blue";
      const sides = kind === "picks" && offset === 3
        ? [otherSide, startingSide]
        : [startingSide, otherSide];
      const groups = sides.map(side => ({
        side,
        actions: actions.filter(action => action.side === side),
      }));
      const orderedRows: (typeof actions)[] = [];
      if (kind === "picks") {
        for (const action of actions) {
          const row = orderedRows.at(-1);
          if (row && row[0].side === action.side) row.push(action);
          else orderedRows.push([action]);
        }
      } else {
        orderedRows.push(actions);
      }
      return `<section class="match-draft-phase" data-kind="${kind}" data-phase="${offset === 0 ? 1 : 2}">
        <h4>${label}</h4>
        <div class="match-draft-team-view" hidden>
        ${groups.map(group => `<ol class="match-draft-actions" role="list" aria-label="${esc(teams[group.side])}">${group.actions.map(action => action.markup).join("")}</ol>`).join("")}
        </div>
        <div class="match-draft-order-view">
          ${orderedRows.map(row => `<ol class="match-draft-actions" role="list"${kind === "picks" ? ` aria-label="${esc(teams[row[0].side])}"` : ""}>${row.map(action => action.markup).join("")}</ol>`).join("")}
        </div>
      </section>`;
    }).join("")}
    </div>
  </section>`;
}

function compCard(g, q, champions, index: number){
  const panelId = `match-draft-${index}`;
  const draft = compDraft(g, panelId);
  const hl=(text, selected=false)=>selected || (q && text.toLowerCase().includes(q)) ? `<mark>${esc(text)}</mark>` : esc(text);
  const team=(name, color, won)=>`<div class="match-team" data-side="${color}">
    ${teamLogo(name)}
    <strong class="match-team-name">${esc(name)}${won?`&nbsp;<span class="match-winner" role="img" aria-label="Vencedor" title="Vencedor">${iconMarkup("check")}</span>`:""}</strong>
  </div>`;
  const side=(champion, player, kda, right)=>{
    const pick=`<td class="match-pick"><div class="match-champion">
      ${ico(champion)}<div><strong>${hl(champion, champions.has(champion))}</strong><small>${hl(player)}</small></div>
    </div></td>`;
    const score=`<td class="match-kda" data-tip="Abates / Mortes / Assistências de ${esc(player)}">${kda}</td>`;
    return right ? score+pick : pick+score;
  };
  return `<article class="wl-panel cg">
    <div class="match-card-header">
      <h3 class="match-game">${esc(g.st)} <span aria-hidden="true">·</span> Jogo ${g.g}</h3>
      ${draft ? `<button type="button" class="worlds-detail-action match-draft-toggle" data-slot="button" data-variant="ghost" data-size="sm"
        aria-haspopup="dialog" aria-controls="match-dialog">Ver draft ${iconMarkup("next")}</button>` : ""}
    </div>
    <div class="match-details">
      <div class="match-scoreboard">${team(g.b,"azul",g.bw)}<span class="vs">VS</span>${team(g.r,"vermelho",!g.bw)}</div>
      <table data-slot="table" class="match-lanes" aria-label="Duelos por rota entre ${esc(g.b)} e ${esc(g.r)}">
        <colgroup><col><col class="kda-column"><col class="lane-column"><col class="kda-column"><col></colgroup>
        <thead><tr>
          <th scope="col" aria-label="Campeão e jogador do lado azul">Campeão</th>
          <th scope="col" aria-label="KDA do lado azul">KDA</th>
          <th scope="col">Rota</th>
          <th scope="col" aria-label="KDA do lado vermelho">KDA</th>
          <th scope="col" aria-label="Campeão e jogador do lado vermelho">Campeão</th>
        </tr></thead>
        <tbody>${g.p.map(([l,cb,pb,kb,cr,pr,kr])=>`<tr>${side(cb,pb,kb,false)}<td class="match-lane">${laneIconMarkup(l,true)}</td>${side(cr,pr,kr,true)}</tr>`).join("")}</tbody>
      </table>
    </div>
    ${draft}
  </article>`;
}
function wireComps(){
  const order=g=>{const m=g.s.match(/(\d+)/g)||[];const base=g.s.startsWith('play')?0:g.s.includes('quarter')?200:g.s.includes('semi')?300:g.s.includes('final')?400:100;return base+(+m[0]||0)*10+(+m[1]||0)/100};
  const all=DATA.comps.slice().sort((a,b)=>order(b)-order(a)||a.g-b.g);
  const matchGrid = document.getElementById("cl");

  matchGrid.onclick = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(".match-draft-toggle");
    if (!button) return;
    const card = button.closest(".cg").cloneNode(true) as HTMLElement;
    const panel = card.querySelector<HTMLElement>(".match-draft");
    const title = panel.querySelector<HTMLElement>(".match-draft-title");
    panel.id = "active-match-draft";
    title.id = "active-match-draft-title";
    panel.setAttribute("aria-labelledby", title.id);
    panel.hidden = false;
    const closeButton = card.querySelector<HTMLButtonElement>(".match-draft-toggle");
    closeButton.removeAttribute("aria-haspopup");
    closeButton.removeAttribute("aria-controls");
    closeButton.classList.remove("worlds-detail-action");
    closeButton.classList.replace("match-draft-toggle", "match-dialog-close");
    closeButton.dataset.variant = "ghost";
    closeButton.dataset.size = "icon-lg";
    closeButton.setAttribute("aria-label", "Fechar draft");
    closeButton.innerHTML = iconMarkup("close");
    closeButton.onclick = () => closeDraft();
    const controls = document.createElement("div");
    controls.className = "match-dialog-controls";
    controls.append(closeButton);
    const content = document.createElement("div");
    content.append(controls, card);
    let closeDraft;
    closeDraft = showDialog({ title: "Detalhes da partida e draft", children: content,
      className: "match-dialog", initialFocus: () => closeButton });
    const modeButtons = panel.querySelectorAll<HTMLButtonElement>("[data-draft-mode]");
    for (const mode of modeButtons) {
      mode.onclick = () => {
        const chronological = mode.dataset.draftMode === "order";
        for (const button of modeButtons) button.setAttribute("aria-pressed", String(button === mode));
        for (const view of panel.querySelectorAll<HTMLElement>(".match-draft-team-view")) view.hidden = chronological;
        for (const view of panel.querySelectorAll<HTMLElement>(".match-draft-order-view")) view.hidden = !chronological;
      };
    }
  };
  const activeChampions = document.getElementById("cc-active");
  const search = document.getElementById("cq");
  const stages = [...new Set(all.map(game => game.st))];
  compStageRoot = createRoot(document.getElementById("comp-stage"));
  const drawStage = () => {
    compStageRoot.render(createElement(Select, {
      value: cSt || "all",
      onValueChange: value => {
        cSt = value === "all" ? "" : value;
        drawStage();
        updateResults();
      },
    },
    createElement(SelectTrigger, {
      id: "cs",
      className: "comp-picker-trigger comp-stage-trigger",
      "data-slot": "button",
      "data-variant": "outline",
      "aria-labelledby": "comp-stage-label cs",
    }, createElement(SelectValue)),
    createElement(SelectContent, {
      className: "team-select-panel",
      position: "popper",
      align: "start",
      collisionPadding: 8,
    },
    createElement(SelectGroup, null, createElement(SelectItem, { value: "all" }, "Todas as fases"),
    ...stages.map(stage => createElement(SelectItem, { key: stage, value: stage }, stage))))));
  };
  const hasFilters = () => Boolean(cQ || cTeam || cSt || cChamps.size || cWinsOnly);
  compActionsRoot = createRoot(document.getElementById("comp-filter-actions"));
  const drawActions = () => {
    compActionsRoot.render([
      createElement("label", { key: "wins", className: "comp-wins-label" },
      createElement(Checkbox, {
        className: "comp-wins-check",
        checked: cWinsOnly,
        "aria-describedby": "cc-hint",
        onCheckedChange: checked => {
          cWinsOnly = checked === true;
          updateResults();
        },
      }),
      "Só vitórias",
      ),
      createElement(Button, {
        key: "clear",
        id: "comp-clear-all",
        variant: "ghost",
        size: "sm",
        "aria-label": "Limpar todos os filtros",
        "aria-disabled": !hasFilters(),
        onClick: clearFilters,
      },
      createElement("svg", { className: "icon", "aria-hidden": true },
        createElement("use", { href: "assets/icons.svg#reset" })),
      "Limpar"),
    ]);
  };
  const drawChampions = () => {
    championPicker.sync();
    activeChampions.hidden = cChamps.size === 0;
    activeChampions.innerHTML = [...cChamps].map(slug => {
      const name = compChampions.get(slug);
      return `<button type="button" data-slot="button" data-variant="outline" data-champion="${slug}" aria-label="Remover ${esc(name)} do filtro">${ico(name)}${esc(name)}${iconMarkup("close")}</button>`;
    }).join("");
  };
  const draw=()=>{
    drawActions();
    const q=(cQ||"").trim().toLowerCase();
    const champions = [...cChamps].map(slug => compChampions.get(slug));
    document.getElementById("cc-hint").textContent = cWinsOnly
      ? "Os campeões selecionados, o time e a busca precisam corresponder ao lado vencedor."
      : "A partida precisa ter todos os campeões selecionados, em qualquer lado.";
    const L = all.filter(g => {
      const championColumns = cWinsOnly ? [g.bw ? 1 : 4] : [1, 4];
      const teamMatches = cWinsOnly ? (g.bw ? g.b : g.r) === cTeam : g.b === cTeam || g.r === cTeam;
      return (!cTeam || teamMatches) &&
        (!cSt || g.st === cSt) &&
        champions.every(name => g.p.some(row => championColumns.some(column => row[column] === name))) &&
        (!q || g.p.some(row => championColumns.some(column =>
          row[column].toLowerCase().includes(q) || row[column + 1].toLowerCase().includes(q)
        )));
    });
    let extra="";
    if(cTeam){const w=L.filter(g=>(g.b===cTeam)===g.bw).length;extra=`<span>${esc(cTeam)} · ${w} vitórias · ${L.length-w} derrotas</span>`}
    document.getElementById('cn').innerHTML=`<strong>${L.length} jogo${L.length===1?'':'s'}</strong>${extra}`;
    const highlightedChampions = new Set(champions);
    matchGrid.innerHTML=L.map((g,index)=>compCard(g,q,highlightedChampions,index)).join("")||'<div class="empty-state"><h3>Nenhum jogo encontrado</h3><p>Remova um campeão ou ajuste os outros filtros para ver mais partidas.</p></div>';
  };
  const publish = (replace = false) => publishWorlds("comps", [], {time:cTeam, fase:cSt, busca:cQ, campeoes:[...cChamps].join(","), vitorias:cWinsOnly ? "1" : ""}, replace);
  const updateResults = () => {
    draw();
    enhanceAnalyticsUI();
    publish();
  };
  const updateChampions = () => {
    drawChampions();
    updateResults();
  };
  const championPicker = wireCompPicker("cc", {
    isSelected: slug => cChamps.has(slug),
    onSelect: slug => {
      if (cChamps.has(slug)) cChamps.delete(slug);
      else cChamps.add(slug);
      updateChampions();
    },
    onClear: () => {
      cChamps.clear();
      updateChampions();
    },
  });
  const drawTeam = () => {
    teamPicker.trigger.querySelector(".comp-picker-value").innerHTML = teamFilterLabel();
    teamPicker.sync();
  };
  const selectTeam = team => {
    cTeam = team;
    drawTeam();
    teamPicker.close();
    updateResults();
  };
  const teamPicker = wireCompPicker("ct", {
    isSelected: team => team === cTeam,
    onSelect: selectTeam,
    onClear: () => selectTeam(""),
  });
  activeChampions.onclick = e => {
    const button = e.target.closest("button[data-champion]");
    if (!button) return;
    cChamps.delete(button.dataset.champion);
    updateChampions();
    championPicker.trigger.focus();
  };
  search.oninput = () => { cQ=search.value; draw(); enhanceAnalyticsUI(); publish(true); };
  function clearFilters() {
    if (!hasFilters()) return;
    search.value = cQ = "";
    cSt = "";
    drawStage();
    cTeam = "";
    cWinsOnly = false;
    cChamps.clear();
    championPicker.resetBrowseFilters();
    teamPicker.resetBrowseFilters();
    drawTeam();
    updateChampions();
  }
  teamPicker.sync();
  drawChampions();
  drawStage();
  draw();
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

function enhanceAnalyticsUI() {
  document.querySelectorAll(".tablewrap:not(.builds-table-wrap)").forEach(el => {
    el.tabIndex = 0; el.setAttribute("role", "region");
    el.setAttribute("aria-label", el.classList.contains("mu-table")
      ? "Tabela de confrontos. Role para ver todas as linhas e colunas."
      : "Tabela de estatísticas. Role horizontalmente para ver todas as colunas.");
  });
  document.querySelectorAll("tr.main").forEach(el => el.setAttribute("aria-expanded", String(el.classList.contains("open"))));
  document.querySelectorAll("[data-tip]").forEach(el => {
    if (el.matches(".item,.rune-token,.preview-item")) el.tabIndex = 0;
    el.setAttribute("aria-describedby", "tip");
  });
}
