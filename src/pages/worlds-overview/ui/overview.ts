import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import DATA from "@dataset/summary"
import { lolAsset, lolChampion } from "@/entities/champion"
import { ico } from "@/entities/champion"
import { LANES, pct, wrPill, esc, teamLogo } from "@/entities/match"
import { confirmedFinalSeries } from "../model/final-series"

const G = DATA.games,
  C = DATA.champs
export function renderWorldsFinal() {
  const scoreboard = document.getElementById("worlds-final")
  if (!scoreboard) return
  const final = confirmedFinalSeries(DATA.comps)
  if (!final) return
  const { winner, runnerUp, score } = final
  scoreboard.innerHTML = `<h2>Final do Worlds</h2>
    <div class="worlds-final-score">
      <div class="worlds-final-team">${teamLogo(winner)}<span><strong>${esc(winner)}</strong><small>Campeã</small></span></div>
      <strong class="worlds-final-result">${score[0]} <span>×</span> ${score[1]}</strong>
      <div class="worlds-final-team">${teamLogo(runnerUp)}<strong>${esc(runnerUp)}</strong></div>
    </div>`
  scoreboard.dataset.confirmed = ""
}

export function renderKpis() {
  // KPIs
  const topBan = [...C].sort((a, b) => b.bans - a.bans)[0],
    topPick = [...C].sort((a, b) => b.picks - a.picks)[0]
  const kpis = document.getElementById("kpis")
  if (kpis && topBan && topPick)
    kpis.innerHTML = [
      [G, "jogos"],
      [C.length, "campeões usados"],
      [topBan.name, `mais banido · ${pct(topBan.bans / G)}`],
      [topPick.name, `mais pickado · ${topPick.picks}`],
    ]
      .map(
        ([v, l], i) =>
          `<div class="wl-panel kpi" data-tip="${["Total de jogos do Play-In até a final", "Campeões que foram pickados ou banidos pelo menos uma vez", `${topBan.name} foi banido em ${topBan.bans} de ${G} jogos`, `${topPick.name} foi escolhido em ${topPick.picks} jogos (${topPick.wins} vitórias)`][i]}"><div class="v">${esc(v)}</div><div class="l">${l}</div></div>`,
      )
      .join("")
}
function championSummaries() {
  return C.map(({ name, picks, wins, bans }) => {
    const portrait = lolChampion(name)?.portrait
    return { name, picks, wins, bans, portrait: portrait ? lolAsset(portrait) : undefined }
  })
}

const laneStats = (champion: (typeof C)[number], lane: string) =>
  (champion.lanes as Record<string, { picks: number } | undefined>)[lane]

function overview() {
  const lanes = LANES.map(([lane]) => {
    const id = lane.toLowerCase()
    const champions = C.filter(c => laneStats(c, lane))
      .sort((a, b) => (laneStats(b, lane)?.picks ?? 0) - (laneStats(a, lane)?.picks ?? 0))
      .slice(0, 5)
    const rows = champions
      .map(c => {
        const name = esc(c.name)
        const games = laneStats(c, lane)?.picks ?? 0
        return `<tr>
        <th scope="row"><span class="lane-champion">${ico(c.name)}<span title="${name}">${name}</span></span></th>
        <td data-tip="${name} jogou ${games} vezes de ${lane}">${games}</td>
        <td>${wrPill(c.wins, c.picks)}</td>
      </tr>`
      })
      .join("")
    const href = `./#/builds?fonte=worlds&posicao=${id}`
    return `<article class="wl-panel lane-card" data-go="${id}">
      <h3 class="wl-card-title" id="lane-title-${id}"><span class="lane-label">${laneIconMarkup(lane)}${lane}</span></h3>
      <table data-slot="table" aria-labelledby="lane-title-${id}">
        <thead><tr><th scope="col">Campeão</th><th scope="col" data-tip="Jogos nesta lane">Jogos</th><th scope="col" data-tip="Taxa de vitória do campeão em todas as posições">Taxa de vitória</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a class="lane-card-link" href="${href}" aria-label="Ver todos os campeões de ${lane}">Ver todos os campeões ${iconMarkup("next")}</a>
    </article>`
  }).join("")
  return `<div id="analytics-root"></div><section class="lane-overview"><h2>Mais escolhidos por posição</h2><p class="hint">A taxa de vitória considera todos os jogos do campeão.</p><div class="lane-grid">${lanes}</div></section>`
}

function wireLaneOverview(view: ParentNode, go: (lane: string) => void) {
  const grid = view.querySelector<HTMLElement>(".lane-grid")
  if (!grid) return
  grid.onclick = event => {
    const card = (event.target as Element).closest<HTMLElement>(".lane-card")
    if (!card?.dataset.go || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    go(card.dataset.go)
    window.scrollTo({ top: 0, behavior: "instant" })
  }
}

export { championSummaries, overview, wireLaneOverview }
