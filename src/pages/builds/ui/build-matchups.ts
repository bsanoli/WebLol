import DATA from "@dataset/summary"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { ico } from "@/entities/champion"
import { championSlug, esc } from "@/entities/match"
import { DATASET } from "@/shared/dataset"
import type { Champion } from "../model/build-statistics"
import { gameCount } from "./build-icons"

type Matchup = [opponent: string, games: number, wins: number, ...stats: number[]]
const matchups: Record<string, Record<string, (string | number)[][]>> = DATA.matchups
export const MATCHUP_PAGE_SIZE = 5

function orderedMatchups(position: string, champion: string) {
  return (matchups[position]?.[champion] ?? [])
    .filter(
      (row): row is Matchup =>
        row.length >= 3 && typeof row[0] === "string" && row.slice(1).every(value => typeof value === "number"),
    )
    .sort((a, b) => b[1] - a[1] || b[2] / b[1] - a[2] / a[1])
}

export function buildMatchups(champion: Champion, position: string) {
  const lane = position || champion.main
  const opponents = orderedMatchups(lane, champion.name).filter(([, games]) => games > 0)
  const byWinRate = (a: Matchup, b: Matchup) => a[2] * b[1] - b[2] * a[1]
  const rank = (direction: number) => (a: Matchup, b: Matchup) =>
    direction * byWinRate(a, b) || b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")
  const games = opponents.reduce((total, [, count]) => total + count, 0)
  const rows = (entries: Matchup[], hidden = false) =>
    entries
      .map(
        ([opponent, count, wins]) => `<li${hidden ? " hidden" : ""}>
    <button type="button" class="build-matchup-row" data-build="${championSlug(opponent)}" data-build-lane="${esc(lane)}">
      <span class="build-context-name">${ico(opponent)}<span>${esc(opponent)}</span></span>
      <span class="build-context-count"><strong data-result="${wins * 2 > count ? "positive" : wins * 2 < count ? "negative" : "even"}">${((100 * wins) / count).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong><small>${gameCount(count)}</small></span>
      ${iconMarkup("next")}
    </button>
  </li>`,
      )
      .join("")
  const ranked = [...opponents].sort(rank(-1))
  const split = Math.ceil(ranked.length / 2)
  const best = ranked.slice(0, split)
  const worst = ranked.slice(split).sort(rank(1))
  const group = (title: string, entries: Matchup[], collapsed = false) => {
    if (!entries.length) return ""
    const extra = entries.slice(MATCHUP_PAGE_SIZE)
    const paginated = DATASET.source === "soloq" && collapsed
    return `${collapsed ? `<details class="build-matchup-group"><summary>${title}${iconMarkup("next")}</summary>` : `<h4>${title}</h4>`}
      <ul class="build-context-list" aria-label="${title}">${rows(entries.slice(0, MATCHUP_PAGE_SIZE))}${paginated ? rows(extra, true) : ""}</ul>
      ${
        extra.length && paginated
          ? `<button type="button" data-slot="button" data-variant="ghost" data-size="sm"
        class="build-matchup-more" data-show-matchup-page><span>Ver mais ${Math.min(MATCHUP_PAGE_SIZE, extra.length)}</span> ${iconMarkup("next")}</button>`
          : extra.length
            ? `<button type="button" data-slot="button" data-variant="ghost" data-size="sm"
        class="build-matchup-more" data-show-matchups aria-label="Ver mais adversários: ${title}">Ver mais adversários (${extra.length}) ${iconMarkup("next")}</button>
        <ul class="build-context-list" aria-label="Mais adversários: ${title}" hidden>${rows(extra)}</ul>`
            : ""
      }${collapsed ? "</details>" : ""}`
  }
  return `<h3>Confrontos</h3>
    <div class="build-context-champion">${ico(champion.name)}<div>
      <strong>${esc(champion.name)}</strong>
      <span class="lane-label">${laneIconMarkup(lane, true)}${esc(lane)}${games ? `<span title="${esc(gameCount(games) + " " + DATASET.matchupGames)}">· ${gameCount(games)}</span>` : ""}</span>
    </div></div>
    ${
      opponents.length
        ? group("Mais frequentes", opponents.slice(0, 5)) +
          group("Melhores taxas de vitória", best, true) +
          group("Piores taxas de vitória", worst, true)
        : `<p class="hint">Sem confrontos registrados para este campeão na posição.</p>`
    }`
}

export function buildLaneHighlights(champions: Champion[], position: keyof Champion["lanes"] | "") {
  const top = (count: (champion: Champion) => number) =>
    champions
      .map(champion => ({
        champion,
        count: count(champion),
      }))
      .filter(entry => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  const lists = [
    { title: "Mais escolhidos", entries: top(c => (position ? (c.lanes[position]?.picks ?? 0) : c.picks)) },
    { title: DATASET.mostBanned, entries: top(c => c.bans) },
  ]
  return `<h3>${position ? `Destaques · ${esc(position)}` : DATASET.highlights}</h3>
    ${lists
      .filter(({ entries }) => entries.length)
      .map(
        ({ title, entries }) => `<h4>${title}</h4>
      <ul class="build-context-list build-context-ranking">${entries
        .map(
          ({ champion, count }) => `<li>
        <button type="button" data-slot="button" data-variant="ghost" class="build-context-rank" data-highlight-build="${championSlug(champion.name)}">
          <span class="build-context-name">${ico(champion.name)}${esc(champion.name)}</span><strong>${count}</strong>
        </button>
      </li>`,
        )
        .join("")}</ul>`,
      )
      .join("")}`
}
