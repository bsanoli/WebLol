import { iconMarkup } from "@/shared/ui/icon"
import { compositionPreviewHTML } from "./composition-preview"
import { DRAFT_SIDE } from "../model/draft-order"
import { draftOf, type Composition, type ChampionSlot, type DraftLane, type DraftSide } from "../model/local-state"
import type { SlotInfo } from "../model/champion-slots"
import { enemiesOf, isEnemy, oppositeSide, oursOf, enemyOrder, ownerOf } from "../model/composition-side"
import { opggOf } from "../model/tactics"
import { draftTeamHTML } from "./draft-board"
import { positionBoardHTML, type PositionSide } from "./tactic-position-board"
import { allMatchups, findMatchup, matchupKey, matchupTitle, type Matchup, type MatchupEntry } from "../model/matchups"

type ListKey = "ours" | "enemy" | "matchup"
const NEW_LABEL: Record<ListKey, string> = {
  ours: "Nova composição nossa",
  enemy: "Nova adversária",
  matchup: "Novo confronto",
}
type Markup = {
  slots: Record<ChampionSlot, SlotInfo>
  img: (name: string) => string
  esc: (value: unknown) => string
  pickArt: (name: string) => string
}

/** Bolinha do lado salvo na comp, à esquerda dos retratos na lista. */
function sideMark(side: DraftSide) {
  const label = side === "blue" ? "Lado azul" : "Lado vermelho"
  return `<span class="side-dot ${side} comp-side-mark" role="img" aria-label="${label}" title="${label}"></span>`
}

/** Lado da comp na lista: dentro do confronto aberto vale o lado dele; fora, a nossa é azul e a adversária, vermelha. */
function sideInContext(comp: Composition, matchup: Matchup | null): DraftSide {
  if (matchup?.ours === comp.id) return matchup.side
  if (matchup?.enemy === comp.id) return oppositeSide(matchup.side)
  return isEnemy(comp) ? "red" : "blue"
}

/** Coluna do quadro: cabeçalho do lado e, abaixo, os picks e bans no mesmo desenho da Ordem do draft, só que compacto. */
function boardColumn(
  side: DraftSide,
  owner: "us" | "rival",
  source: Composition,
  order: DraftLane[],
  who: string,
  { slots, img, esc, pickArt }: Markup,
) {
  const heading = `<h3><span class="side-dot ${side}" aria-hidden="true"></span>${DRAFT_SIDE[side]}<small>${who} · ${esc(source.name)}</small></h3>`
  const board = draftTeamHTML(side === "blue" ? "B" : "R", owner, source, order, {
    side,
    active: "",
    activeSide: owner,
    slots,
    img,
    esc,
    pickArt,
    compact: true,
  })
  return `<div class="tx-side-col ${side}" data-drop-side="${side}" aria-label="${DRAFT_SIDE[side]}">${heading}${board}</div>`
}

/** Lado sem comp: convida a soltar uma composição aqui. */
function emptyColumn(side: DraftSide, hint: string) {
  return `<div class="tx-side-col ${side} empty" data-drop-side="${side}" aria-label="${DRAFT_SIDE[side]}">
    <h3><span class="side-dot ${side}" aria-hidden="true"></span>${DRAFT_SIDE[side]}</h3><p class="tx-col-empty">${hint}</p></div>`
}

/** Visão do quadro de Táticas: Draft (cards com a arte) ou Lane (só ícones, uma linha por posição). */
export type TacticBoardView = "draft" | "positions"

