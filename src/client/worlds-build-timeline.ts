import { games } from "../data/worlds-2026-build-timeline.json"
import { bootItems, directOpponent, isCompletedItem, itemIcon, itemName } from "./worlds-builds"
import { championSlug, esc, ico } from "./worlds-display"

type Game = (typeof games)[number]
type Player = Game["players"][number]
type Entry = { game: Game; player: Player; opponent?: Player; won: boolean }

const minutes = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
const rounds: Record<string, string> = {
  QUARTERFINALS: "Quartas", SEMIFINALS: "Semifinal", FINAL: "Final", FINALS: "Final",
}

function stageLabel(game: Game) {
  const round = rounds[game.round] ?? `Rodada ${game.round.replace(/\D/g, "")}`;
  return `${game.stage === "playin" ? "Play-in · " : ""}${round} · Jogo ${game.number}`;
}

/** Itens que contam como "completos" na visão resumida: itens finais e botas. */
const isMajor = (item: number) => isCompletedItem(item) || bootItems.has(item);

function entriesFor(champion: string, lane: string, opponent: string): Entry[] {
  return games.flatMap(game => game.players
    .filter(player => player.champion === champion && (!lane || player.role === lane))
    .map(player => {
      const side = player.side as "blue" | "red";
      return {
        game, player,
        opponent: directOpponent(game.players, player),
        won: game.winner === side,
      };
    }))
    .filter(entry => !opponent || (entry.opponent && championSlug(entry.opponent.champion) === opponent))
    .sort((a, b) => b.game.date.localeCompare(a.game.date) || b.game.id - a.game.id);
}

/** Primeira compra de cada item completo (sem botas), na ordem do jogo. */
function coreItems(player: Player) {
  const seen = new Set<number>();
  const core: [minute: number, item: number][] = [];
  for (const [minute, items] of player.itemEventsByMinute as [number, number[]][]) {
    for (const item of items) {
      if (item > 0 && isCompletedItem(item) && !seen.has(item)) {
        seen.add(item);
        core.push([minute, item]);
      }
    }
  }
  return core;
}

function firstBoots(player: Player) {
  for (const [minute, items] of player.itemEventsByMinute as [number, number[]][]) {
    const boots = items.find(item => bootItems.has(item));
    if (boots) return [minute, boots] as const;
  }
}

function summary(entries: Entry[]) {
  const total = entries.length;
  const slot = (title: string, picks: (readonly [number, number] | undefined)[]) => {
    const bought = picks.filter((pick): pick is readonly [number, number] => !!pick);
    if (!bought.length) return "";
    const average = bought.reduce((sum, [minute]) => sum + minute, 0) / bought.length;
    const counts = new Map<number, number>();
    for (const [, item] of bought) counts.set(item, (counts.get(item) ?? 0) + 1);
    const [item, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
    const share = `${count} de ${bought.length} jogos`;
    return `<li class="build-timeline-stat">
      <span class="build-timeline-stat-label">${title}</span>
      <span class="build-timeline-stat-item">${itemIcon(item, share)}<span>${esc(itemName(item))}
        <small>${percent.format(count / bought.length * 100)}% · ${share}</small></span></span>
      <strong class="build-timeline-stat-minute" aria-label="Minuto médio ${minutes.format(average)}">${minutes.format(average)}'</strong>
      ${bought.length < total ? `<small class="build-timeline-stat-note">chegou em ${bought.length} de ${total}</small>` : ""}
    </li>`;
  };
  const cores = entries.map(entry => coreItems(entry.player));
  return `<ul class="build-timeline-stats" aria-label="Minuto médio de cada item">
    ${slot("Botas", entries.map(entry => firstBoots(entry.player)))}
    ${[0, 1, 2].map(index => slot(`${index + 1}º item`, cores.map(core => core[index]))).join("")}
  </ul>`;
}

function timeline(player: Player) {
  return `<ol class="build-timeline-events" aria-label="Compras por minuto">${(player.itemEventsByMinute as [number, number[]][])
    .map(([minute, items]) => {
      const major = items.some(item => item > 0 && isMajor(item));
      const icons = items.map(item => {
        const sold = item < 0;
        const id = Math.abs(item);
        const kind = sold ? "sold" : isMajor(id) ? "major" : "minor";
        const usage = sold ? `vendeu aos ${minute} min` : `${minute} min`;
        return `<span class="build-timeline-item" data-kind="${kind}">${itemIcon(id, usage)}</span>`;
      }).join("");
      return `<li class="build-timeline-minute"${major ? " data-major" : ""}><span class="build-timeline-time">${minute}'</span>${icons}</li>`;
    }).join("")}</ol>`;
}

function gameRow({ game, player, opponent, won }: Entry) {
  const [k, d, a] = player.kda;
  return `<li class="build-timeline-game">
    <div class="build-timeline-who">
      <span class="build-timeline-player" aria-label="${esc(`${player.champion} contra ${opponent?.champion ?? "adversário desconhecido"}`)}">
        ${ico(player.champion)}<span class="build-timeline-vs" aria-hidden="true">vs</span>
        ${opponent ? `${ico(opponent.champion)}<strong>${esc(opponent.champion)}</strong>` : '<span class="na">—</span>'}</span>
      <span class="build-timeline-meta">
        <strong class="${won ? "build-sample-wins" : "build-sample-losses"}">${won ? "V" : "D"}</strong>
        <span>${k}/${d}/${a}</span>
        <span>${esc(stageLabel(game))}</span>
        <a href="${esc(game.buildsSource)}" target="_blank" rel="noopener" aria-label="Ver jogo no gol.gg">gol.gg</a>
      </span>
    </div>
    ${timeline(player)}
  </li>`;
}

export function buildTimeline(champion: string, lane: string, opponent = "") {
  const entries = entriesFor(champion, lane, opponent);
  if (!entries.length) return '<p class="na">Sem compras registradas.</p>';
  return `<header class="build-timeline-header">
      <h4>Compras jogo a jogo</h4>
      <div class="build-skill-options build-timeline-view" role="group" aria-label="Quais compras mostrar">
        <button type="button" data-slot="button" data-variant="outline" data-size="sm" data-timeline-view="core" aria-pressed="true">Itens completos e botas</button>
        <button type="button" data-slot="button" data-variant="outline" data-size="sm" data-timeline-view="all" aria-pressed="false">Todas as compras</button>
      </div>
    </header>
    ${summary(entries)}
    <p class="build-data-sample">Minuto médio da primeira compra de cada item completo, em ${entries.length === 1 ? "1 jogo" : `${entries.length} jogos`}. Compras na mesma ida à base aparecem no mesmo minuto. Fonte: gol.gg.</p>
    <ol class="build-timeline-games" data-view="core">${entries.map(gameRow).join("")}</ol>`;
}
