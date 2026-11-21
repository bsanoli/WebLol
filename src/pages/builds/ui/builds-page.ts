import { isEmbedded, navigateHost } from "@/shared/host-bridge"
import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group"
import { Collapsible, CollapsibleContent } from "@/shared/ui/collapsible"
import { ExistingContent } from "@/shared/ui/dialog-controls"
import { animate } from "motion"
import { flushSync } from "react-dom"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import {
  buildDetails,
  buildGameCount,
  buildLaneHighlights,
  buildMatchesQuery,
  buildMatchups,
  buildsTable,
  MATCHUP_PAGE_SIZE,
} from "./build-details"
import { hydrateBuildTimelines } from "./load-build-timeline"
import { type Champion, buildOpponentOptions, championBuild } from "../model/build-statistics"
import { WorldsOpponentSelect } from "./opponent-select"
import { ico } from "@/entities/champion"
import { LANES, wrPill, esc, championSlug } from "@/entities/match"
import DATA from "@dataset/summary"
import { DATASET } from "@/shared/dataset"
import { enhanceAnalyticsUI, showSort } from "@/shared/lib/analytics-dom"
import { revealContent } from "@/shared/lib/motion"
import { showBuildOption } from "./build-options"
import { positionFilter, toLane, type Lane } from "./position-filter"
import { $ } from "@/shared/lib/dom"

const { games: G, champs: C } = DATA
let buildChampion = "",
  buildQuery = "",
  buildOpponent = ""
let opponentSelectRoot: Root | undefined
let buildFiltersRoot: Root | undefined
const buildControlRoots = new Map<Element, Root>()
type Opponent = ReturnType<typeof buildOpponentOptions>[number]
type BuildFilters = Record<string, string | number | null | undefined>
type BuildRouteDeps = {
  publishWorlds: (id: "builds", parts: string[], filters: BuildFilters, replace?: boolean) => void
  buildsPath: (source: string, parts: string[], filters: BuildFilters) => string
}
function disposeBuildControls() {
  for (const root of buildControlRoots.values()) root.unmount()
  buildControlRoots.clear()
}