/** Quem ocupa cada lado: com confronto, cada comp no seu lado; com uma comp só, ela fica no lado salvo e o outro espera o par. */
function boardSides(c: Composition, general: boolean, matchup: MatchupEntry | null) {
  const sides: Record<DraftSide, PositionSide> = { blue: null, red: null }
  let hint = "Arraste uma composição da lista para este lado."
  if (matchup) {
    const { ours, enemy } = matchup,
      side = matchup.matchup.side
    if (ours) sides[side] = { owner: "us", source: ours, who: "Nossa" }
    if (enemy) sides[oppositeSide(side)] = { owner: "rival", source: enemy, who: "Adversária" }
    hint = "Arraste uma composição da lista para este lado e complete o confronto."
  } else if (!general) {
    const enemy = isEnemy(c)
    sides[enemy ? "red" : "blue"] = { owner: "us", source: c, who: enemy ? "Adversária" : "Nossa" }
    hint = enemy
      ? "Arraste uma composição nossa para este lado e monte o confronto."
      : "Arraste uma adversária para este lado e monte o confronto."
  }
  return { sides, hint }
}

/** Ordem dos picks de cada lado no desenho da Ordem do draft. */
function pickOrder(side: DraftSide, entry: NonNullable<PositionSide>, matchup: MatchupEntry | null) {
  return matchup && entry.owner === "rival"
    ? enemyOrder(entry.source, matchup.matchup.side)
    : draftOf(entry.source).order[side]
}

/** Alternador Draft | Lane, acima do quadro. */
function boardSwitchHTML(view: TacticBoardView) {
  const btn = (key: TacticBoardView, label: string, title: string) =>
    `<button type="button" class="tx-scope-btn" data-tactic-board="${key}" aria-pressed="${view === key}" title="${title}">${label}</button>`
  return `<div class="tx-board-switch" role="group" aria-label="Visão do quadro">${btn("draft", "Draft", "Cards com a arte dos campeões, na ordem do draft")}${btn("positions", "Lane", "Só os ícones, uma linha por posição")}</div>`
}

/** Quadro editável da gaveta, sempre com os dois lados; cada lado aceita uma composição arrastada da lista. */
function tacticBoardHTML(
  c: Composition,
  general: boolean,
  matchup: MatchupEntry | null,
  view: TacticBoardView,
  markup: Markup,
  canUndo: boolean,
) {
  const { sides, hint } = boardSides(c, general, matchup)
  const col = (side: DraftSide) => {
    const entry = sides[side]
    return entry
      ? boardColumn(side, entry.owner, entry.source, pickOrder(side, entry, matchup), entry.who, markup)
      : emptyColumn(side, hint)
  }
  const board =
    view === "positions"
      ? positionBoardHTML(sides, hint, markup)
      : `<div class="tx-draft-sides">${col("blue")}${col("red")}</div>`
  const swap = matchup
    ? `<button type="button" data-slot="button" data-variant="outline" data-size="sm" class="tx-swap-sides" data-matchup-swap title="Trocar os lados do confronto">${iconMarkup("swap")} Trocar lados</button>`
    : ""
  const undo = `<button type="button" data-slot="button" data-variant="outline" data-size="sm" class="tx-undo" data-undo-last${canUndo ? "" : " hidden"} title="Desfazer a última mudança (Ctrl+Z)">${iconMarkup("undo")} Desfazer</button>`
  const open = general
    ? ""
    : `<button type="button" data-slot="button" data-variant="outline" data-size="sm" class="tx-open-draft" data-open-draft>${iconMarkup("next")} Editar na Ordem do draft</button>`
  return `<div class="tx-board-bar"><div class="tx-board-bar-start">${boardSwitchHTML(view)}${undo}</div><div class="tx-board-bar-end">${swap}${open}</div></div>${board}`
}

