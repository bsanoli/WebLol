// @ts-nocheck -- Usa os mesmos helpers de markup do editor legado (img, esc, LN).
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { DRAFT_SIDE, PICKNAME, compositionPreview, draftOf, sideDot } from "./draft"
import { isSavedTactic } from "../model/tactics"

/** Picks e bans em formato reduzido, um lado por coluna. Numa tática salva os slots escolhem o alvo do seletor. */
function draftSummaryHTML(c, { LN, img, esc, editable, active }) {
  const d = draftOf(c)
  const column = key => {
    const t = key === "blue" ? "B" : "R", mine = d.side === key
    const bans = [0, 1, 2, 3, 4].map(i => {
      const n = mine ? c.lanes.ban[i] : null
      const inner = n ? img(n) : ""
      return editable && mine
        ? `<button type="button" class="tx-ban${n ? " has" : ""}${active === "ban" ? " act" : ""}" data-draft-target="ban" aria-pressed="${active === "ban"}" aria-label="${n ? `Ban: ${esc(n)}` : `${i + 1}º ban vazio`} · escolher bans" title="${n ? esc(n) : `${i + 1}º ban`}">${inner}</button>`
        : `<span class="tx-ban${n ? " has" : ""}" title="${n ? esc(n) : `${i + 1}º ban`}">${inner}</span>`
    }).join("")
    const picks = [0, 1, 2, 3, 4].map(i => {
      const code = t + (i + 1)
      if (!mine) return `<li class="tx-pick them"><span class="tx-pick-name">${PICKNAME[code]}</span><span class="tx-pick-champ">A definir</span></li>`
      const lane = LN[d.order[d.side][i]], n = c.lanes[lane.k][0]
      const alts = c.lanes[lane.k].length - 1
      const on = editable && active === lane.k
      return `<li class="tx-pick-item" data-team-control data-swap-lane="${lane.k}"><button type="button" class="tx-pick${on ? " act" : ""}" style="--lc:var(${lane.c})"${editable ? ` data-draft-target="${lane.k}" aria-pressed="${on}"` : ""}
        aria-label="${PICKNAME[code]} · ${lane.n} · ${n ? esc(n) : "Sem campeão"}${alts > 0 ? ` · ${alts} alternativo${alts > 1 ? "s" : ""}, botão direito para trocar` : ""}"
        title="${alts > 0 ? "Botão direito para trocar pelo alternativo" : "Sem campeões alternativos nesta lane"}">${n ? img(n) : `<span class="av tx-empty">${iconMarkup("champion")}</span>`}
        <span class="tx-pick-name">${PICKNAME[code]} · ${lane.n}</span><span class="tx-pick-champ">${n ? esc(n) : "Sem campeão"}</span>${alts > 0 ? `<span class="tx-alts" aria-hidden="true">+${alts}</span>` : ""}</button></li>`
    }).join("")
    const heading = editable
      ? `<button type="button" class="tx-side-pick" data-side="${key}" aria-pressed="${mine}" title="${mine ? "Nosso time está neste lado" : "Colocar nosso time neste lado"}"><span class="side-dot ${key}" aria-hidden="true"></span>${DRAFT_SIDE[key]}${mine ? "<small>Nossa equipe</small>" : ""}</button>`
      : `<span class="side-dot ${key}" aria-hidden="true"></span>${DRAFT_SIDE[key]}${mine ? "<small>Nossa equipe</small>" : ""}`
    return `<section class="tx-side-col ${key}${mine ? " mine" : ""}" aria-label="${DRAFT_SIDE[key]}">
      <h3>${heading}</h3>
      <div class="tx-bans" role="group" aria-label="Bans">${bans}</div>
      <ol class="tx-picks">${picks}</ol></section>`
  }
  return `<div class="tx-draft-sides">${column("blue")}${column("red")}</div>`
}

const LANE_ORDER = ["top", "jg", "mid", "adc", "sup", "ban"]

