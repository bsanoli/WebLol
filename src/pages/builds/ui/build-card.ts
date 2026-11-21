import { ico } from "@/entities/champion"
import { esc, wrPill } from "@/entities/match"
import { DATASET } from "@/shared/dataset"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { type Champion, type buildOpponentOptions, championBuild } from "../model/build-statistics"
import { buildDetails } from "./build-details"
import { buildMatchups } from "./build-matchups"

type Opponent = ReturnType<typeof buildOpponentOptions>[number]

type ChampionCardOptions = {
  champion: Champion
  position: string
  /** Quando informado, o card aparece inline na tabela, sem cabeçalho. */
  pageSlug?: string
  opponents?: Opponent[]
  opponent: string
}

function cardHeading({ champion, position, opponents = [], opponent }: ChampionCardOptions) {
  const selectedOpponent = opponents.find(entry => entry.slug === opponent)
  const gameCount = selectedOpponent?.games ?? championBuild(champion, position)?.games
  const multiplePositions = Object.values(champion.lanes).filter(lane => lane.picks).length > 1
  const positionLabel = position || (multiplePositions ? "Todas as posições" : champion.main)
  return `<header class="build-card-heading">
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
}

export function championCard(options: ChampionCardOptions) {
  const { champion, position, pageSlug, opponents = [], opponent } = options
  const inlineContext = pageSlug
    ? `<section class="build-context build-context-inline" aria-label="Confrontos da build">${buildMatchups(champion, position)}</section>`
    : ""
  const selectedOpponent = opponents.find(entry => entry.slug === opponent)
  const heading = pageSlug ? "" : cardHeading(options)
  const action = pageSlug
    ? `<button class="worlds-detail-action" data-slot="button" data-variant="ghost" data-size="sm" type="button" data-build="${pageSlug}" aria-label="Ver página da build de ${esc(champion.name)}">Ver página ${iconMarkup("next")}</button>`
    : ""
  return `<article class="bcard${pageSlug ? "" : " wl-panel"}">
      ${heading}
      ${buildDetails(champion, position, action, !pageSlug, selectedOpponent?.slug)}
      ${inlineContext}
    </article>`
}