/** Cabeçalho da comp: de quem ela é (só leitura; muda pelo menu ⋯ da Ordem do draft) e, na adversária, o OP.GG do time. */
function teamToolsHTML(c: Composition, esc: Markup["esc"], matchup: MatchupEntry | null, hidden = false) {
  const team = matchup ? "enemy" : ownerOf(c),
    link = matchup ? (matchup.enemy ? opggOf(matchup.enemy) : "") : opggOf(c)
  const tag = matchup
    ? `<span class="tx-team-tag mine">Confronto</span>`
    : `<span class="tx-team-tag ${team}">${team === "enemy" ? "Adversária" : "Nossa"}</span>`
  const opgg =
    team === "enemy"
      ? `<button type="button" data-slot="button" data-variant="outline" data-size="sm" class="tx-opgg${link ? " has" : ""}" data-tactic-opgg
    aria-label="${link ? "Abrir o OP.GG do time. Botão direito para trocar o link" : "Adicionar o link do OP.GG do time"}"
    title="${
      link
        ? `${esc(link)}
Botão direito: trocar o link`
        : "Clique para colocar o link do OP.GG"
    }">${iconMarkup("link")} ${link ? "OP.GG" : "+ OP.GG"}</button>`
      : ""
  // Em Táticas gerais as ferramentas ficam invisíveis, mas ocupam o lugar: o alternador não muda de posição.
  return `<div class="tx-team-tools"${hidden ? ' inert aria-hidden="true"' : ""}>${tag}${opgg}</div>`
}

export type TacticsOptions = Markup & {
  compositions: Composition[]
  general: boolean
  drawer?: boolean
  /** Lista de composições recolhida: só as abas aparecem e o quadro ganha altura. */
  listCollapsed?: boolean
  /** Há uma ação para desfazer; o botão fica visível ao lado de "Trocar lados". */
  canUndo?: boolean
  hasTactic: (id: string | null) => boolean
  matchups: Matchup[]
  /** Confronto aberto (id), quando a tática em edição é a dele. */
  matchupId?: string | null
  /** Visão do quadro; Draft quando não há escolha salva. */
  boardView?: TacticBoardView
}

