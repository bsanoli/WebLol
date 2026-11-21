import DATA from "@dataset/summary"
import { DATASET } from "@/shared/dataset"
import { iconMarkup } from "@/shared/ui/icon"
import { esc } from "@/entities/match"

/** Estrutura da página: cabeçalho, filtros e contêiner onde as builds são desenhadas. */
export function renderBuildsView(minGames: number) {
  const gameSource = DATASET.source === "soloq" ? `de ${DATASET.label}` : "na base"
  return `<section class="builds-page" aria-label="Builds">
  <header class="builds-heading">
    <div><h1>Builds</h1><p class="hint">${DATA.games.toLocaleString("pt-BR")} jogos ${gameSource}</p></div>
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
  <label class="build-filter-field build-min-games" for="bmin">Mínimo de jogos <input data-slot="input" id="bmin" type="number" min="0" step="1" inputmode="numeric" value="${minGames}"></label>
  <button id="build-clear-all" type="button" data-slot="button" data-variant="ghost">${iconMarkup("reset")} Limpar filtros</button></div>
  <p id="build-results-count" class="build-results-count" role="status"></p>
  <div class="bcards" id="bc"></div></section>`
}

type BuildsResults = {
  hasChampion: boolean
  hasMissingBuild: boolean
  content: string
  context: string
  lane: string
  hasChampions: boolean
}

/** Resultado da lista ou da build escolhida, com o painel de contexto ao lado e os estados vazios. */
export function renderBuildsResults({
  hasChampion,
  hasMissingBuild,
  content,
  context,
  lane,
  hasChampions,
}: BuildsResults) {
  const back = hasChampion
    ? `<div class="build-back">
      <button data-slot="button" data-variant="ghost" data-size="sm" class="build-route" data-build="">${iconMarkup("previous")} Voltar à lista de builds</button>
      ${hasMissingBuild ? '<div class="build-detail-lanes"></div>' : ""}
    </div>`
    : ""
  return (
    back +
    (content
      ? `<div class="builds-workspace">${content}<aside class="wl-panel build-context build-context-side" aria-label="Contexto da build" aria-live="polite"><div class="build-context-transition"><div class="build-context-content">${context}</div></div></aside></div>`
      : hasChampion
        ? `<div class="empty-state" role="status"><h3>Sem partidas para esta build</h3><p>A base ${DATASET.label} ainda não tem partidas para este campeão${lane ? ` na posição ${esc(lane)}` : ""}.</p></div>`
        : hasChampions
          ? '<div class="empty-state" role="status"><h3>Nenhum campeão encontrado</h3><p>Ajuste a busca, a posição ou o mínimo de jogos.</p></div>'
          : '<div class="empty-state" role="status"><h3>Ainda não há partidas coletadas</h3><p>As builds aparecem aqui depois da primeira coleta diária.</p></div>')
  )
}
