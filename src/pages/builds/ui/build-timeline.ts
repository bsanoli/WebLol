import type { games } from "@dataset/build-timeline"
import { bootItems, isCompletedItem, itemIcon, itemName, playerLoadout } from "./build-icons"
import { directOpponent } from "../model/build-statistics"
import { ico } from "@/entities/champion"
import { championSlug, esc } from "@/entities/match"
import { DATASET, isReference } from "@/shared/dataset"
import { revealContent } from "@/shared/lib/motion"
import { requireElement } from "@/shared/lib/dom"

export type TimelineGame = (typeof games)[number]
type Game = TimelineGame
type Player = Game["players"][number]
type Entry = { game: Game; player: Player; opponent?: Player; won: boolean }

const minutes = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
const number = new Intl.NumberFormat("pt-BR")
const gamesPerPage = 5
const rounds: Record<string, string> = {
  // biome-ignore-start lint/style/useNamingConvention: chaves vindas da API de partidas
  QUARTERFINALS: "Quartas",
  SEMIFINALS: "Semifinal",
  FINAL: "Final",
  FINALS: "Final",
  // biome-ignore-end lint/style/useNamingConvention: fim da exceção
}

function stageLabel(game: Game, player: Player) {
  if (game.stage === "soloq")
    return `${player.player} · ${game.round} · ${new Date(`${game.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
  const round = rounds[game.round] ?? `Rodada ${game.round.replace(/\D/g, "")}`
  return `${game.stage === "playin" ? "Play-in · " : ""}${round} · Jogo ${game.number}`
}

/** Itens que contam como "completos" na visão resumida: itens finais e botas. */
const isMajor = (item: number) => isCompletedItem(item) || bootItems.has(item)

function entriesFor(games: TimelineGame[], champion: string, lane: string, opponent: string): Entry[] {
  return games
    .flatMap(game =>
      game.players
        .filter(
          player =>
            !isReference(player) &&
            player.champion === champion &&
            (!lane || player.role === lane) &&
            player.itemEventsByMinute?.some(([, items]) => Array.isArray(items) && items.length > 0),
        )
        .map(player => {
          const side = player.side as "blue" | "red"
          return {
            game,
            player,
            opponent: directOpponent(game.players, player),
            won: game.winner === side,
          }
        }),
    )
    .filter(entry => !opponent || (entry.opponent && championSlug(entry.opponent.champion) === opponent))
    .sort((a, b) => b.game.date.localeCompare(a.game.date) || b.game.id - a.game.id)
}

/** Primeira compra de cada item completo (sem botas), na ordem do jogo. */
function coreItems(player: Player) {
  const seen = new Set<number>()
  const core: [minute: number, item: number][] = []
  for (const [minute, items] of player.itemEventsByMinute as [number, number[]][]) {
    for (const item of items) {
      if (item > 0 && isCompletedItem(item) && !seen.has(item)) {
        seen.add(item)
        core.push([minute, item])
      }
    }
  }
  return core
}

function firstBoots(player: Player) {
  for (const [minute, items] of player.itemEventsByMinute as [number, number[]][]) {
    const boots = items.find(item => bootItems.has(item))
    if (boots) return [minute, boots] as const
  }
}

function summary(entries: Entry[]) {
  const slot = (title: string, picks: (readonly [number, number] | undefined)[]) => {
    const bought = picks.filter((pick): pick is readonly [number, number] => !!pick)
    if (!bought.length) return ""
    const average = bought.reduce((sum, [minute]) => sum + minute, 0) / bought.length
    const counts = new Map<number, number>()
    for (const [, item] of bought) counts.set(item, (counts.get(item) ?? 0) + 1)
    const [item, count] = [...counts].sort((a, b) => b[1] - a[1])[0]
    const share = `${count} de ${bought.length} jogos`
    return `<li class="build-timeline-stat">
      <span class="build-timeline-stat-label">${title}</span>
      <span class="build-timeline-stat-icon">${itemIcon(item, share)}</span>
      <span class="build-timeline-stat-item">${esc(itemName(item))}</span>
      <strong class="build-timeline-stat-minute" aria-label="Minuto médio ${minutes.format(average)}">${minutes.format(average)}′</strong>
      <small class="build-timeline-stat-frequency">${percent.format((count / bought.length) * 100)}% · ${share}</small>
    </li>`
  }
  const cores = entries.map(entry => coreItems(entry.player))
  const stats = [
    slot(
      "Botas",
      entries.map(entry => firstBoots(entry.player)),
    ),
    ...[0, 1, 2].map(index =>
      slot(
        `${index + 1}º item`,
        cores.map(core => core[index]),
      ),
    ),
  ].join("")
  if (!stats) return ""
  return `<ul class="build-timeline-stats" aria-label="Minuto médio de compra">${stats}</ul>
    <p class="build-data-sample">A média e a frequência consideram só as partidas com compra naquela etapa. O percentual se refere ao item exibido.</p>`
}

function timeline(player: Player) {
  const events = (player.itemEventsByMinute as [number, number[]][]).filter(([, items]) => items.length)
  const hasMajor = events.some(([, items]) => items.some(item => item > 0 && isMajor(item)))
  return `<ol class="build-timeline-events" aria-label="Compras por minuto">${events
    .map(([minute, items]) => {
      const isMajorMinute = items.some(item => item > 0 && isMajor(item))
      const icons = items
        .map(item => {
          const isSold = item < 0
          const id = Math.abs(item)
          const kind = isSold ? "sold" : isMajor(id) ? "major" : "minor"
          const usage = isSold ? `vendeu aos ${minute} min` : `${minute} min`
          return `<span class="build-timeline-item" data-kind="${kind}">${itemIcon(id, usage)}</span>`
        })
        .join("")
      return `<li class="build-timeline-minute"${isMajorMinute ? " data-major" : ""}><span class="build-timeline-time">${minute}'</span><div class="build-timeline-items">${icons}</div></li>`
    })
    .join("")}</ol>
    ${hasMajor ? "" : '<p class="build-timeline-no-major">Sem itens completos ou botas.</p>'}`
}

function gameRow({ game, player, opponent, won }: Entry) {
  const [k, d, a] = player.kda
  return `<li class="build-timeline-game">
    <div class="build-timeline-who">
      <span class="build-timeline-player" aria-label="${esc(`${player.champion} contra ${opponent?.champion ?? "adversário desconhecido"}`)}">
        <span class="build-timeline-portraits" aria-hidden="true">
          ${ico(player.champion)}<span class="build-timeline-vs">vs</span>${opponent ? ico(opponent.champion) : ""}
        </span>
        ${opponent ? `<strong>${esc(opponent.champion)}</strong>` : '<span class="na">Adversário desconhecido</span>'}
      </span>
      <span class="build-timeline-meta">
        <strong class="${won ? "build-sample-wins" : "build-sample-losses"}">${won ? "V" : "D"}</strong>
        <span>${k}/${d}/${a}</span>
        <span>${esc(stageLabel(game, player))}</span>
      </span>
      ${playerLoadout(player)}
      <a class="build-timeline-source" data-slot="button" data-variant="ghost" data-size="icon-sm"
        href="${esc(game.buildsSource)}" target="_blank" rel="noopener"
        aria-label="Abrir histórico da partida no ${DATASET.sourceName} em nova aba" title="Ver histórico no ${DATASET.sourceName}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 3h6v6m0-6-9 9m6 1v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        </svg>
      </a>
    </div>
    ${timeline(player)}
  </li>`
}

export function renderBuildTimeline(section: HTMLElement, games: TimelineGame[]) {
  const { buildTimeline: champion = "", lane = "", opponent = "" } = section.dataset
  const entries = entriesFor(games, champion, lane, opponent)
  if (!entries.length) {
    section.innerHTML =
      '<header class="build-timeline-header"><h4>Compras jogo a jogo</h4></header><p class="na" role="status">Sem compras registradas.</p>'
    return
  }
  let visible = Math.min(gamesPerPage, entries.length)
  const status = () =>
    `Mostrando ${number.format(visible)} de ${number.format(entries.length)} ${entries.length === 1 ? "partida" : "partidas"}`
  const loadLabel = () => {
    const next = Math.min(gamesPerPage, entries.length - visible)
    return next === 1 ? "Carregar mais 1 partida" : `Carregar mais ${next} partidas`
  }
  section.innerHTML = `<header class="build-timeline-header">
      <h4>Compras jogo a jogo</h4>
    </header>
    ${summary(entries)}
    <div class="build-timeline-toolbar">
      <p class="build-timeline-count" role="status">${status()}</p>
      <div class="build-skill-options build-timeline-view" role="group" aria-label="Quais compras mostrar">
        <button type="button" data-slot="button" data-variant="outline" data-size="sm" data-timeline-view="core" aria-pressed="true">Itens completos e botas</button>
        <button type="button" data-slot="button" data-variant="outline" data-size="sm" data-timeline-view="all" aria-pressed="false">Todas as compras</button>
      </div>
    </div>
    <div class="build-timeline-columns" aria-hidden="true"><span>Confronto</span><span>Compras por minuto</span></div>
    <ol class="build-timeline-games" data-view="core">${entries.slice(0, visible).map(gameRow).join("")}</ol>
    <footer class="build-timeline-footer">
      ${visible < entries.length ? `<button type="button" data-slot="button" data-variant="outline" data-size="sm" class="build-timeline-more">${loadLabel()}</button>` : ""}
      <p class="build-data-sample">${DATASET.sourceNote}</p>
    </footer>`

  const list = requireElement<HTMLOListElement>(".build-timeline-games", section)
  const count = requireElement<HTMLElement>(".build-timeline-count", section)
  const more = section.querySelector<HTMLButtonElement>(".build-timeline-more")
  more?.addEventListener("click", () => {
    const start = visible
    visible = Math.min(start + gamesPerPage, entries.length)
    list.insertAdjacentHTML("beforeend", entries.slice(start, visible).map(gameRow).join(""))
    count.textContent = status()
    for (const row of Array.from(list.children).slice(start)) revealContent(row, true)
    const firstAdded = list.children[start] as HTMLElement
    firstAdded.tabIndex = -1
    firstAdded.focus()
    if (visible === entries.length) more.remove()
    else more.textContent = loadLabel()
  })
}
