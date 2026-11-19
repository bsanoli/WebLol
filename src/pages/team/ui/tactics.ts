// @ts-nocheck -- Usa os mesmos helpers de markup do editor legado (img, esc, LN).
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { DRAFT_SIDE, PICKNAME, compositionPreview, draftOf, sideDot } from "./draft"

/** Picks e bans da comp em formato reduzido: só leitura, um lado por coluna. */
function draftSummaryHTML(c, { LN, img, esc }) {
  const d = draftOf(c)
  const column = key => {
    const t = key === "blue" ? "B" : "R", mine = d.side === key
    const bans = [0, 1, 2, 3, 4].map(i => {
      const n = mine ? c.lanes.ban[i] : null
      return `<span class="tx-ban${n ? " has" : ""}" title="${n ? esc(n) : `${i + 1}º ban`}">${n ? img(n) : ""}</span>`
    }).join("")
    const picks = [0, 1, 2, 3, 4].map(i => {
      const code = t + (i + 1)
      if (!mine) return `<li class="tx-pick them"><span class="tx-pick-name">${PICKNAME[code]}</span><span class="tx-pick-champ">A definir</span></li>`
      const lane = LN[d.order[d.side][i]], n = c.lanes[lane.k][0]
      const alts = c.lanes[lane.k].length - 1
      return `<li class="tx-pick-item" data-team-control data-swap-lane="${lane.k}"><button type="button" class="tx-pick" style="--lc:var(${lane.c})"
        aria-label="${PICKNAME[code]} · ${lane.n} · ${n ? esc(n) : "Sem campeão"}${alts > 0 ? ` · ${alts} alternativo${alts > 1 ? "s" : ""}, botão direito para trocar` : ""}"
        title="${alts > 0 ? "Botão direito para trocar pelo alternativo" : "Sem campeões alternativos nesta lane"}">${n ? img(n) : `<span class="av tx-empty">${iconMarkup("champion")}</span>`}
        <span class="tx-pick-name">${PICKNAME[code]} · ${lane.n}</span><span class="tx-pick-champ">${n ? esc(n) : "Sem campeão"}</span>${alts > 0 ? `<span class="tx-alts" aria-hidden="true">+${alts}</span>` : ""}</button></li>`
    }).join("")
    return `<section class="tx-side-col ${key}${mine ? " mine" : ""}" aria-label="${DRAFT_SIDE[key]}">
      <h3><span class="side-dot ${key}" aria-hidden="true"></span>${DRAFT_SIDE[key]}${mine ? "<small>Nossa equipe</small>" : ""}</h3>
      <div class="tx-bans" role="group" aria-label="Bans">${bans}</div>
      <ol class="tx-picks">${picks}</ol></section>`
  }
  return `<div class="tx-draft-sides">${column("blue")}${column("red")}</div>`
}

const PRIORITY_LANES = ["top", "jg", "mid", "adc", "sup", "ban"]

/** Opções por posição em formato reduzido: campeões de cada lane em ordem de prioridade, sem notas. */
function priorityHTML(c, { LN, img, esc }) {
  return `<ol class="tx-priority">${PRIORITY_LANES.map(k => {
    const lane = LN[k], list = c.lanes[k]
    const champs = list.length
      ? list.map((n, i) => `<li class="tx-prio-champ${i === 0 ? " main" : ""}" title="${i + 1}ª opção · ${esc(n)}">${img(n)}${i === 0 ? `<b>${esc(n)}</b>` : ""}</li>`).join("")
      : `<li class="tx-prio-empty">Sem campeão</li>`
    return `<li class="tx-prio-lane" style="--lc:var(${lane.c})"><span class="tx-prio-name">${laneIconMarkup(k)}${lane.n}</span><ol class="tx-prio-champs" aria-label="${lane.n} em ordem de prioridade">${champs}</ol></li>`
  }).join("")}</ol>`
}

export function tacticsHTML(c, { compositions, general, text, hasTactic, panel, LN, img, esc }) {
  const mark = has => has ? `<span class="tx-has" title="Tem anotação de tática">${iconMarkup("edit")}</span>` : ""
  const generalTab = `<button type="button" class="dz-tab tx-general${general ? " on" : ""}" data-tactic-general aria-pressed="${general}">
    <b>${iconMarkup("book")}Táticas gerais${mark(hasTactic(null))}</b><span class="mini"><small>Sem composição</small></span></button>`
  const tabs = compositions.map(x => {
    const on = !general && x.id === c.id
    return `<button type="button" class="dz-tab${on ? " on" : ""}" data-tactic-comp="${esc(x.id)}" aria-pressed="${on}" title="${esc(x.name)}">
      <b>${sideDot(x)}${esc(x.name)}${mark(hasTactic(x.id))}</b><span class="mini">${compositionPreview(x).map(img).join("") || "<small>vazia</small>"}</span></button>`
  }).join("")
  const title = general ? "Táticas gerais" : `Táticas · ${esc(c.name)}`
  const hint = general
    ? "Ideias de jogo que valem para qualquer composição."
    : "Como jogar com esta composição: rotações, objetivos, lutas e condição de vitória."
  return `<div class="tx">
    <section class="tx-write">
      <label class="tx-title" for="tactics-text">${title}</label>
      <p class="tx-hint">${hint}</p>
      <textarea id="tactics-text" placeholder="Escreva a tática…">${esc(text)}</textarea>
    </section>
    <aside class="tx-aside" aria-label="Composições e draft">
      <div class="tx-tabs" role="group" aria-label="Escolher a tática">${generalTab}${tabs}</div>
      <div class="tx-draft">${general
        ? `<p class="tx-draft-empty">Selecione uma composição para ver os picks e bans dela aqui.</p>`
        : `<div class="tx-panel-switch" role="group" aria-label="Visão da comp">${[["draft", "Draft"], ["priority", "Picks prioritários"]]
            .map(([value, label]) => `<button type="button" data-tactic-panel="${value}" aria-pressed="${panel === value}"${panel === value ? ' class="on"' : ""}>${label}</button>`).join("")}</div>
          ${panel === "priority" ? priorityHTML(c, { LN, img, esc }) : draftSummaryHTML(c, { LN, img, esc })}`}</div>
    </aside>
  </div>`
}
