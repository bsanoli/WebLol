import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import DRAFTS from "@dataset/drafts"

import { ico } from "@/entities/champion"
import { esc, teamLogo, teamCode, type CompLaneRow, type SummaryGame } from "@/entities/match"

type DraftSide = "blue" | "red"
type Draft = {
  firstPick: DraftSide
  blue: { bans: string[]; picks: string[] }
  red: { bans: string[]; picks: string[] }
}
// Champion order per team comes from Rift Graphs. First pick is checked separately
// against Games of Legends, ChainCC or Liquipedia because it can start on either side.
// O JSON guarda `firstPick` como texto; o formato é fixo ("blue" ou "red").
const drafts = DRAFTS as unknown as Partial<Record<string, Draft>>

type Game = SummaryGame

function compDraft(game: Game, panelId: string) {
  const draft = drafts[`${game.series}:${game.game}`]
  if (!draft) return ""

  const teams = { blue: game.blue, red: game.red }
  const codes = { blue: teamCode(game.blue), red: teamCode(game.red) }
  const first = draft.firstPick
  const second = first === "blue" ? "red" : "blue"
  const phases = [
    { label: "Bans · Fase 1", kind: "bans", offset: 0, turns: [0, 1, 0, 1, 0, 1] },
    { label: "Picks · Fase 1", kind: "picks", offset: 0, turns: [0, 1, 1, 0, 0, 1] },
    { label: "Bans · Fase 2", kind: "bans", offset: 3, turns: [1, 0, 1, 0] },
    { label: "Picks · Fase 2", kind: "picks", offset: 3, turns: [1, 0, 0, 1] },
  ] as const
  const team = (side: DraftSide) => `<div class="match-draft-team" data-side="${side}">
    ${teamLogo(teams[side])}<span><strong>${esc(codes[side])}</strong><small>${esc(teams[side])}</small></span>
  </div>`
  const entry = (side: DraftSide, name: string, number: number, phase: string, highlight = "") => {
    const step = String(number).padStart(2, "0")
    return `<li class="match-draft-action" data-side="${side}" value="${number}" tabindex="0"${highlight ? " data-highlight" : ""}
      data-tip="${esc(`${step} · ${name} · ${teams[side]} · ${phase}`)}">
      <span class="match-draft-number">${step}</span><span aria-hidden="true">${ico(name)}</span>
      <span class="match-draft-action-info">
        <strong>${esc(name)}</strong>
        <span class="match-draft-action-meta">
          <small aria-label="${esc(teams[side])}">${esc(codes[side])}</small>
          ${highlight ? `<span class="match-draft-highlight">${highlight}</span>` : ""}
        </span>
      </span>
    </li>`
  }
  let number = 0
  return `<section class="match-draft" id="${panelId}" aria-labelledby="${panelId}-title" hidden>
    <h3 class="match-draft-title" id="${panelId}-title">Ordem de picks e bans</h3>
    <div class="match-draft-content">
    <div class="match-draft-header">
      ${team("blue")}
      <p class="match-draft-first" data-side="${first}">Primeiro pick <strong>${esc(codes[first])}</strong></p>
      ${team("red")}
    </div>
    <div class="match-draft-modes" role="group" aria-label="Visualização do draft">
      <button type="button" data-slot="button" data-variant="outline" data-draft-mode="order" aria-pressed="true">Em ordem</button>
      <button type="button" data-slot="button" data-variant="outline" data-draft-mode="teams" aria-pressed="false">Por equipe</button>
    </div>
    ${phases
      .map(({ label, kind, offset, turns }) => {
        const next = { blue: offset, red: offset }
        const actions = turns.map(turn => {
          const side = turn === 0 ? first : second
          number++
          const highlight = number === 7 ? "Primeiro pick" : number === 20 ? "Último pick" : ""
          return { side, markup: entry(side, draft[side][kind][next[side]++], number, label, highlight) }
        })
        const sides = ["blue", "red"] as const
        const groups = sides.map(side => ({
          side,
          actions: actions.filter(action => action.side === side),
        }))
        const orderedRows: (typeof actions)[] = []
        if (kind === "picks") {
          for (const action of actions) {
            const row = orderedRows.at(-1)
            if (row && row[0].side === action.side) row.push(action)
            else orderedRows.push([action])
          }
        } else {
          orderedRows.push(actions)
        }
        return `<section class="match-draft-phase" data-kind="${kind}" data-phase="${offset === 0 ? 1 : 2}">
        <h4>${label}</h4>
        <div class="match-draft-team-view" hidden>
        ${groups.map(group => `<ol class="match-draft-actions" role="list" aria-label="${esc(teams[group.side])}">${group.actions.map(action => action.markup).join("")}</ol>`).join("")}
        </div>
        <div class="match-draft-order-view">
          ${orderedRows.map(row => `<ol class="match-draft-actions" role="list"${kind === "picks" ? ` aria-label="${esc(teams[row[0].side])}"` : ""}>${row.map(action => action.markup).join("")}</ol>`).join("")}
        </div>
      </section>`
      })
      .join("")}
    </div>
  </section>`
}

