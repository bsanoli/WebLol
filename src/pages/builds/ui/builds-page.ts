import { createRoot, type Root } from "react-dom/client"
import { buildGameCount, buildsTable, doesBuildMatchQuery, sortBuildRows } from "./builds-table"
import { buildLaneHighlights, buildMatchups } from "./build-matchups"
import { hydrateBuildTimelines } from "./load-build-timeline"
import { buildOpponentOptions } from "../model/build-statistics"
import { discardFailedEncounters } from "../model/encounters"
import { loadOpponentEncounters } from "./build-opponent-loading"
import { switchBuildSource } from "./build-source-switch"
import { mountOpponentSelect } from "./opponent-select"
import { LANES, championSlug } from "@/entities/match"
import DATA from "@dataset/summary"
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom"
import { positionFilter, toLane, type Lane } from "./position-filter"
import { $ } from "@/shared/lib/dom"
import { buildControlRoots, disposeBuildControls, mountSkillOptions } from "./build-controls"
import { createBuildContextMotion } from "./build-context-motion"
import { createBuildDetailPanels } from "./build-detail-panels"
import { didHandleListClick } from "./build-list-interactions"
import { championCard } from "./build-card"
import { renderBuildsResults, renderBuildsView } from "./builds-view"

const { champs: C } = DATA
let buildChampion = "",
  buildQuery = "",
  buildOpponent = ""
let opponentSelectRoot: Root | undefined
let buildFiltersRoot: Root | undefined
type BuildFilters = Record<string, string | number | null | undefined>
type BuildRouteDeps = {
  publishWorlds: (id: "builds", parts: string[], filters: BuildFilters, shouldReplace?: boolean) => void
  buildsPath: (source: string, parts: string[], filters: BuildFilters) => string
}

