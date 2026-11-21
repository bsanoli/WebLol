import { iconMarkup } from "@/shared/ui/icon"
import { DRAFT_PHASES, DRAFT_SIDE, PICKNAME } from "../model/draft-order"
import {
  DRAFT_LANES,
  draftOf,
  type Composition,
  type ChampionSlot,
  type DraftLane,
  type DraftSide,
} from "../model/local-state"
import type { SlotInfo } from "../model/champion-slots"
import { enemyOrder } from "../model/composition-side"

/** Lado do quadro: o da comp aberta (nós) ou o da comp adversária escolhida. */
export type BoardSide = "us" | "rival"
type Team = "B" | "R"

export type DraftBoardOptions = {
  /** Lado da nossa comp no quadro. */
  side: DraftSide
  active: string
  activeSide: BoardSide
  slots: Record<ChampionSlot, SlotInfo>
  img: (name: string) => string
  esc: (value: unknown) => string
  pickArt: (name: string) => string
}

type Slot = { t: Team; k: "pick" | "ban"; i: number; code: string; n: number }

// Picks e bans têm numeração própria (1º a 10º pick, 1º a 10º ban).
const SLOTS: Slot[] = (() => {
  const list: Slot[] = [],
    count = { B: { pick: 0, ban: 0 }, R: { pick: 0, ban: 0 } },
    total = { pick: 0, ban: 0 }
  for (const [, slots] of DRAFT_PHASES)
    for (const slot of slots) {
      const [t, k] = slot.split(":") as [Team, "pick" | "ban"]
      const i = count[t][k]++
      list.push({ t, k, i, code: t + (k === "ban" ? "B" : "") + (i + 1), n: ++total[k] })
    }
  return list
})()
const slotOf = (t: Team, k: "pick" | "ban", i: number) => SLOTS.find(s => s.t === t && s.k === k && s.i === i)!

export type DraftTeamOptions = DraftBoardOptions & {
  /** Versão pequena para a gaveta de Táticas: sem arte, select de posição nem alternativas. */
  compact?: boolean
  /** Cabeçalho da coluna (lado e dono), usado só na versão compacta. */
  heading?: string
}

