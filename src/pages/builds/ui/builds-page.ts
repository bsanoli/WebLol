// @ts-nocheck -- Integração legada com o DOM; os módulos extraídos mantêm seus tipos próprios.
import { createElement } from "react"
import { createRoot } from "react-dom/client"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group"
import { Collapsible, CollapsibleContent } from "@/shared/ui/collapsible"
import { ExistingContent } from "@/shared/ui/dialog-controls"
import { animate } from "motion"
import { flushSync } from "react-dom"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { buildDetails, buildGameCount, buildLaneHighlights, buildMatchesQuery, buildMatchups, buildsTable, hydrateBuildTimelines, MATCHUP_PAGE_SIZE } from "./build-details"
import { buildOpponentOptions } from "../model/build-statistics"
import { WorldsOpponentSelect } from "./opponent-select"
import { ico } from "@/entities/champion"
import { LANES, wrPill, esc, championSlug } from "@/entities/match"
import DATA from "@dataset/summary"
import { DATASET } from "@/shared/config/dataset"
import { enhanceAnalyticsUI, showSort } from "@/shared/lib/analytics-dom";
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
const { games: G, champs: C } = DATA;
let buildChampion = "", buildQuery = "", buildOpponent = "";
let opponentSelectRoot, buildFiltersRoot;
const buildControlRoots = new Map();
function disposeBuildControls() {
  for (const root of buildControlRoots.values()) root.unmount();
  buildControlRoots.clear();
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
function wireBuilds({ publishWorlds, buildsPath }){
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
  let matchupCardAnimation: Animation | undefined;
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
        <div class="build-card-filters">
          <div class="build-detail-lanes"></div>
          ${opponents.length ? `<div class="build-opponent-filter">
            <label id="build-opponent-label" for="build-opponent-trigger">Adversário direto</label>
            <div class="team-select" data-build-opponent></div>
          </div>` : ""}
        </div>
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
    const availableLanes = selectedChampion
      ? LANES.map(([lane]) => lane).filter(lane => buildGameCount(selectedChampion, lane) > 0)
      : [];
    const defaultLane = availableLanes.reduce((best, lane) =>
      !best || buildGameCount(selectedChampion, lane) > buildGameCount(selectedChampion, best) ? lane : best, "");
    const champion = selectedChampion && games(selectedChampion) > 0 ? selectedChampion : undefined;
    const position = bLane || defaultLane;
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
    const back = buildChampion ? `<div class="build-back">
      <button data-slot="button" data-variant="outline" data-size="sm" class="build-route" data-build="">${iconMarkup("previous")} Voltar à lista de builds</button>
      ${selectedChampion && !champion ? '<div class="build-detail-lanes"></div>' : ""}
    </div>` : "";
    bc.classList.toggle("build-detail", !!buildChampion);
    bc.innerHTML=back+(content
      ? `<div class="builds-workspace">${content}<aside class="wl-panel build-context build-context-side" aria-label="Contexto da build" aria-live="polite"><div class="build-context-transition"><div class="build-context-content">${context}</div></div></aside></div>`
      : buildChampion ? `<div class="empty-state" role="status"><h3>Sem partidas para esta build</h3><p>A base ${DATASET.label} ainda não tem partidas para este campeão${bLane ? ` na posição ${esc(bLane)}` : ""}.</p></div>`
      : list.length ? '<div class="empty-state" role="status"><h3>Nenhum campeão encontrado</h3><p>Ajuste a busca, a posição ou o mínimo de jogos.</p></div>'
      : '<div class="empty-state" role="status"><h3>Ainda não há partidas coletadas</h3><p>As builds aparecem aqui depois da primeira coleta diária.</p></div>');
    const detailLanes = bc.querySelector(".build-detail-lanes");
    if (detailLanes && availableLanes.length > (champion ? 1 : 0)) {
      const root = createRoot(detailLanes);
      buildControlRoots.set(detailLanes, root);
      root.render(positionFilter(availableLanes, position, "Posição do campeão", false, lane => {
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
    matchupCardAnimation?.cancel();
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
    const matchupSummary = e.target.closest(".build-context-side .build-matchup-group > summary");
    if (matchupSummary) {
      matchupCardAnimation?.cancel();
      const group = matchupSummary.parentElement;
      const card = group.closest(".build-context-side");
      if (!group.open || reduceBuildMotion.matches || card.scrollHeight <= card.clientHeight
        || !CSS.supports("interpolate-size", "allow-keywords")) return;

      const contentHeight = parseFloat(getComputedStyle(group, "::details-content").blockSize);
      const startHeight = card.offsetHeight;
      const endHeight = card.scrollHeight - contentHeight + startHeight - card.clientHeight;
      if (endHeight < startHeight) {
        // Animate the viewport cap in sync with the native details transition.
        const styles = getComputedStyle(card);
        matchupCardAnimation = card.animate(
          { maxBlockSize: [`${startHeight}px`, `${Math.ceil(endHeight)}px`] },
          {
            duration: parseFloat(styles.getPropertyValue("--wl-motion-panel")),
            easing: styles.getPropertyValue("--build-matchup-close-ease").trim(),
          },
        );
      }
      return;
    }
    const page = e.target.closest("[data-show-matchup-page]");
    if (page) {
      const hiddenRows = [...page.previousElementSibling.querySelectorAll("li[hidden]")];
      const nextRows = hiddenRows.slice(0, MATCHUP_PAGE_SIZE);
      nextRows.forEach(row => { row.hidden = false; });
      nextRows[0]?.querySelector("button")?.focus({ preventScroll: true });

      const remaining = hiddenRows.length - nextRows.length;
      if (remaining) {
        page.firstElementChild.textContent = `Ver mais ${Math.min(MATCHUP_PAGE_SIZE, remaining)}`;
      } else {
        page.remove();
      }
      return;
    }
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

export function setBuildRoute({ champion, opponent, query, lane, minGames }) {
  buildChampion = champion;
  buildOpponent = champion ? opponent : "";
  buildQuery = query;
  bLane = lane;
  buildMinGames = readBuildMinGames(minGames);
  return buildMinGames;
}
export function disposeBuilds() {
  disposeBuildControls();
  buildFiltersRoot?.unmount();
  buildFiltersRoot = undefined;
  opponentSelectRoot?.unmount();
  opponentSelectRoot = undefined;
}
export { buildsView, wireBuilds };