/** Visão Lane: opções por posição reduzidas, sem notas. Clicar num alternativo torna-o principal. */
function laneHTML(c, { LN, img, esc, editable, active }) {
  return `<ol class="tx-priority">${LANE_ORDER.map(k => {
    const lane = LN[k], list = c.lanes[k], ban = k === "ban"
    const champs = list.length
      ? list.map((n, i) => {
        const main = i === 0 && !ban
        const label = ban ? `Ban: ${esc(n)}` : main ? `Principal em ${lane.n}: ${esc(n)}` : `Tornar ${esc(n)} principal em ${lane.n}`
        const content = img(n)
        return `<li class="tx-prio-champ${main ? " main" : ""}" draggable="true" data-n="${esc(n)}" data-from="${k}" title="Arraste para mudar a ordem">${ban || main
          ? `<span class="tx-prio-static" title="${esc(n)}" aria-label="${label}">${content}</span>`
          : `<button type="button" class="tx-prio-alt" data-priority="${esc(n)}" data-lane="${k}" aria-label="${label}" title="${i + 1}ª opção · clique para tornar principal">${content}</button>`}</li>`
      }).join("")
      : `<li class="tx-prio-empty">${ban ? "Sem bans" : "Sem campeão"}</li>`
    const on = editable && active === k
    const name = editable
      ? `<button type="button" class="tx-prio-name${on ? " act" : ""}" data-draft-target="${k}" aria-pressed="${on}" title="Escolher campeões para ${lane.n}">${ban ? "" : laneIconMarkup(k)}${lane.n}</button>`
      : `<span class="tx-prio-name">${ban ? "" : laneIconMarkup(k)}${lane.n}</span>`
    return `<li class="tx-prio-lane${ban ? " bans" : ""}${on ? " act" : ""}" style="--lc:var(${lane.c})">${name}<ol class="tx-prio-champs" data-l="${k}" aria-label="${lane.n} em ordem de prioridade">${champs}</ol></li>`
  }).join("")}</ol>`
}

/** Seletor reduzido de campeões da tática: só os ícones e a busca por nome. */
export function tacticGridHTML(c, { champions, query, active, LN, img, esc }) {
  const q = query.toLowerCase().replace(/[^a-z]/g, "")
  const list = champions.filter(ch => !q || ch.n.toLowerCase().replace(/[^a-z]/g, "").includes(q))
  return list.map(ch => {
    const on = c.lanes[active].includes(ch.n)
    return `<button type="button" class="tx-ch${on ? " on" : ""}" data-tactic-champ="${esc(ch.n)}" aria-pressed="${on}" aria-label="${esc(ch.n)}" title="${esc(ch.n)}">${img(ch.n)}</button>`
  }).join("") || `<p class="tx-grid-empty" role="status">Nenhum campeão encontrado.</p>`
}

/** Prints anexados à tática: miniaturas carregadas depois (as imagens ficam guardadas à parte). */
function printsHTML(images, esc) {
  const items = images.map((id, i) => `<li class="tx-print">
      <button type="button" class="tx-print-open" data-print-open="${esc(id)}" aria-label="Abrir print ${i + 1}" title="Abrir print ${i + 1}"><img alt="" data-print-src="${esc(id)}"></button>
      <button type="button" class="tx-print-remove" data-print-remove="${esc(id)}" aria-label="Remover print ${i + 1}" title="Remover print">${iconMarkup("close")}</button></li>`).join("")
  return `<div class="tx-prints">
    ${images.length ? `<ul class="tx-print-list" aria-label="Prints da tática">${items}</ul>` : ""}
    <div class="tx-print-actions">
      <label class="tx-print-add" data-slot="button" data-variant="outline" data-size="sm">${iconMarkup("plus")} Adicionar print<input type="file" id="tx-print-file" accept="image/*" multiple></label>
      <span class="tx-print-hint">ou cole com Ctrl+V, ou arraste a imagem para o texto</span>
    </div>
  </div>`
}

