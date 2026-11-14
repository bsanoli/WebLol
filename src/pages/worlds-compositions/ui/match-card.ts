// @ts-nocheck -- Integração legada com o DOM e dados locais.

import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import DATA from "@dataset/summary"
import DRAFTS from "@dataset/drafts"

import { ico } from "@/entities/champion"
import { esc, teamLogo, teamCode } from "@/entities/match"

type DraftSide = "blue" | "red";
type Draft = {
  firstPick: DraftSide;
  blue: { bans: string[]; picks: string[] };
  red: { bans: string[]; picks: string[] };
};
// Champion order per team comes from Rift Graphs. First pick is checked separately
// against Games of Legends, ChainCC or Liquipedia because it can start on either side.
const drafts: Partial<Record<string, Draft>> = DRAFTS;

function compDraft(game: (typeof DATA.comps)[number], panelId: string) {
  const draft = drafts[`${game.s}:${game.g}`];
  if (!draft) return "";

  const teams = { blue: game.b, red: game.r };
  const codes = { blue: teamCode(game.b), red: teamCode(game.r) };
  const first = draft.firstPick;
  const second = first === "blue" ? "red" : "blue";
  const phases = [
    { label: "Bans · Fase 1", kind: "bans", offset: 0, turns: [0, 1, 0, 1, 0, 1] },
    { label: "Picks · Fase 1", kind: "picks", offset: 0, turns: [0, 1, 1, 0, 0, 1] },
    { label: "Bans · Fase 2", kind: "bans", offset: 3, turns: [1, 0, 1, 0] },
    { label: "Picks · Fase 2", kind: "picks", offset: 3, turns: [1, 0, 0, 1] },
  ] as const;
  const team = (side: DraftSide) => `<div class="match-draft-team" data-side="${side}">
    ${teamLogo(teams[side])}<span><strong>${esc(codes[side])}</strong><small>${esc(teams[side])}</small></span>
  </div>`;
  const entry = (side: DraftSide, name: string, number: number, phase: string, highlight = "") => {
    const step = String(number).padStart(2, "0");
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
    </li>`;
  };
  let number = 0;
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
    ${phases.map(({ label, kind, offset, turns }) => {
      const next = { blue: offset, red: offset };
      const actions = turns.map(turn => {
        const side = turn === 0 ? first : second;
        number++;
        const highlight = number === 7 ? "First pick" : number === 20 ? "Last pick" : "";
        return { side, markup: entry(side, draft[side][kind][next[side]++], number, label, highlight) };
      });
      const startingSide = actions[0].side;
      const otherSide = startingSide === "blue" ? "red" : "blue";
      const sides = kind === "picks" && offset === 3
        ? [otherSide, startingSide]
        : [startingSide, otherSide];
      const groups = sides.map(side => ({
        side,
        actions: actions.filter(action => action.side === side),
      }));
      const orderedRows: (typeof actions)[] = [];
      if (kind === "picks") {
        for (const action of actions) {
          const row = orderedRows.at(-1);
          if (row && row[0].side === action.side) row.push(action);
          else orderedRows.push([action]);
        }
      } else {
        orderedRows.push(actions);
      }
      return `<section class="match-draft-phase" data-kind="${kind}" data-phase="${offset === 0 ? 1 : 2}">
        <h4>${label}</h4>
        <div class="match-draft-team-view" hidden>
        ${groups.map(group => `<ol class="match-draft-actions" role="list" aria-label="${esc(teams[group.side])}">${group.actions.map(action => action.markup).join("")}</ol>`).join("")}
        </div>
        <div class="match-draft-order-view">
          ${orderedRows.map(row => `<ol class="match-draft-actions" role="list"${kind === "picks" ? ` aria-label="${esc(teams[row[0].side])}"` : ""}>${row.map(action => action.markup).join("")}</ol>`).join("")}
        </div>
      </section>`;
    }).join("")}
    </div>
  </section>`;
}

export function compCard(g, q, champions, index: number){
  const panelId = `match-draft-${index}`;
  const draft = compDraft(g, panelId);
  const hl=(text, selected=false)=>selected || (q && text.toLowerCase().includes(q)) ? `<mark>${esc(text)}</mark>` : esc(text);
  const team=(name, color, won)=>`<div class="match-team" data-side="${color}">
    ${teamLogo(name)}
    <strong class="match-team-name">${esc(name)}${won?`&nbsp;<span class="match-winner" role="img" aria-label="Vencedor" title="Vencedor">${iconMarkup("check")}</span>`:""}</strong>
  </div>`;
  const side=(champion, player, kda, right)=>{
    const pick=`<td class="match-pick"><div class="match-champion">
      ${ico(champion)}<div><strong>${hl(champion, champions.has(champion))}</strong><small>${hl(player)}</small></div>
    </div></td>`;
    const score=`<td class="match-kda" data-tip="Abates / Mortes / Assistências de ${esc(player)}">${kda}</td>`;
    return right ? score+pick : pick+score;
  };
  return `<article class="wl-panel cg">
    <div class="match-card-header">
      <h3 class="match-game">${esc(g.st)} <span aria-hidden="true">·</span> Jogo ${g.g}</h3>
      ${draft ? `<button type="button" class="worlds-detail-action match-draft-toggle" data-slot="button" data-variant="ghost" data-size="sm"
        aria-haspopup="dialog" aria-controls="match-dialog">Ver draft ${iconMarkup("next")}</button>` : ""}
    </div>
    <div class="match-details">
      <div class="match-scoreboard">${team(g.b,"azul",g.bw)}<span class="vs">VS</span>${team(g.r,"vermelho",!g.bw)}</div>
      <table data-slot="table" class="match-lanes" aria-label="Duelos por rota entre ${esc(g.b)} e ${esc(g.r)}">
        <colgroup><col><col class="kda-column"><col class="lane-column"><col class="kda-column"><col></colgroup>
        <thead><tr>
          <th scope="col" aria-label="Campeão e jogador do lado azul">Campeão</th>
          <th scope="col" aria-label="KDA do lado azul">KDA</th>
          <th scope="col">Rota</th>
          <th scope="col" aria-label="KDA do lado vermelho">KDA</th>
          <th scope="col" aria-label="Campeão e jogador do lado vermelho">Campeão</th>
        </tr></thead>
        <tbody>${g.p.map(([l,cb,pb,kb,cr,pr,kr])=>`<tr>${side(cb,pb,kb,false)}<td class="match-lane">${laneIconMarkup(l,true)}</td>${side(cr,pr,kr,true)}</tr>`).join("")}</tbody>
      </table>
    </div>
    ${draft}
  </article>`;
}
