import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Checkbox } from "@/shared/ui/checkbox"
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover"
import { ExistingContent, showDialog } from "@/shared/ui/dialog-controls"
import { Button } from "@/shared/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import DATA from "@dataset/summary"
import { compCard } from "./match-card"
import { lolKey } from "@/entities/champion"
import { ico } from "@/entities/champion"
import { LANES, esc, championSlug, teamLogo, teamRegion } from "@/entities/match"
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom"
import { revealContent } from "@/shared/lib/motion"
import { $ } from "@/shared/lib/dom"
import { compPicker, compositionPopovers, wireCompPicker } from "./comp-picker"
type Game = (typeof DATA.comps)[number]
type PublishWorlds = (id: "comps", parts: string[], filters: Record<string, string>, replace?: boolean) => void
let compActionsRoot: Root | undefined
let compStageRoot: Root | undefined
const compChampionLanes = new Map<string, Set<string>>()
for (const game of DATA.comps) {
  for (const [lane, blue, , , red] of game.p) {
    for (const name of [String(blue), String(red)]) {
      const lanes = compChampionLanes.get(name) ?? new Set<string>()
      compChampionLanes.set(name, lanes.add(String(lane)))
    }
  }
}
const compChampions = new Map(
  [...compChampionLanes.keys()].sort((a, b) => a.localeCompare(b, "pt-BR")).map(name => [championSlug(name), name]),
)
let cTeam = "",
  cQ = "",
  cSt = "",
  cChamps = new Set<string>()
let cWinsOnly = false
const teamFilterLabel = () =>
  cTeam ? `${teamLogo(cTeam)}<span class="comp-team-name" title="${esc(cTeam)}">${esc(cTeam)}</span>` : "Todos os times"