// Builds
let bLane: Lane = ""
let buildMinGames = 0
let buildSort = { k: "picks", d: -1 }
function readBuildMinGames(value: string | null) {
  const count = Number(value)
  return Number.isSafeInteger(count) && count > 0 ? count : 0
}
const compactBuilds = matchMedia("(max-width: 767px)")
const reduceBuildMotion = matchMedia("(prefers-reduced-motion: reduce)")
function syncBuildDetailSpan() {
  document.querySelectorAll<HTMLTableCellElement>(".build-inline-detail:not([hidden]) > td").forEach(cell => {
    cell.colSpan = compactBuilds.matches ? 4 : 8
  })
}
compactBuilds.addEventListener("change", syncBuildDetailSpan)
function buildsView() {
  const gameSource = DATASET.source === "soloq" ? `de ${DATASET.label}` : "na base"
  return `<section class="builds-page" aria-label="Builds">
  <header class="builds-heading">
    <div><h1>Builds</h1><p class="hint">${G.toLocaleString("pt-BR")} jogos ${gameSource}</p></div>
    <div class="build-source-options" role="group" aria-label="Fonte das builds">
      ${[
        ["soloq", "SoloQ"],
        ["worlds", "Worlds"],
      ]
        .map(
          ([source, label]) =>
            `<button type="button" data-slot="button" data-variant="${source === DATASET.source ? "default" : "ghost"}" data-build-source="${source}" aria-pressed="${source === DATASET.source}">${label}</button>`,
        )
        .join("")}
    </div>
  </header>
  <div class="wl-panel tools" role="group" aria-label="Filtros de builds">
  <label class="build-filter-field build-search" for="bq">Buscar campeão ou item<input data-slot="input" id="bq" type="search" placeholder="Ex.: Ahri ou Eclipse"></label>
  <div class="build-filter-field"><span aria-hidden="true">Posição</span><div id="build-lane-filter"></div></div>
  <label class="build-filter-field build-min-games" for="bmin">Mínimo de jogos <input data-slot="input" id="bmin" type="number" min="0" step="1" inputmode="numeric" value="${buildMinGames}"></label>
  <button id="build-clear-all" type="button" data-slot="button" data-variant="ghost">${iconMarkup("reset")} Limpar filtros</button></div>
  <p id="build-results-count" class="build-results-count" role="status"></p>
  <div class="bcards" id="bc"></div></section>`
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
  const games = (champion: Champion) => buildGameCount(champion, bLane)
  const bySlug = new Map(list.map(champion => [championSlug(champion.name), champion]))
  const detailAnimations = new WeakMap<HTMLElement, ReturnType<typeof animate>>()
  const detailContents = new WeakMap<HTMLElement, { element: HTMLElement; root: ReturnType<typeof createRoot> }>()
  let contextAnimation: ReturnType<typeof animate> | undefined
  let matchupCardAnimation: Animation | undefined
  let highlights = ""
  const sortBuildRows = () => {
    const body = bc.querySelector(".builds-table tbody")
    if (!body) return
    const rows = new Map(
      [...body.querySelectorAll<HTMLElement>(".build-toggle")].flatMap(button => {
        const row = button.closest("tr")
        return row ? [[button.dataset.buildToggle ?? "", row] as const] : []
      }),
    )
    const value = (c: Champion) =>
      buildSort.k === "wr" ? c.wins / c.picks : buildSort.k === "picks" ? games(c) : c.bans
    const ordered = list
      .filter(c => rows.has(championSlug(c.name)))
      .sort((a, b) => (value(a) - value(b)) * buildSort.d || games(b) - games(a))
    body.append(
      ...ordered.flatMap(c => {
        const row = rows.get(championSlug(c.name))
        if (!row) return []
        return row.nextElementSibling ? [row, row.nextElementSibling] : [row]
      }),
    )
    showSort(buildSort)
  }
  q.value = buildQuery
  const parts = () => (buildChampion ? [buildChampion] : [])
  const filters = () => ({
    posicao: bLane.toLowerCase(),
    busca: buildQuery,
    minJogos: buildMinGames,
    adversario: buildChampion && buildOpponent,
  })
  const publish = (replace = false) => publishWorlds("builds", parts(), filters(), replace)
  const mountSkillOptions = (container: ParentNode) => {
    for (const host of container.querySelectorAll<HTMLElement>(".build-skill-options")) {
      if (buildControlRoots.has(host)) continue
      const options = [...host.querySelectorAll<HTMLElement>("[data-skill-sequence]")].map(button => ({
        value: button.dataset.skillSequence ?? "",
        label: button.textContent,
      }))
      const panels = host.closest(".build-skills")?.querySelectorAll<HTMLElement>("[data-skill-panel]")
      if (!panels) continue
      const root = createRoot(host)
      buildControlRoots.set(host, root)
      const select = (value: string) => {
        if (!value) return
        showBuildOption(panels, "skillPanel", value)
        root.render(
          createElement(
            ToggleGroup,
            {
              type: "single",
              value,
              spacing: 1,
              "aria-label": "Sequências mais frequentes",
              onValueChange: select,
            },
            options.map(option =>
              createElement(
                ToggleGroupItem,
                {
                  key: option.value,
                  value: option.value,
                  ...{ "data-slot": "button", "data-variant": "outline", "data-size": "sm" },
                },
                option.label,
              ),
            ),
          ),
        )
      }
      select("0")
    }
  }
  $(".build-source-options").onclick = event => {
    const source = (event.target as Element).closest<HTMLElement>("[data-build-source]")?.dataset.buildSource
    if (!source || source === DATASET.source) return
    const expanded = bc.querySelector<HTMLElement>('.build-toggle[aria-expanded="true"]')?.dataset.buildToggle
    const path = buildsPath(source, expanded ? [expanded] : parts(), filters())
    if (isEmbedded()) navigateHost({ path, focusSource: true })
    else location.assign("./#" + path)
  }
  const championCard = (
    champion: (typeof C)[number],
    position: string,
    pageSlug?: string,
    opponents: Opponent[] = [],
  ) => {
    const inlineContext = pageSlug
      ? `<section class="build-context build-context-inline" aria-label="Confrontos da build">${buildMatchups(champion, position)}</section>`
      : ""
    const selectedOpponent = opponents.find(opponent => opponent.slug === buildOpponent)
    const gameCount = selectedOpponent?.games ?? championBuild(champion, position)?.games
    const multiplePositions = Object.values(champion.lanes).filter(lane => lane.picks).length > 1
    const positionLabel = position || (multiplePositions ? "Todas as posições" : champion.main)
    const heading = pageSlug
      ? ""
      : `<header class="build-card-heading">
        <div class="build-card-identity">
          ${ico(champion.name)}
          <div>
            <h3>${esc(champion.name)}</h3>
            <div class="build-card-meta">
              <span class="build-card-source">${DATASET.label}</span>
              <span class="build-card-position">${laneIconMarkup(position)}${esc(positionLabel)}</span>
              ${gameCount === undefined ? "" : `<span>Amostra de ${gameCount} ${gameCount === 1 ? "jogo" : "jogos"}</span>`}
              ${selectedOpponent ? "" : `<span class="build-winrate">${wrPill(champion.wins, champion.picks)} <small>de vitórias ${DATASET.scope}</small></span>`}
            </div>
          </div>
        </div>
        <div class="build-card-filters">
          <div class="build-detail-lanes"></div>
          ${
            opponents.length
              ? `<div class="build-opponent-filter">
            <label id="build-opponent-label" for="build-opponent-trigger">Adversário direto</label>
            <div class="team-select" data-build-opponent></div>
          </div>`
              : ""
          }
        </div>
      </header>`
    const action = pageSlug
      ? `<button class="worlds-detail-action" data-slot="button" data-variant="ghost" data-size="sm" type="button" data-build="${pageSlug}" aria-label="Ver página da build de ${esc(champion.name)}">Ver página ${iconMarkup("next")}</button>`
      : ""
    return `<article class="bcard${pageSlug ? "" : " wl-panel"}">
      ${heading}
      ${buildDetails(champion, position, action, !pageSlug, selectedOpponent?.slug)}
      ${inlineContext}
    </article>`
  }
  const draw = (restoreOpponentFocus = false, normalizeRoute = false) => {
    const f = q.value.trim().toLowerCase()
    disposeBuildControls()
    opponentSelectRoot?.unmount()
    opponentSelectRoot = undefined
    contextAnimation?.stop()
    contextAnimation = undefined
    clearAll.setAttribute("aria-disabled", String(!hasFilters()))
    const matches = buildChampion
      ? []
      : list.filter(c => games(c) > 0 && games(c) >= buildMinGames && buildMatchesQuery(c, bLane, f))
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
      if (normalizeRoute) publish(true)
    }
    const context = champion ? buildMatchups(champion, position) : buildLaneHighlights(matches, bLane)
    highlights = champion ? "" : context
    const content = champion
      ? championCard(champion, position, undefined, opponents)
      : matches.length
        ? buildsTable(matches, bLane)
        : ""
    const back = buildChampion
      ? `<div class="build-back">
      <button data-slot="button" data-variant="ghost" data-size="sm" class="build-route" data-build="">${iconMarkup("previous")} Voltar à lista de builds</button>
      ${selectedChampion && !champion ? '<div class="build-detail-lanes"></div>' : ""}
    </div>`
      : ""
    bc.classList.toggle("build-detail", !!buildChampion)
    bc.innerHTML =
      back +
      (content
        ? `<div class="builds-workspace">${content}<aside class="wl-panel build-context build-context-side" aria-label="Contexto da build" aria-live="polite"><div class="build-context-transition"><div class="build-context-content">${context}</div></div></aside></div>`
        : buildChampion
          ? `<div class="empty-state" role="status"><h3>Sem partidas para esta build</h3><p>A base ${DATASET.label} ainda não tem partidas para este campeão${bLane ? ` na posição ${esc(bLane)}` : ""}.</p></div>`
          : list.length
            ? '<div class="empty-state" role="status"><h3>Nenhum campeão encontrado</h3><p>Ajuste a busca, a posição ou o mínimo de jogos.</p></div>'
            : '<div class="empty-state" role="status"><h3>Ainda não há partidas coletadas</h3><p>As builds aparecem aqui depois da primeira coleta diária.</p></div>')
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
    sortBuildRows()
    const opponentSelect = bc.querySelector<HTMLElement>("[data-build-opponent]")
    if (opponentSelect) {
      opponentSelectRoot = createRoot(opponentSelect)
      opponentSelectRoot.render(
        createElement(WorldsOpponentSelect, {
          opponents,
          value: buildOpponent,
          restoreFocus: restoreOpponentFocus,
          onChange: (value: string) => {
            buildOpponent = value
            draw(true)
            publish()
          },
        }),
      )
    }
    enhanceAnalyticsUI()
    hydrateBuildTimelines(bc)
  }
  const setExpanded = (button: HTMLButtonElement, expanded: boolean) => {
    const detail = document.getElementById(button.getAttribute("aria-controls") ?? "") as HTMLTableRowElement
    const cell = detail.cells[0]
    const panel = cell.firstElementChild as HTMLElement
    const startHeight = detail.hidden ? 0 : panel.getBoundingClientRect().height
    detailAnimations.get(panel)?.stop()
    detailAnimations.delete(panel)

    if (!expanded && detail.contains(document.activeElement)) button.focus({ preventScroll: true })
    button.setAttribute("aria-expanded", String(expanded))
    detail.inert = !expanded
    detail.hidden = false
    const content = detailContents.get(panel)
    if (!content) return
    flushSync(() =>
      content.root.render(
        createElement(
          Collapsible,
          { open: expanded },
          createElement(
            CollapsibleContent,
            { forceMount: true },
            createElement(ExistingContent, { element: content.element }),
          ),
        ),
      ),
    )
    mountSkillOptions(content.element)
    cell.colSpan = compactBuilds.matches ? 4 : 8
    panel.style.height = ""
    const endHeight = expanded ? panel.getBoundingClientRect().height : 0
    const settle = () => {
      detail.hidden = !expanded
      panel.style.height = ""
      panel.style.overflow = ""
      detailAnimations.delete(panel)
    }
    if (reduceBuildMotion.matches || startHeight === endHeight) {
      settle()
      return
    }
    panel.style.overflow = "clip"
    panel.style.height = `${startHeight}px`
    const animation = animate(
      panel,
      { height: [`${startHeight}px`, `${endHeight}px`] },
      {
        duration: 0.24,
        ease: [0.2, 0.7, 0.25, 1],
        onComplete: settle,
      },
    )
    detailAnimations.set(panel, animation)
  }
  const updateBuildContext = (html: string, trigger: HTMLButtonElement) => {
    matchupCardAnimation?.cancel()
    const viewport = bc.querySelector<HTMLElement>(".build-context-transition")
    if (!viewport) return
    const outgoing = viewport.lastElementChild as HTMLElement
    const startHeight = viewport.getBoundingClientRect().height
    const startOpacity = getComputedStyle(outgoing).opacity
    contextAnimation?.stop()
    contextAnimation = undefined
    viewport.querySelector(".build-context-outgoing")?.remove()
    viewport.style.height = ""
    viewport.style.overflow = ""

    if (outgoing.contains(document.activeElement)) trigger.focus({ preventScroll: true })
    if (!startHeight || reduceBuildMotion.matches) {
      outgoing.innerHTML = html
      outgoing.style.opacity = ""
      return
    }

    const incoming = document.createElement("div")
    incoming.className = "build-context-content"
    incoming.innerHTML = html
    outgoing.inert = true
    outgoing.setAttribute("aria-hidden", "true")
    outgoing.classList.add("build-context-outgoing")
    viewport.append(incoming)
    const endHeight = viewport.getBoundingClientRect().height
    viewport.style.overflow = "clip"
    const animation = animate(
      [
        [viewport, { height: [`${startHeight}px`, `${endHeight}px`] }],
        [outgoing, { opacity: [Number(startOpacity), 0] }, { at: 0 }],
        [incoming, { opacity: [0, 1] }, { at: 0 }],
      ],
      { defaultTransition: { duration: 0.24, ease: [0.2, 0.7, 0.25, 1] } },
    )
    contextAnimation = animation
    void animation.then(() => {
      if (contextAnimation !== animation) return
      outgoing.remove()
      incoming.style.opacity = ""
      viewport.style.height = ""
      viewport.style.overflow = ""
      contextAnimation = undefined
    })
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
    if (!detailContents.has(panel)) {
      const element = document.createElement("div")
      element.innerHTML = championCard(champion, bLane, toggle.dataset.buildToggle)
      const root = createRoot(panel)
      buildControlRoots.set(panel, root)
      detailContents.set(panel, { element, root })
    }
    setExpanded(toggle, true)
    updateBuildContext(context, toggle)
    enhanceAnalyticsUI()
  }
  bc.onclick = e => {
    const target = e.target as Element
    const matchupSummary = target.closest(".build-context-side .build-matchup-group > summary")
    if (matchupSummary) {
      matchupCardAnimation?.cancel()
      const group = matchupSummary.parentElement as HTMLDetailsElement | null
      const card = group?.closest<HTMLElement>(".build-context-side")
      if (
        !group ||
        !card ||
        !group.open ||
        reduceBuildMotion.matches ||
        card.scrollHeight <= card.clientHeight ||
        !CSS.supports("interpolate-size", "allow-keywords")
      )
        return

      const contentHeight = parseFloat(getComputedStyle(group, "::details-content").blockSize)
      const startHeight = card.offsetHeight
      const endHeight = card.scrollHeight - contentHeight + startHeight - card.clientHeight
      if (endHeight < startHeight) {
        // Animate the viewport cap in sync with the native details transition.
        const styles = getComputedStyle(card)
        matchupCardAnimation = card.animate(
          { maxBlockSize: [`${startHeight}px`, `${Math.ceil(endHeight)}px`] },
          {
            duration: parseFloat(styles.getPropertyValue("--wl-motion-panel")),
            easing: styles.getPropertyValue("--build-matchup-close-ease").trim(),
          },
        )
      }
      return
    }
    const page = target.closest<HTMLElement>("[data-show-matchup-page]")
    if (page) {
      const hiddenRows = [...(page.previousElementSibling?.querySelectorAll<HTMLElement>("li[hidden]") ?? [])]
      const nextRows = hiddenRows.slice(0, MATCHUP_PAGE_SIZE)
      nextRows.forEach(row => {
        row.hidden = false
        revealContent(row, true)
      })
      nextRows[0]?.querySelector("button")?.focus({ preventScroll: true })

      const remaining = hiddenRows.length - nextRows.length
      if (remaining) {
        if (page.firstElementChild)
          page.firstElementChild.textContent = `Ver mais ${Math.min(MATCHUP_PAGE_SIZE, remaining)}`
      } else {
        page.remove()
      }
      return
    }
    const more = target.closest("[data-show-matchups]")
    if (more) {
      const list = more.nextElementSibling as HTMLElement
      list.hidden = false
      revealContent(list, true)
      list.querySelector("button")?.focus({ preventScroll: true })
      more.remove()
      return
    }
    const view = target.closest<HTMLButtonElement>("[data-timeline-view]")
    if (view) {
      const section = view.closest(".build-timeline")!
      section.querySelectorAll<HTMLButtonElement>("[data-timeline-view]").forEach(button => {
        button.setAttribute("aria-pressed", String(button === view))
      })
      section.querySelector<HTMLElement>(".build-timeline-games")!.dataset.view = view.dataset.timelineView ?? ""
      return
    }
    const sort = target.closest<HTMLElement>(".builds-table thead button[data-k]")
    if (sort) {
      const k = sort.dataset.k ?? ""
      buildSort = { k, d: buildSort.k === k ? -buildSort.d : -1 }
      sortBuildRows()
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
