// @ts-nocheck -- Usa os mesmos helpers de markup do editor legado (img, esc, LN).
import { iconMarkup } from "@/shared/ui/icon"
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
      return `<li class="tx-pick" style="--lc:var(${lane.c})">${n ? img(n) : `<span class="av tx-empty">${iconMarkup("champion")}</span>`}
        <span class="tx-pick-name">${PICKNAME[code]} · ${lane.n}</span><span class="tx-pick-champ">${n ? esc(n) : "Sem campeão"}</span></li>`
    }).join("")
    return `<section class="tx-side-col ${key}${mine ? " mine" : ""}" aria-label="${DRAFT_SIDE[key]}">
      <h3><span class="side-dot ${key}" aria-hidden="true"></span>${DRAFT_SIDE[key]}${mine ? "<small>Nossa equipe</small>" : ""}</h3>
      <div class="tx-bans" role="group" aria-label="Bans">${bans}</div>
      <ol class="tx-picks">${picks}</ol></section>`
  }
  return `<div class="tx-draft-sides">${column("blue")}${column("red")}</div>`
}

export function tacticsHTML(c, { compositions, general, text, hasTactic, LN, img, esc }) {
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
        : draftSummaryHTML(c, { LN, img, esc })}</div>
    </aside>
  </div>`
}