function compsView() {
  const teams = [...new Set(DATA.comps.flatMap(g => [g.b, g.r]))].sort()
  return `<section class="worlds-compositions" aria-labelledby="comps-title">
    <h2 id="comps-title" class="comps-intro">Composições do Worlds</h2>
    <div class="wl-panel comp-filters" role="group" aria-label="Filtrar jogos">
      <label for="cq">Buscar<input data-slot="input" id="cq" type="search" placeholder="Campeão ou jogador" value="${esc(cQ || "")}"></label>
      ${compPicker({
        id: "cc",
        label: "Campeões",
        value: `${iconMarkup("champion-add")} Escolher campeões`,
        hint: "cc-hint",
        options: compChampions,
        image: ico,
        search: "Buscar campeão",
        empty: "Nenhum campeão encontrado.",
        clear: "Limpar seleções",
        category: {
          label: "Rota jogada no Worlds",
          all: "Todas",
          values: LANES.map(([lane]) => lane),
          icon: laneIconMarkup,
          forName: name => [...(compChampionLanes.get(name) ?? [])],
        },
      })}
      ${compPicker({
        id: "ct",
        label: "Times",
        value: teamFilterLabel(),
        options: teams.map((team): [string, string] => [team, team]),
        image: teamLogo,
        search: "Buscar time",
        empty: "Nenhum time encontrado.",
        clear: "Todos os times",
        category: {
          label: "Região",
          all: "Todas",
          values: [...new Set(teams.flatMap(team => teamRegion(team) ?? []))].sort(),
          forName: name => [teamRegion(name) ?? ""],
        },
      })}
      <div class="comp-picker-field"><span id="comp-stage-label">Fase</span><div id="comp-stage"></div></div>
      <div id="comp-filter-actions" class="comp-filter-actions"></div>
      <p id="cc-hint" hidden>A partida precisa ter todos os campeões selecionados, em qualquer lado.</p>
      <div id="cc-active" class="comp-filter-chips" role="group" aria-label="Campeões selecionados" hidden></div>
    </div>
    <p class="comp-count" id="cn" role="status"></p>
    <div class="cgrid" id="cl"></div>

  </section>`
}
function wireComps(publishWorlds: PublishWorlds) {
  const order = (g: Game) => {
    const m = g.s.match(/(\d+)/g) || []
    const base = g.s.startsWith("play")
      ? 0
      : g.s.includes("quarter")
        ? 200
        : g.s.includes("semi")
          ? 300
          : g.s.includes("final")
            ? 400
            : 100
    return base + (Number(m[0]) || 0) * 10 + (Number(m[1]) || 0) / 100
  }
  const all = DATA.comps.slice().sort((a, b) => order(b) - order(a) || b.g - a.g)
  const matchGrid = $("#cl")

  matchGrid.onclick = event => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>(".match-draft-toggle")
    if (!button) return
    const card = button.closest(".cg")?.cloneNode(true) as HTMLElement | undefined
    const panel = card?.querySelector<HTMLElement>(".match-draft")
    const title = panel?.querySelector<HTMLElement>(".match-draft-title")
    const closeButton = card?.querySelector<HTMLButtonElement>(".match-draft-toggle")
    if (!card || !panel || !title || !closeButton) return
    panel.id = "active-match-draft"
    title.id = "active-match-draft-title"
    panel.setAttribute("aria-labelledby", title.id)
    panel.hidden = false
    closeButton.removeAttribute("aria-haspopup")
    closeButton.removeAttribute("aria-controls")
    closeButton.classList.remove("worlds-detail-action")
    closeButton.classList.replace("match-draft-toggle", "match-dialog-close")
    closeButton.dataset.variant = "ghost"
    closeButton.dataset.size = "icon-sm"
    closeButton.setAttribute("aria-label", "Fechar draft")
    closeButton.innerHTML = iconMarkup("close")
    closeButton.onclick = () => closeDraft()
    const controls = document.createElement("div")
    controls.className = "match-dialog-controls"
    controls.append(closeButton)
    const content = document.createElement("div")
    content.append(controls, card)
    const closeDraft: () => void = showDialog({
      title: "Detalhes da partida e draft",
      children: content,
      className: "match-dialog",
      initialFocus: () => closeButton,
    })
    const modeButtons = panel.querySelectorAll<HTMLButtonElement>("[data-draft-mode]")
    const draftViews = panel.querySelectorAll<HTMLElement>(".match-draft-team-view, .match-draft-order-view")
    for (const mode of modeButtons) {
      mode.onclick = () => {
        if (mode.getAttribute("aria-pressed") === "true") return
        const chronological = mode.dataset.draftMode === "order"
        for (const button of modeButtons) button.setAttribute("aria-pressed", String(button === mode))
        for (const view of draftViews) {
          view.hidden = view.classList.contains("match-draft-team-view") === chronological
          if (!view.hidden) revealContent(view, true)
        }
      }
    }
  }
  const activeChampions = $("#cc-active")
  const search = $<HTMLInputElement>("#cq")
  const stages = [...new Set(all.map(game => game.st))]
  const stageRoot = createRoot($("#comp-stage"))
  compStageRoot = stageRoot
  const drawStage = () => {
    stageRoot.render(
      createElement(
        Select,
        {
          value: cSt || "all",
          onValueChange: (value: string) => {
            cSt = value === "all" ? "" : value
            drawStage()
            updateResults()
          },
        },
        createElement(
          SelectTrigger,
          {
            id: "cs",
            className: "comp-picker-trigger comp-stage-trigger",
            ...{ "data-slot": "button", "data-variant": "outline" },
            "aria-labelledby": "comp-stage-label cs",
          },
          createElement(SelectValue),
        ),
        createElement(
          SelectContent,
          {
            className: "team-select-panel",
            position: "popper",
            align: "start",
            collisionPadding: 8,
          },
          createElement(
            SelectGroup,
            null,
            createElement(SelectItem, { value: "all" }, "Todas as fases"),
            ...stages.map(stage => createElement(SelectItem, { key: stage, value: stage }, stage)),
          ),
        ),
      ),
    )
  }
  const hasFilters = () => Boolean(cQ || cTeam || cSt || cChamps.size || cWinsOnly)
  const actionsRoot = createRoot($("#comp-filter-actions"))
  compActionsRoot = actionsRoot
  const drawActions = () => {
    actionsRoot.render([
      createElement(
        "label",
        { key: "wins", className: "comp-wins-label" },
        createElement(Checkbox, {
          className: "comp-wins-check",
          checked: cWinsOnly,
          "aria-describedby": "cc-hint",
          onCheckedChange: checked => {
            cWinsOnly = checked === true
            updateResults()
          },
        }),
        "Só vitórias",
      ),
      createElement(
        Button,
        {
          key: "clear",
          id: "comp-clear-all",
          variant: "ghost",
          size: "sm",
          "aria-label": "Limpar todos os filtros",
          "aria-disabled": !hasFilters(),
          onClick: clearFilters,
        },
        createElement(
          "svg",
          { className: "icon", "aria-hidden": true },
          createElement("use", { href: "assets/icons.svg#reset" }),
        ),
        "Limpar",
      ),
    ])
  }
  const drawChampions = () => {
    championPicker.sync()
    activeChampions.hidden = cChamps.size === 0
    activeChampions.innerHTML = [...cChamps]
      .map(slug => {
        const name = compChampions.get(slug) ?? slug
        return `<button type="button" data-slot="button" data-variant="outline" data-champion="${slug}" aria-label="Remover ${esc(name)} do filtro">${ico(name)}${esc(name)}${iconMarkup("close")}</button>`
      })
      .join("")
  }
  const draw = () => {
    drawActions()
    const q = (cQ || "").trim().toLowerCase()
    const champions = [...cChamps].flatMap(slug => compChampions.get(slug) ?? [])
    $("#cc-hint").textContent = cWinsOnly
      ? "Os campeões selecionados, o time e a busca precisam corresponder ao lado vencedor."
      : "A partida precisa ter todos os campeões selecionados, em qualquer lado."
    const L = all.filter(g => {
      const championColumns = cWinsOnly ? [g.bw ? 1 : 4] : [1, 4]
      const teamMatches = cWinsOnly ? (g.bw ? g.b : g.r) === cTeam : g.b === cTeam || g.r === cTeam
      return (
        (!cTeam || teamMatches) &&
        (!cSt || g.st === cSt) &&
        champions.every(name => g.p.some(row => championColumns.some(column => row[column] === name))) &&
        (!q ||
          g.p.some(row =>
            championColumns.some(
              column => row[column].toLowerCase().includes(q) || row[column + 1].toLowerCase().includes(q),
            ),
          ))
      )
    })
    let extra = ""
    if (cTeam) {
      const w = L.filter(g => (g.b === cTeam) === g.bw).length
      extra = `<span>${esc(cTeam)} · ${w} vitórias · ${L.length - w} derrotas</span>`
    }
    const countLabel = hasFilters()
      ? `${L.length} ${L.length === 1 ? "jogo encontrado" : "jogos encontrados"}`
      : `${DATA.comps.length} de ${DATA.games} jogos do torneio`
    $("#cn").innerHTML = `<strong>${countLabel}</strong>${extra}`
    const highlightedChampions = new Set(champions)
    matchGrid.innerHTML =
      L.map((g, index) => compCard(g, q, highlightedChampions, index)).join("") ||
      '<div class="empty-state"><h3>Nenhum jogo encontrado</h3><p>Remova um campeão ou ajuste os outros filtros para ver mais partidas.</p></div>'
  }
  const publish = (replace = false) =>
    publishWorlds(
      "comps",
      [],
      {
        time: cTeam,
        fase: cSt,
        busca: cQ,
        campeoes: [...cChamps].join(","),
        vitorias: cWinsOnly ? "1" : "",
      },
      replace,
    )
  const updateResults = () => {
    const count = $("#cn")
    const previousSummary = count.textContent
    draw()
    if (count.textContent !== previousSummary) revealContent(count, true)
    enhanceAnalyticsUI()
    publish()
  }
  const updateChampions = () => {
    drawChampions()
    updateResults()
  }
  const championPicker = wireCompPicker("cc", {
    isSelected: slug => cChamps.has(slug),
    onSelect: slug => {
      if (cChamps.has(slug)) cChamps.delete(slug)
      else cChamps.add(slug)
      updateChampions()
    },
    onClear: () => {
      cChamps.clear()
      updateChampions()
    },
  })
  const drawTeam = () => {
    $("#ct .comp-picker-value").innerHTML = teamFilterLabel()
    teamPicker.sync()
  }
  const selectTeam = (team: string) => {
    cTeam = team
    drawTeam()
    teamPicker.close()
    updateResults()
  }
  const teamPicker = wireCompPicker("ct", {
    isSelected: team => team === cTeam,
    onSelect: selectTeam,
    onClear: () => selectTeam(""),
  })
  activeChampions.onclick = e => {
    const button = (e.target as Element).closest<HTMLElement>("button[data-champion]")
    if (!button) return
    cChamps.delete(button.dataset.champion ?? "")
    updateChampions()
    championPicker.trigger.focus()
  }
  search.oninput = () => {
    cQ = search.value
    draw()
    enhanceAnalyticsUI()
    publish(true)
  }
  function clearFilters() {
    if (!hasFilters()) return
    search.value = cQ = ""
    cSt = ""
    drawStage()
    cTeam = ""
    cWinsOnly = false
    cChamps.clear()
    championPicker.resetBrowseFilters()
    teamPicker.resetBrowseFilters()
    drawTeam()
    updateChampions()
  }
  teamPicker.sync()
  drawChampions()
  drawStage()
  draw()
  enhanceAnalyticsUI()
}

export function setCompositionRoute(query: string, params: URLSearchParams) {
  cQ = query
  cTeam = params.get("time") || ""
  cWinsOnly = params.get("vitorias") === "1"
  cSt = params.get("fase") || ""
  cChamps = new Set((params.get("campeoes") || "").split(",").filter(slug => compChampions.has(slug)))
  if (!DATA.comps.some(game => game.b === cTeam || game.r === cTeam)) cTeam = ""
  if (!DATA.comps.some(game => game.st === cSt)) cSt = ""
}
export function disposeCompositions() {
  for (const root of compositionPopovers.splice(0)) root.unmount()
  compActionsRoot?.unmount()
  compActionsRoot = undefined
  compStageRoot?.unmount()
  compStageRoot = undefined
}
export { compsView, wireComps }