export function compCard(g: Game, q: string, champions: Set<string>, index: number) {
  const panelId = `match-draft-${index}`
  const draft = compDraft(g, panelId)
  const hl = (text: string, isSelected = false) =>
    isSelected || (q && text.toLowerCase().includes(q)) ? `<mark>${esc(text)}</mark>` : esc(text)
  const team = (name: string, color: string, isWinner: boolean) => `<div class="match-team" data-side="${color}">
    <span class="match-team-crest" aria-hidden="true">${teamLogo(name)}</span>
    <div class="match-team-label">
      <strong class="match-team-name" title="${esc(name)}">${esc(name)}</strong>
      <small class="match-team-result"${isWinner ? " data-winner" : ""}>${isWinner ? "Vitória" : "Derrota"}</small>
    </div>
  </div>`
  const side = (champion: string, player: string, kda: string, isRight: boolean) => {
    const pick = `<td class="match-pick"><div class="match-champion">
      ${ico(champion)}<div><strong>${hl(champion, champions.has(champion))}</strong><small>${hl(player)}</small></div>
    </div></td>`
    const score = `<td class="match-kda" data-tip="Abates / Mortes / Assistências de ${esc(player)}">${kda}</td>`
    return isRight ? score + pick : pick + score
  }
  const laneRow = ([lane, blueChampion, bluePlayer, blueKda, redChampion, redPlayer, redKda]: CompLaneRow) =>
    `<tr>${side(blueChampion, bluePlayer, blueKda, false)}<td class="match-lane">${laneIconMarkup(lane, true)}</td>${side(redChampion, redPlayer, redKda, true)}</tr>`
  return `<article class="wl-panel cg">
    <div class="match-card-header">
      <h3 class="match-game">${esc(g.stage)} <span aria-hidden="true">·</span> Jogo ${g.game}</h3>
      ${
        draft
          ? `<button type="button" class="worlds-detail-action match-draft-toggle" data-slot="button" data-variant="ghost" data-size="sm"
        aria-haspopup="dialog" aria-controls="match-dialog">Ver draft ${iconMarkup("next")}</button>`
          : ""
      }
    </div>
    <div class="match-details">
      <div class="match-scoreboard">${team(g.blue, "azul", g.blueWon)}<span class="vs">VS</span>${team(g.red, "vermelho", !g.blueWon)}</div>
      <table data-slot="table" class="match-lanes" aria-label="Duelos por rota entre ${esc(g.blue)} e ${esc(g.red)}">
        <colgroup><col><col class="kda-column"><col class="lane-column"><col class="kda-column"><col></colgroup>
        <thead><tr>
          <th scope="col" aria-label="Campeão e jogador do lado azul">Campeão</th>
          <th scope="col" aria-label="KDA do lado azul">KDA</th>
          <th scope="col">Rota</th>
          <th scope="col" aria-label="KDA do lado vermelho">KDA</th>
          <th scope="col" aria-label="Campeão e jogador do lado vermelho">Campeão</th>
        </tr></thead>
        <tbody>${g.lanes.map(row => laneRow(row)).join("")}</tbody>
      </table>
    </div>
    ${draft}
  </article>`
}
