import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Checkbox } from "@/shared/ui/checkbox"
import { Button } from "@/shared/ui/button"
import { iconMarkup } from "@/shared/ui/icon"
import DATA from "@dataset/summary"
import { compCard } from "./match-card"
import { ico } from "@/entities/champion"
import { esc } from "@/entities/match"
import { enhanceAnalyticsUI } from "@/shared/lib/analytics-dom"
import { revealContent } from "@/shared/lib/motion"
import { $ } from "@/shared/lib/dom"
import { compositionPopovers, wireCompPicker } from "./comp-picker"
import { compChampions, compFilters, filterCompGames, hasCompFilters, sortCompGames } from "../model/comp-filters"
import { handleMatchGridClick } from "./comp-draft-dialog"
import { createStageSelect } from "./comp-stage-select"
import { compsView, teamFilterLabel } from "./comp-view"
type PublishWorlds = (id: "comps", parts: string[], filters: Record<string, string>, replace?: boolean) => void
let compActionsRoot: Root | undefined
let compStageRoot: Root | undefined
function wireComps(publishWorlds: PublishWorlds) {
  const all = sortCompGames()
  const matchGrid = $("#cl")

  matchGrid.onclick = handleMatchGridClick
  const activeChampions = $("#cc-active")
  const search = $<HTMLInputElement>("#cq")
  const stages = [...new Set(all.map(game => game.st))]
  const stageRoot = createRoot($("#comp-stage"))
  compStageRoot = stageRoot
  const drawStage = () => {
    stageRoot.render(
      createStageSelect(stages, compFilters.stage || "all", value => {
        compFilters.stage = value === "all" ? "" : value
        drawStage()
        updateResults()
      }),
    )
  }
  const actionsRoot = createRoot($("#comp-filter-actions"))
  compActionsRoot = actionsRoot
  const drawActions = () => {
    actionsRoot.render([
      createElement(
        "label",
        { key: "wins", className: "comp-wins-label" },
        createElement(Checkbox, {
          className: "comp-wins-check",
          checked: compFilters.winsOnly,
          "aria-describedby": "cc-hint",
          onCheckedChange: checked => {
            compFilters.winsOnly = checked === true
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
          "aria-disabled": !hasCompFilters(),
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
    activeChampions.hidden = compFilters.champions.size === 0
    activeChampions.innerHTML = [...compFilters.champions]
      .map(slug => {
        const name = compChampions.get(slug) ?? slug
        return `<button type="button" data-slot="button" data-variant="outline" data-champion="${slug}" aria-label="Remover ${esc(name)} do filtro">${ico(name)}${esc(name)}${iconMarkup("close")}</button>`
      })
      .join("")
  }
  const draw = () => {
    drawActions()
    const q = (compFilters.query || "").trim().toLowerCase()
    const champions = [...compFilters.champions].flatMap(slug => compChampions.get(slug) ?? [])
    $("#cc-hint").textContent = compFilters.winsOnly
      ? "Os campeões selecionados, o time e a busca precisam corresponder ao lado vencedor."
      : "A partida precisa ter todos os campeões selecionados, em qualquer lado."
    const L = filterCompGames(all, q, champions)
    let extra = ""
    if (compFilters.team) {
      const w = L.filter(g => (g.b === compFilters.team) === g.bw).length
      extra = `<span>${esc(compFilters.team)} · ${w} vitórias · ${L.length - w} derrotas</span>`
    }
    const countLabel = hasCompFilters()
      ? `${L.length} ${L.length === 1 ? "jogo encontrado" : "jogos encontrados"}`
      : `${DATA.comps.length} de ${DATA.games} jogos do torneio`
    $("#cn").innerHTML = `<strong>${countLabel}</strong>${extra}`
    const highlightedChampions = new Set(champions)
    matchGrid.innerHTML =
      L.map((g, index) => compCard(g, q, highlightedChampions, index)).join("") ||
      '<div class="empty-state"><h3>Nenhum jogo encontrado</h3><p>Remova um campeão ou ajuste os outros filtros para ver mais partidas.</p></div>'
  }
  const publish = (shouldReplace = false) =>
    publishWorlds(
      "comps",
      [],
      {
        time: compFilters.team,
        fase: compFilters.stage,
        busca: compFilters.query,
        campeoes: [...compFilters.champions].join(","),
        vitorias: compFilters.winsOnly ? "1" : "",
      },
      shouldReplace,
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
    isSelected: slug => compFilters.champions.has(slug),
    onSelect: slug => {
      if (compFilters.champions.has(slug)) compFilters.champions.delete(slug)
      else compFilters.champions.add(slug)
      updateChampions()
    },
    onClear: () => {
      compFilters.champions.clear()
      updateChampions()
    },
  })
  const drawTeam = () => {
    $("#ct .comp-picker-value").innerHTML = teamFilterLabel()
    teamPicker.sync()
  }
  const selectTeam = (team: string) => {
    compFilters.team = team
    drawTeam()
    teamPicker.close()
    updateResults()
  }
  const teamPicker = wireCompPicker("ct", {
    isSelected: team => team === compFilters.team,
    onSelect: selectTeam,
    onClear: () => selectTeam(""),
  })
  activeChampions.onclick = e => {
    const button = (e.target as Element).closest<HTMLElement>("button[data-champion]")
    if (!button) return
    compFilters.champions.delete(button.dataset.champion ?? "")
    updateChampions()
    championPicker.trigger.focus()
  }
  search.oninput = () => {
    compFilters.query = search.value
    draw()
    enhanceAnalyticsUI()
    publish(true)
  }
  function clearFilters() {
    if (!hasCompFilters()) return
    search.value = compFilters.query = ""
    compFilters.stage = ""
    drawStage()
    compFilters.team = ""
    compFilters.winsOnly = false
    compFilters.champions.clear()
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

export function disposeCompositions() {
  for (const root of compositionPopovers.splice(0)) root.unmount()
  compActionsRoot?.unmount()
  compActionsRoot = undefined
  compStageRoot?.unmount()
  compStageRoot = undefined
}
export { compsView, wireComps }
