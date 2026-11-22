import DATA from "@dataset/summary"
import { iconMarkup } from "@/shared/ui/icon"
import { ico } from "@/entities/champion"
import { championSlug, esc, sortIcons, wrPill } from "@/entities/match"
import { DATASET } from "@/shared/dataset"
import { showSort } from "@/shared/lib/analytics-dom"
import { championBuild, type Champion, type Frequency } from "../model/build-statistics"
import {
  completedItems,
  gameCount,
  itemKeys,
  itemLabels,
  itemOption,
  runeIcon,
  spellOption,
  type Option,
} from "./build-icons"

export type BuildSort = { k: string; d: number }

export function doesBuildMatchQuery(champion: Champion, lane: string, query: string) {
  const term = query.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  const isMatch = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(term)
  if (isMatch(champion.name)) return true
  const build = championBuild(champion, lane)
  return build?.finalItems.some(({ value }) => isMatch(itemLabels[value] ?? "") || isMatch(itemKeys.get(value) ?? ""))
}

const missingBuildOption = '<span class="na" aria-label="Sem dados">—</span>'
function buildPreview(...options: Option[]) {
  const icons = options
    .flatMap(option => option.icons)
    .filter(Boolean)
    .join("")
  return icons ? `<div class="build-option-icons">${icons}</div>` : missingBuildOption
}

function buildRunePreview(primary: Frequency<number>, secondary: Frequency<number>, games: number) {
  const primaryIcon = runeIcon(primary, games)
  const secondaryIcon = runeIcon(secondary, games)
  if (!primaryIcon && !secondaryIcon) return missingBuildOption
  return `<div class="build-option-icons build-option-runes">${primaryIcon}${
    secondaryIcon ? `<span class="build-option-secondary">${secondaryIcon}</span>` : ""
  }</div>`
}

export function buildGameCount(champion: Champion, lane: keyof Champion["lanes"] | "") {
  return lane ? (champion.lanes[lane]?.picks ?? 0) : champion.picks
}

const buildStats = [
  ["games", "picks", "Jogos"],
  ["win", "wr", "Win rate"],
  ["ban", "bans", "Ban rate"],
]

export function buildsTable(champions: Champion[], lane: keyof Champion["lanes"] | "") {
  const rows = champions
    .map(c => {
      const build = championBuild(c, lane)
      const games = buildGameCount(c, lane)
      const equipment = build?.finalItems.filter(entry => completedItems.has(entry.value)) ?? []
      const items = equipment.slice(0, 3).map(entry => itemOption(entry, games))
      const boots = build?.boots[0]
      const keystone = build?.primaryRunes[0]?.[0]
      const secondaryTree = build?.secondaryTrees[0]
      const spells = build?.spells[0]
      const slug = championSlug(c.name)
      const banRate = DATA.games ? Math.round((c.bans / DATA.games) * 100) : 0
      const banLevel = banRate >= 30 ? "high" : banRate >= 10 ? "medium" : "low"
      return `<tr class="build-summary-row">
      <th scope="row" class="build-col-champion"><button type="button" class="build-champion build-toggle" data-build-toggle="${slug}" aria-expanded="false" aria-controls="build-detail-${slug}">${iconMarkup("next")}${ico(c.name)}<span>${esc(c.name)}<small>${esc(lane || c.main)}<span class="build-mobile-games"> · ${gameCount(games)}</span></small></span></button></th>
      <td class="build-col-games build-stat">${games}</td>
      <td class="build-col-win build-stat">${wrPill(c.wins, c.picks)}</td>
      <td class="build-col-ban build-stat"><span class="wr" data-ban-level="${banLevel}" data-tip="Banido em ${c.bans} de ${DATA.games} jogos ${DATASET.scope}">${banRate}%</span></td>
      <td class="build-col-items">${buildPreview(...items)}</td>
      <td class="build-col-boots">${boots ? buildPreview(itemOption(boots, games)) : missingBuildOption}</td>
      <td class="build-col-runes">${keystone && secondaryTree ? buildRunePreview(keystone, secondaryTree, games) : missingBuildOption}</td>
      <td class="build-col-spells">${spells ? buildPreview(spellOption(spells)) : missingBuildOption}</td>
    </tr>
    <tr class="detail build-inline-detail" id="build-detail-${slug}" hidden><td colspan="8"><div></div></td></tr>`
    })
    .join("")
  return `<div class="wl-panel tablewrap builds-table-wrap" role="region" aria-label="Comparação de builds">
    <table data-slot="table" class="builds-table" aria-label="Builds por campeão">
      <caption>${DATASET.scopeLong}</caption>
      <thead><tr><th scope="col" class="build-col-champion">Campeão</th>
      ${buildStats.map(([column, key, label]) => `<th scope="col" class="build-col-${column} build-stat"><button type="button" data-k="${key}">${label}${sortIcons}</button></th>`).join("")}
      <th scope="col" class="build-col-items">Itens</th><th scope="col" class="build-col-boots">Botas</th><th scope="col" class="build-col-runes">Runas</th>
      <th scope="col" class="build-col-spells">Feitiços</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

/** Reordena as linhas já desenhadas da tabela sem recriá-las. */
export function sortBuildRows(
  container: ParentNode,
  list: Champion[],
  games: (champion: Champion) => number,
  sort: BuildSort,
) {
  const body = container.querySelector(".builds-table tbody")
  if (!body) return
  const rows = new Map(
    [...body.querySelectorAll<HTMLElement>(".build-toggle")].flatMap(button => {
      const row = button.closest("tr")
      return row ? [[button.dataset.buildToggle ?? "", row] as const] : []
    }),
  )
  const value = (c: Champion) => (sort.k === "wr" ? c.wins / c.picks : sort.k === "picks" ? games(c) : c.bans)
  const ordered = list
    .filter(c => rows.has(championSlug(c.name)))
    .sort((a, b) => (value(a) - value(b)) * sort.d || games(b) - games(a))
  body.append(
    ...ordered.flatMap(c => {
      const row = rows.get(championSlug(c.name))
      if (!row) return []
      return row.nextElementSibling ? [row, row.nextElementSibling] : [row]
    }),
  )
  showSort(sort)
}
