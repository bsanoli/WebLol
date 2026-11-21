import DATA from "@dataset/summary"
import { ico } from "@/entities/champion"
import { LANES, esc, teamLogo, teamRegion } from "@/entities/match"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { compChampionLanes, compChampions, compFilters } from "../model/comp-filters"
import { compPicker } from "./comp-picker"

export const teamFilterLabel = () =>
  compFilters.team
    ? `${teamLogo(compFilters.team)}<span class="comp-team-name" title="${esc(compFilters.team)}">${esc(compFilters.team)}</span>`
    : "Todos os times"

export function compsView() {
  const teams = [...new Set(DATA.comps.flatMap(g => [g.blue, g.red]))].sort()
  return `<section class="worlds-compositions" aria-labelledby="comps-title">
    <h2 id="comps-title" class="comps-intro">Composições do Worlds</h2>
    <div class="wl-panel comp-filters" role="group" aria-label="Filtrar jogos">
      <label for="cq">Buscar<input data-slot="input" id="cq" type="search" placeholder="Campeão ou jogador" value="${esc(compFilters.query || "")}"></label>
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