export function tacticsHTML(c, { compositions, general, text, images = [], hasTactic, panel, active, query, champions, LN, img, esc }) {
  const mark = has => has ? `<span class="tx-has" title="Tem anotação de tática">${iconMarkup("edit")}</span>` : ""
  const tab = (x, on) => `<button type="button" class="dz-tab${on ? " on" : ""}${isSavedTactic(x) ? " tx-saved" : ""}" data-tactic-comp="${esc(x.id)}" aria-pressed="${on}" title="${esc(x.name)}">
      <b>${isSavedTactic(x) ? iconMarkup("book") : sideDot(x)}${esc(x.name)}${mark(hasTactic(x.id))}</b><span class="mini">${compositionPreview(x).map(img).join("") || `<small>${isSavedTactic(x) ? "Tática sem picks" : "vazia"}</small>`}</span></button>`
  const generalTab = `<button type="button" class="dz-tab tx-general${general ? " on" : ""}" data-tactic-general aria-pressed="${general}">
    <b>${iconMarkup("book")}Táticas gerais${mark(hasTactic(null))}</b><span class="mini"><small>Sem composição</small></span></button>`
  const newTab = `<button type="button" class="dz-tab dz-new tx-new" data-tactic-new aria-label="Nova tática" title="Nova tática">${iconMarkup("plus")}<span>Nova tática</span></button>`
  const saved = compositions.filter(isSavedTactic), comps = compositions.filter(x => !isSavedTactic(x))
  const tabs = [...saved, ...comps].map(x => tab(x, !general && x.id === c.id)).join("")
  const editable = !general && isSavedTactic(c)
  const title = general ? "Táticas gerais" : `${editable ? "Tática" : "Táticas"} · ${esc(c.name)}`
  const hint = general
    ? "Ideias de jogo que valem para qualquer composição."
    : editable
      ? "Tática salva: escreva o plano e, se quiser, monte os picks em Draft ou em Lane."
      : "Como jogar com esta composição: rotações, objetivos, lutas e condição de vitória."
  const action = editable
    ? `<button type="button" data-slot="button" data-variant="ghost" data-size="sm" class="tx-action" data-tactic-delete>${iconMarkup("trash")} Excluir tática</button>`
    : `<button type="button" data-slot="button" data-variant="outline" data-size="sm" class="tx-action" data-tactic-save>${iconMarkup("check")} Salvar tática</button>`
  const switcher = general ? "" : `<div class="tx-panel-switch" role="group" aria-label="Visão da comp">${[["draft", "Draft"], ["lane", "Lane"]]
    .map(([value, label]) => `<button type="button" data-tactic-panel="${value}" aria-pressed="${panel === value}"${panel === value ? ' class="on"' : ""}>${label}</button>`).join("")}</div>`
  const body = general
    ? `<p class="tx-draft-empty">Selecione uma composição para ver os picks e bans dela aqui, ou salve este texto como uma tática.</p>`
    : panel === "lane" ? laneHTML(c, { LN, img, esc, editable, active }) : draftSummaryHTML(c, { LN, img, esc, editable, active })
  const picker = editable ? `<div class="tx-picker">
      <div class="tx-picker-head"><span>Campeões para <b>${active === "ban" ? "Bans" : LN[active].n}</b></span>
        <input data-slot="input" id="tx-search" type="search" placeholder="Buscar campeão" aria-label="Buscar campeão pelo nome" value="${esc(query)}"></div>
      <div class="tx-grid" role="group" aria-label="Campeões">${tacticGridHTML(c, { champions, query, active, LN, img, esc })}</div>
    </div>` : ""
  return `<div class="tx">
    <section class="tx-write">
      <label class="tx-title" for="tactics-text">${title}</label>
      <p class="tx-hint">${hint}</p>
      <textarea id="tactics-text" placeholder="Escreva a tática…">${esc(text)}</textarea>
      ${printsHTML(images, esc)}
    </section>
    <aside class="tx-aside" aria-label="Táticas, composições e draft">
      <div class="tx-tabs" role="group" aria-label="Escolher a tática">${generalTab}${newTab}${tabs}</div>
      <div class="tx-draft">
        <div class="tx-panel-row">${switcher}${action}</div>
        ${body}
        ${picker}
      </div>
    </aside>
  </div>`
}