// Builds
let bLane: Lane = ""
let buildMinGames = 0
let buildSort = { k: "picks", d: -1 }
function readBuildMinGames(value: string | null) {
  const count = Number(value)
  return Number.isSafeInteger(count) && count > 0 ? count : 0
}
function buildsView() {
  return renderBuildsView(buildMinGames)
}
function wireBuilds({ publishWorlds, buildsPath }: BuildRouteDeps) {
  buildFiltersRoot = createRoot($("#build-lane-filter"))
  const q = $<HTMLInputElement>("#bq")
  const bc = $("#bc")
  const minimum = $<HTMLInputElement>("#bmin")
  const clearAll = $("#build-clear-all")
  const resultCount = $("#build-results-count")
  const hasFilters = () => Boolean(buildQuery || bLane || buildMinGames)
  const list = C.filter(champion => champion.picks > 0)
  const games = (champion: (typeof C)[number]) => buildGameCount(champion, bLane)
  const bySlug = new Map(list.map(champion => [championSlug(champion.name), champion]))
  const { createDetailContent, hasDetailContent, setExpanded } = createBuildDetailPanels()
  const { updateBuildContext, stopContextAnimation, animateMatchupGroupToggle } = createBuildContextMotion(bc)
  let highlights = ""
  const sortRows = () => sortBuildRows(bc, list, games, buildSort)
  q.value = buildQuery
  const parts = () => (buildChampion ? [buildChampion] : [])
  const filters = () => ({
    posicao: bLane.toLowerCase(),
    busca: buildQuery,
    minJogos: buildMinGames,
    adversario: buildChampion && buildOpponent,
  })
  const publish = (shouldReplace = false) => publishWorlds("builds", parts(), filters(), shouldReplace)
  $(".build-source-options").onclick = event =>
    switchBuildSource(event, source => {
      const expanded = bc.querySelector<HTMLElement>('.build-toggle[aria-expanded="true"]')?.dataset.buildToggle
      return buildsPath(source, expanded ? [expanded] : parts(), filters())
    })
  const draw = (shouldRestoreOpponentFocus = false, shouldNormalizeRoute = false) => {
    const f = q.value.trim().toLowerCase()
    disposeBuildControls()
    opponentSelectRoot?.unmount()
    opponentSelectRoot = undefined
    stopContextAnimation()
    clearAll.setAttribute("aria-disabled", String(!hasFilters()))
    const matches = buildChampion
      ? []
      : list.filter(c => games(c) > 0 && games(c) >= buildMinGames && doesBuildMatchQuery(c, bLane, f))
    const countLabel = matches.length
      ? `${matches.length.toLocaleString("pt-BR")} ${matches.length === 1 ? "campeão" : "campeões"}`
      : ""
    if (resultCount.textContent !== countLabel) resultCount.textContent = countLabel
    const selectedChampion = buildChampion ? bySlug.get(buildChampion) : undefined
    const availableLanes = selectedChampion
      ? LANES.map(([lane]) => toLane(lane)).filter(lane => buildGameCount(selectedChampion, lane) > 0)
      : []
    const defaultLane = selectedChampion
      ? availableLanes.reduce<Lane>(
          (best, lane) =>
            !best || buildGameCount(selectedChampion, lane) > buildGameCount(selectedChampion, best) ? lane : best,
          "",
        )
      : ""
    const champion = selectedChampion && games(selectedChampion) > 0 ? selectedChampion : undefined
    const position = bLane || defaultLane
    const opponents = champion ? buildOpponentOptions(champion, position) : []
    if (buildOpponent && !opponents.some(opponent => opponent.slug === buildOpponent)) {
      buildOpponent = ""
      if (shouldNormalizeRoute) publish(true)
    }
    if (champion && buildOpponent) {
      loadOpponentEncounters(
        champion.name,
        () => `${buildChampion}/${buildOpponent}`,
        () => draw(shouldRestoreOpponentFocus),
      )
    }
    const context = champion ? buildMatchups(champion, position) : buildLaneHighlights(matches, bLane)
    highlights = champion ? "" : context
    const content = champion
      ? championCard({ champion, position, opponents, opponent: buildOpponent })
      : matches.length
        ? buildsTable(matches, bLane)
        : ""
    bc.classList.toggle("build-detail", !!buildChampion)
    bc.innerHTML = renderBuildsResults({
      hasChampion: !!buildChampion,
      hasMissingBuild: !!selectedChampion && !champion,
      content,
      context,
      lane: bLane,
      hasChampions: list.length > 0,
    })
    const detailLanes = bc.querySelector(".build-detail-lanes")
    if (detailLanes && availableLanes.length > (champion ? 1 : 0)) {
      const root = createRoot(detailLanes)
      buildControlRoots.set(detailLanes, root)
      root.render(
        positionFilter(availableLanes, position, "Posição do campeão", false, lane => {
          bLane = toLane(lane)
          syncLane()
          draw()
          publish()
          requestAnimationFrame(() =>
            bc.querySelector<HTMLElement>('.build-detail-lanes [data-state="on"]')?.focus({ preventScroll: true }),
          )
        }),
      )
    }
    mountSkillOptions(bc)
    sortRows()
    const opponentSelect = bc.querySelector<HTMLElement>("[data-build-opponent]")
    if (opponentSelect) {
      opponentSelectRoot = mountOpponentSelect(opponentSelect, {
        opponents,
        value: buildOpponent,
        restoreFocus: shouldRestoreOpponentFocus,
        onChange: value => {
          if (champion) discardFailedEncounters(champion.name)
          buildOpponent = value
          draw(true)
          publish()
        },
      })
    }
    enhanceAnalyticsUI()
    hydrateBuildTimelines(bc)
  }
  const toggleBuild = (toggle: HTMLButtonElement) => {
    const previous = bc.querySelector<HTMLButtonElement>('.build-toggle[aria-expanded="true"]')
    if (previous) setExpanded(previous, false)
    if (previous === toggle) {
      updateBuildContext(highlights, toggle)
      return
    }
    const champion = bySlug.get(toggle.dataset.buildToggle ?? "")
    const panel = (document.getElementById(toggle.getAttribute("aria-controls") ?? "") as HTMLTableRowElement | null)
      ?.cells[0]?.firstElementChild as HTMLElement | null | undefined
    if (!champion || !panel) return
    const context = buildMatchups(champion, bLane)
    if (!hasDetailContent(panel)) {
      const html = championCard({
        champion,
        position: bLane,
        pageSlug: toggle.dataset.buildToggle,
        opponent: buildOpponent,
      })
      createDetailContent(panel, html, root => buildControlRoots.set(panel, root))
    }
    setExpanded(toggle, true)
    updateBuildContext(context, toggle)
    enhanceAnalyticsUI()
  }
  bc.onclick = e => {
    const target = e.target as Element
    const matchupSummary = target.closest(".build-context-side .build-matchup-group > summary")
    if (matchupSummary) {
      animateMatchupGroupToggle(matchupSummary)
      return
    }
    if (didHandleListClick(target)) return
    const sort = target.closest<HTMLElement>(".builds-table thead button[data-k]")
    if (sort) {
      const k = sort.dataset.k ?? ""
      buildSort = { k, d: buildSort.k === k ? -buildSort.d : -1 }
      sortRows()
      return
    }
    const highlight = target.closest<HTMLElement>("[data-highlight-build]")
    const toggle = highlight
      ? bc.querySelector<HTMLButtonElement>(`[data-build-toggle="${highlight.dataset.highlightBuild}"]`)
      : (target.closest<HTMLButtonElement>("[data-build-toggle]") ??
        (target.closest("button")
          ? null
          : target.closest(".build-summary-row")?.querySelector<HTMLButtonElement>("[data-build-toggle]")))
    if (toggle) {
      toggleBuild(toggle)
      if (highlight) toggle.focus({ preventScroll: true })
      toggle.scrollIntoView({ block: "nearest" })
      return
    }
    const button = target.closest<HTMLElement>("[data-build]")
    if (!button) return
    const previous = buildChampion
    buildOpponent = ""
    if (button.dataset.buildLane) {
      bLane = toLane(button.dataset.buildLane)
      syncLane()
    }
    buildChampion = button.dataset.build ?? ""
    draw()
    publish()
    const next = buildChampion
      ? bc.querySelector<HTMLElement>(".build-back button")
      : bc.querySelector<HTMLElement>(`[data-build-toggle="${previous}"]`)
    ;(next ?? q).focus()
  }
  q.oninput = () => {
    buildQuery = q.value
    buildChampion = ""
    draw()
    publish(true)
  }
  const syncLane = () => {
    buildFiltersRoot?.render(
      positionFilter(["", ...LANES.map(([lane]) => lane)], bLane, "Filtrar por posição", false, lane => {
        bLane = toLane(lane)
        buildChampion = ""
        syncLane()
        draw()
        publish()
      }),
    )
  }
  syncLane()
  minimum.oninput = () => {
    if (!minimum.validity.valid || (minimum.value && !Number.isSafeInteger(minimum.valueAsNumber))) return
    const count = readBuildMinGames(minimum.value)
    if (buildMinGames === count) return
    buildMinGames = count
    draw()
    publish(true)
  }
  minimum.onblur = () => {
    minimum.value = String(buildMinGames)
  }
  clearAll.onclick = () => {
    if (!hasFilters()) return
    q.value = buildQuery = ""
    bLane = ""
    buildMinGames = 0
    minimum.value = "0"
    syncLane()
    draw()
    publish()
  }
  draw(false, true)
}

export function setBuildRoute({
  champion,
  opponent,
  query,
  lane,
  minGames,
}: {
  champion: string
  opponent: string
  query: string
  lane: string
  minGames: string | null
}) {
  buildChampion = champion
  buildOpponent = champion ? opponent : ""
  buildQuery = query
  bLane = toLane(lane)
  buildMinGames = readBuildMinGames(minGames)
  return buildMinGames
}
export function disposeBuilds() {
  disposeBuildControls()
  buildFiltersRoot?.unmount()
  buildFiltersRoot = undefined
  opponentSelectRoot?.unmount()
  opponentSelectRoot = undefined
}
export { buildsView, wireBuilds }