/** Uma coluna do quadro: bans e picks de `source` no lado `t`. Sem `source`, o lado fica vazio com o convite para escolher. */
export function draftTeamHTML(
  t: Team,
  owner: BoardSide,
  source: Composition | null,
  order: DraftLane[],
  options: DraftTeamOptions,
) {
  const { active, activeSide, slots, img, esc, pickArt, compact = false, heading = "" } = options
  const side = t === "B" ? "b" : "r"
  const editing = (lane: string) => !!source && activeSide === owner && active === lane

  const mini = (name: string, lane: ChampionSlot, index: number) =>
    `<div class="chip dchip ${index === 0 ? "primary" : "alternative"}" data-team-control draggable="true" data-n="${esc(name)}" data-from="${lane}"${index > 0 ? ` data-champion-slot="${index}" data-champion-name="${esc(name)}"` : ""}><button class="champ-priority" data-priority="${esc(name)}" data-lane="${lane}" data-draft-side="${owner}" aria-label="${index === 0 ? "Principal" : "Tornar principal"}: ${esc(name)} em ${slots[lane].n}" title="${esc(name)} · ${index + 1}ª opção · clique para tornar principal, botão direito para excluir">${img(name)}</button></div>`

  const banSq = (i: number) => {
    const s = slotOf(t, "ban", i),
      name = source?.bans[i]
    if (!source)
      return `<div class="bsq" data-l="ban" data-bi="${i}" data-empty-rival title="${s.n}º ban"><span class="bn">${s.n}</span></div>`
    return `<div class="bsq${name ? " has" : ""} mine${editing("ban") ? " act" : ""}" data-l="ban" data-bi="${i}" data-champion-slot="${i}" data-champion-name="${esc(name)}" title="${s.n}º ban">
      ${name ? `<span class="dm" draggable="true" data-n="${esc(name)}" data-from="ban">${img(name)}<button type="button" class="draft-ban-remove" data-slot="button" data-variant="ghost" data-size="icon-xs" data-rm="${esc(name)}" aria-label="Remover ${esc(name)}">${iconMarkup("close")}</button></span>` : `<span class="bn">${s.n}</span>`}</div>`
  }

  const pick = (i: number) => {
    const s = slotOf(t, "pick", i)
    const meta = `<span class="pkh"><b title="${s.code} · ${s.n}º pick">${PICKNAME[s.code]}</b></span>`
    if (!source) {
      const empty = DRAFT_LANES[i]
      return `<div class="pk ${side} them" data-l="${empty}" data-empty-rival style="--lc:var(${slots[empty].c})"><div class="pick-choice">${meta}${iconMarkup("champion")}<span class="pkn">${slots[empty].n}</span></div></div>`
    }
    const lane = order[i],
      L = slots[lane],
      list = source.lanes[lane as DraftLane],
      main = list[0],
      on = editing(lane)
    // Posição do pick: trocar aqui troca a ordem das posições do lado, igual na Ordem do draft e na gaveta de Táticas.
    const laneSelect = `<select data-team-select="lane" data-pick-position="${i}" data-draft-side="${owner}" aria-label="Posição do pick ${t}${i + 1}">${DRAFT_LANES.map(x => `<option value="${x}"${x === lane ? " selected" : ""}>${slots[x].n}</option>`).join("")}</select>`
    const drag = main ? ` draggable="true" data-n="${esc(main)}" data-from="${lane}"` : ""
    const target = `<button type="button" class="pk-target pick-choice"${drag} data-champion-slot="0" data-champion-name="${esc(main)}" data-draft-target="${lane}" data-draft-side="${owner}" aria-pressed="${on}" aria-label="${PICKNAME[s.code]} ${main ? esc(main) : "Escolher campeão"} · ${L.n}">
          ${meta}${main ? "" : iconMarkup("champion-add")}
          <span class="pkn${main ? "" : " pk-empty"}">${main ? esc(main) : "Escolher campeão"}</span>
        </button>`
    if (compact) {
      // Mesmo desenho da Ordem do draft: arte ao fundo, posição e campeões no topo, nome embaixo.
      const portraits = list
        .map((name, j) =>
          j === 0
            ? `<span class="pk-mini primary" title="${esc(name)}">${img(name)}</span>`
            : `<button type="button" class="pk-mini" data-priority="${esc(name)}" data-lane="${lane}" aria-label="Tornar ${esc(name)} o campeão de ${L.n}" title="${esc(name)} · ${j + 1}ª opção · clique para tornar principal">${img(name)}</button>`,
        )
        .join("")
      return `<div class="pk ${side} mine${on ? " act" : ""}" data-l="${lane}" data-champion-group="${t}-pick-${i}" style="--lc:var(${L.c})">
        ${pickArt(main)}
        <span class="pk-lane"><span class="pk-lane-name lane-label">${laneSelect}</span>${portraits}</span>
        ${target}</div>`
    }
    return `<div class="pk ${side} mine${on ? " act" : ""}" data-l="${lane}" data-champion-group="${t}-pick-${i}" style="--lc:var(${L.c})">
        ${pickArt(main)}
        ${target}
        <div class="pkf"><span class="lane-label">${laneSelect}</span>
        ${main ? mini(main, lane, 0) : ""}
        ${
          list.length > 1
            ? `<div class="alts draft-alternatives" role="group" aria-label="Alternativas de ${L.n}"><span class="draft-alternatives-label" aria-hidden="true">Alternativas</span>${list
                .slice(1)
                .map((name, j) => mini(name, lane, j + 1))
                .join("")}</div>`
            : ""
        }
        </div></div>`
  }

  const bansHead = source
    ? `<button type="button" class="draft-ban-target" data-draft-target="ban" data-draft-side="${owner}" aria-pressed="${editing("ban")}">Bans ${editing("ban") ? '<span class="draft-editing">Editando</span>' : ""}</button>`
    : '<div class="draft-phase">Bans</div>'
  const empty =
    source || compact
      ? ""
      : `<div class="draft-rival-empty"><p>Arraste um campeão para um card para montar a adversária, ou escolha uma que já existe.</p>
    <div class="draft-rival-actions"><button type="button" data-slot="button" data-variant="default" data-size="sm" data-new-rival>${iconMarkup("plus")} Montar adversária</button>
    <button type="button" data-slot="button" data-variant="outline" data-size="sm" data-choose-rival>Escolher existente</button></div></div>`
  const extra = source ? source.bans.slice(5) : []
  const extraBans =
    source && !compact
      ? `<div data-champion-group="${t}-ban-alternatives"${extra.length ? "" : " hidden"}>${extra.length ? `<div class="lbl">Bans alternativos</div><div class="alts" data-l="ban">${extra.map((name, j) => mini(name, "ban", j + 5)).join("")}</div>` : ""}</div>`
      : ""
  return `<section class="tm ${side}${source ? " mine" : ""} ${owner}" data-board-side="${owner}"${source ? ` data-comp-id="${esc(source.id)}"` : ""} aria-label="${DRAFT_SIDE[t === "B" ? "blue" : "red"]} · ${owner === "us" ? "Nossa" : "Adversária"}${source ? ` · ${esc(source.name)}` : ""}">
      ${heading}${empty}
      <div class="draft-bans">
        ${bansHead}
        <div class="bans"${source ? ` data-champion-group="${t}-ban"` : ""} role="group" aria-label="Bans da primeira e da segunda fase">${[0, 1, 2].map(banSq).join("")}<span class="bgap"></span>${[3, 4].map(banSq).join("")}</div>
      </div>
      ${[0, 1, 2].map(pick).join("")}
      <hr class="draft-phase-sep" aria-hidden="true">
      ${[3, 4].map(pick).join("")}
      ${extraBans}</section>`
}

/**
 * Quadro da Ordem do draft: a comp aberta de um lado e a adversária escolhida do outro.
 * Cada lado leva `data-comp-id`, e as edições de um lado gravam na comp daquele lado.
 */
export function draftBoardHTML(comp: Composition, enemy: Composition | null, options: DraftBoardOptions) {
  const draft = draftOf(comp),
    oursSide = options.side,
    us: Team = oursSide === "blue" ? "B" : "R"
  const team = (t: Team) => {
    const owner: BoardSide = t === us ? "us" : "rival"
    const source = owner === "us" ? comp : enemy
    const order: DraftLane[] = source
      ? owner === "us"
        ? draft.order[oursSide]
        : enemyOrder(source, oursSide)
      : DRAFT_LANES
    return draftTeamHTML(t, owner, source, order, options)
  }

  return `<div class="dz">${team("B")}
    <div class="dz-center">
      <div class="dz-slot"></div>
    </div>
    ${team("R")}</div>`
}
