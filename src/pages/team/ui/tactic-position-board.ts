// Visão Lane do quadro de Táticas: cada linha é uma posição (bans e as cinco lanes), com os dois lados lado a lado.
// Cada linha tem a arte do campeão ao fundo, o ícone quadrado como na Ordem do draft e as alternativas; o principal só se arrasta.
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { DRAFT_SIDE } from "../model/draft-order"
import { DRAFT_LANES, type ChampionSlot, type Composition, type DraftSide } from "../model/local-state"
import type { SlotInfo } from "../model/champion-slots"
import { pickCardHTML } from "./tactic-pick-card"

type PositionMarkup = {
  slots: Record<ChampionSlot, SlotInfo>
  img: (name: string) => string
  esc: (value: unknown) => string
  pickArt: (name: string) => string
}

/** Um lado do quadro: a comp, de quem ela é, ou nada (o lado espera uma composição arrastada). */
export type PositionSide = { owner: "us" | "rival"; source: Composition; who: string } | null

const ROWS: ChampionSlot[] = ["ban", ...DRAFT_LANES]

function positionCell(
  lane: ChampionSlot,
  owner: "us" | "rival",
  source: Composition,
  side: DraftSide,
  { slots, img, esc, pickArt }: PositionMarkup,
) {
  const L = slots[lane]
  const list = lane === "ban" ? source.bans : source.lanes[lane]
  const icon = (name: string, index: number) => {
    const drag = `draggable="true" data-n="${esc(name)}" data-from="${lane}"`
    if (lane === "ban")
      return `<span class="tx-pos-ic ban" ${drag} role="img" aria-label="Ban: ${esc(name)}" title="${esc(name)} · ${index + 1}º ban">${img(name)}</span>`
    if (index === 0)
      return `<span class="tx-pos-ic main" ${drag} role="img" aria-label="${L.n}: ${esc(name)}" title="${esc(name)} · principal em ${L.n}">${img(name)}<span class="tx-pos-champ">${esc(name)}</span></span>`
    return `<button type="button" class="tx-pos-ic alt" ${drag} data-priority="${esc(name)}" data-lane="${lane}" aria-label="Tornar ${esc(name)} o campeão de ${L.n}" title="${esc(name)} · ${index + 1}ª opção · clique para tornar principal">${img(name)}</button>`
  }
  const add = `<button type="button" class="tx-pos-add" data-draft-target="${lane}" data-draft-side="${owner}" aria-label="${list.length ? `Adicionar em ${L.n}` : `Escolher campeão de ${L.n}`}" title="${list.length ? `Adicionar em ${L.n}` : `Escolher campeão de ${L.n}`}">${iconMarkup("plus")}</button>`
  const art = lane === "ban" || !list.length ? "" : pickArt(list[0])
  return pickCardHTML({
    side,
    // Na Lane os dois lados apontam para o centro: a barra fica na borda de dentro.
    bar: side === "blue" ? "end" : "start",
    className: `tx-pos-slot ${lane}${art ? " has-art" : ""}`,
    attrs: `data-l="${lane}" style="--lc:var(${L.c})" role="group" aria-label="${L.n}"`,
    children: `${art}${list.map(icon).join("")}${lane === "ban" || !list.length ? add : ""}`,
  })
}

function positionColumn(side: DraftSide, entry: PositionSide, hint: string, markup: PositionMarkup) {
  const label = DRAFT_SIDE[side],
    edge = side === "blue" ? "left" : "right"
  if (!entry)
    return `<div class="tx-side-col tx-pos-col ${side} ${edge} empty" data-drop-side="${side}" aria-label="${label}">
    <h3 aria-hidden="true"></h3><p class="tx-col-empty">${hint}</p></div>`
  const { owner, source, who } = entry
  return `<div class="tx-side-col tx-pos-col ${side} ${edge}" data-drop-side="${side}" aria-label="${label}">
    <h3><span class="side-dot ${side}" aria-hidden="true"></span><b class="tx-side-name">${label}</b><small title="${who} · ${markup.esc(source.name)}">${who} · ${markup.esc(source.name)}</small></h3>
    <div class="tx-pos-cells" data-board-side="${owner}" data-comp-id="${markup.esc(source.id)}">${ROWS.map(lane => positionCell(lane, owner, source, side, markup)).join("")}</div></div>`
}

/**
 * Quadro em linhas: azul à esquerda, as posições no meio e vermelho à direita, como na visão Draft.
 * Os dois lados apontam para o centro: na coluna da esquerda a linha corre da direita para a esquerda.
 */
export function positionBoardHTML(sides: Record<DraftSide, PositionSide>, hint: string, markup: PositionMarkup) {
  const labels = ROWS.map(
    lane =>
      `<span class="tx-pos-name ${lane}" style="--lc:var(${markup.slots[lane].c})" title="${markup.slots[lane].n}">${laneIconMarkup(lane) || markup.slots[lane].n}</span>`,
  ).join("")
  return `<div class="tx-pos-board">${positionColumn("blue", sides.blue, hint, markup)}
    <div class="tx-pos-names" aria-hidden="true"><span class="tx-pos-names-head"></span>${labels}</div>
    ${positionColumn("red", sides.red, hint, markup)}</div>`
}