export function tacticsHTML(
  c: Composition,
  {
    compositions,
    matchups: matchupList,
    general,
    hasTactic,
    matchupId = null,
    drawer = true,
    listCollapsed = false,
    canUndo = false,
    boardView = "draft",
    slots,
    img,
    esc,
    pickArt,
  }: TacticsOptions,
) {
  const mark = (has: boolean) =>
    has ? `<span class="tx-has" title="Tem anotação de tática">${iconMarkup("edit")}</span>` : ""
  const tab = (x: Composition) => {
    const on = !general && !active && x.id === c.id
    return `<button type="button" class="dz-tab${on ? " on" : ""}" data-tactic-comp="${esc(x.id)}" draggable="true" aria-pressed="${on}" title="${esc(x.name)}">
      <b>${esc(x.name)}${mark(hasTactic(x.id))}</b>${sideMark(sideInContext(x, active?.matchup ?? null))}<span class="mini">${compositionPreviewHTML(x, img) || "<small>vazia</small>"}</span></button>`
  }
  const ours = oursOf(compositions),
    enemies = enemiesOf(compositions),
    matchups = allMatchups(compositions, matchupList)
  const active = general ? null : findMatchup(compositions, matchupList, matchupId)
  const shown: ListKey = active ? "matchup" : !general && isEnemy(c) ? "enemy" : "ours"
  const matchupRow = ({ ours: o, enemy: e, matchup }: MatchupEntry) => {
    const on = active?.matchup.id === matchup.id,
      title = esc(matchupTitle({ matchup, ours: o, enemy: e }))
    const side = matchup.side
    return `<div class="tx-mx-row"><button type="button" class="dz-tab side-${side}${on ? " on" : ""}" data-tactic-matchup="${esc(matchup.id)}" aria-pressed="${on}" title="${title} · nossa composição no lado ${side === "blue" ? "azul" : "vermelho"}">
      <b>${title}${mark(hasTactic(matchupKey(matchup.id)))}</b></button>
      <button type="button" class="tx-mx-del" data-matchup-delete="${esc(matchup.id)}" aria-label="Excluir o confronto ${title}" title="Excluir o confronto (as composições ficam)">${iconMarkup("trash")}</button></div>`
  }
  const footer = (team: ListKey) =>
    `<button type="button" class="tx-new" data-slot="button" data-variant="ghost" data-size="sm" ${team === "matchup" ? "data-matchup-new" : `data-comp-new="${team}"`}>${iconMarkup("plus")} ${NEW_LABEL[team]}</button>`
  const panel = (
    team: ListKey,
    items: string,
    empty: string,
  ) => `<div class="tx-group ${team}" id="tx-list-${team}" role="tabpanel" aria-labelledby="tx-listtab-${team}"${team === shown ? "" : " hidden"}>
    ${footer(team)}${items || `<p class="tx-group-empty">${empty}</p>`}</div>`
  const listTab = (team: ListKey, label: string, count: number) =>
    `<button type="button" role="tab" class="tx-listtab ${team}" id="tx-listtab-${team}" data-tx-list="${team}" aria-controls="tx-list-${team}" aria-selected="${team === shown}" tabindex="${team === shown ? 0 : -1}">${label}<small>${count}</small></button>`
  const scope = `<div class="tx-scope" role="group" aria-label="Tática aberta">
    <button type="button" class="tx-scope-btn" data-tactic-comp="${esc(c.id)}" aria-pressed="${!general}" title="Táticas da composição aberta">Esta composição</button>
    <button type="button" class="tx-scope-btn" data-tactic-general aria-pressed="${general}" title="Ideias de jogo que valem para qualquer composição"><b>Gerais${mark(hasTactic(null))}</b></button></div>`
  const enemy = !general && !active && isEnemy(c)
  const title = general ? "Táticas gerais" : `Táticas · ${esc(active ? matchupTitle(active) : c.name)}`
  const hint = general
    ? "Ideias de jogo que valem para qualquer composição."
    : active
      ? ""
      : enemy
        ? "Como jogar contra esta composição: ameaças, picks a negar e como vencer as lutas."
        : "Como jogar com esta composição: rotações, objetivos, lutas e condição de vitória."
  const body = tacticBoardHTML(c, general, active, boardView, { slots, img, esc, pickArt }, canUndo)
  const drawerToggle = `<button type="button" data-slot="button" data-variant="outline" data-size="sm" class="tx-drawer-toggle" data-tactic-drawer
    aria-expanded="${drawer}" aria-controls="tx-aside" title="${drawer ? "Esconder a lista de composições e o draft" : "Mostrar a lista de composições e o draft"}">${iconMarkup("next")}<span>Composições e draft</span></button>`
  return `<div class="tx${drawer ? "" : " drawer-closed"}">
    <section class="tx-write">
      <div class="tx-head">
        <div class="tx-head-text"><h2 class="tx-title" id="tx-title">${title}</h2>
        ${hint ? `<p class="tx-hint">${hint}</p>` : ""}</div>
        ${teamToolsHTML(c, esc, active, general)}
        ${scope}
        ${drawerToggle}
      </div>
      <div class="tx-notes-slot" data-tactic-notes-slot><p class="tx-notes-loading">Carregando o bloco de notas…</p></div>
    </section>
    <aside class="tx-aside" id="tx-aside" aria-label="Composições e draft"${drawer ? "" : " inert"}>
      <div class="tx-tabs${listCollapsed ? " list-collapsed" : ""}">
        <div class="tx-listbar"><div class="tx-listtabs" role="tablist" aria-label="Composições">${listTab("ours", "Nossas", ours.length)}${listTab("enemy", "Adversárias", enemies.length)}${listTab("matchup", "Confrontos", matchups.length)}</div>
        <button type="button" class="tx-list-toggle" data-slot="button" data-variant="outline" data-size="sm" data-tactic-list-toggle aria-expanded="${!listCollapsed}" aria-label="Lista de composições" title="${listCollapsed ? "Mostrar a lista" : "Recolher a lista"}">${iconMarkup("next")}</button></div>
        ${panel("ours", ours.map(tab).join(""), "Nenhuma composição ainda.")}${panel("enemy", enemies.map(tab).join(""), "Nenhuma adversária ainda.")}${panel("matchup", matchups.map(matchupRow).join(""), "Nenhum confronto ainda. Junte uma composição nossa a uma adversária.")}
      </div>
      <div class="tx-draft">${body}</div>
    </aside>
  </div>`
}
