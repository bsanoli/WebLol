import { laneIconMarkup } from "@/shared/ui/icon"
import { championBuild, opponentBuild, type Champion, type Frequency, type LaneSample } from "../model/build-statistics"
import { encountersStatus } from "../model/encounters"
import { esc, kdaOf, teamLogo } from "@/entities/match"
import { runePage } from "./runes"
import { buildSkills } from "./build-skills"
import { completedItems, gameCount, itemOption, percent, spellOption, starterOption, type Option } from "./build-icons"

function buildSample(sample: LaneSample, position?: string, action = "") {
  const counts = (entries: LaneSample["players"], shouldShowTeamLogo = false) =>
    `<ul class="build-sample-counts">${entries
      .map(
        ([name, count]) =>
          `<li><span class="build-sample-person">${shouldShowTeamLogo ? teamLogo(String(name)) : ""}${esc(name)}</span><strong>${count}</strong></li>`,
      )
      .join("")}</ul>`
  const metrics = [
    ["KDA", kdaOf(sample.avgKills, sample.avgDeaths, sample.avgAssists).toFixed(2)],
    ["Abates", sample.avgKills.toFixed(1)],
    ["Mortes", sample.avgDeaths.toFixed(1)],
    ["Assistências", sample.avgAssists.toFixed(1)],
  ]
  return `<section class="build-sample" aria-label="Amostra${position ? ` de ${esc(position)}` : ""}">
    <header class="build-sample-heading">
      <h4>${position ? laneIconMarkup(position) + esc(position) : "Amostra"}</h4>
      <span>${sample.sampleGames < sample.picks ? `${sample.sampleGames} de ${gameCount(sample.picks)}` : gameCount(sample.sampleGames)} na amostra</span>
      ${action}
    </header>
    <div class="build-sample-grid">
      <div class="build-sample-performance">
        <div class="build-sample-record"><strong class="build-sample-wins">${sample.wins}V</strong><span>/</span><strong class="build-sample-losses">${sample.sampleGames - sample.wins}D</strong></div>
        <dl class="build-sample-metrics">${metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
      </div>
      <div><div class="build-sample-list-heading"><h5>Quem jogou</h5><span>· jogos</span></div>${counts(sample.players)}</div>
      <div><div class="build-sample-list-heading"><h5>Times</h5><span>· jogos</span></div>${counts(sample.teams, true)}</div>
    </div>
  </section>`
}

function frequencyList(options: Option[]) {
  const iconColumns = Math.max(1, ...options.map(option => option.icons.filter(Boolean).length))
  return `<ul class="items build-frequency" style="--build-item-icons:${iconColumns}">${options
    .map(
      option =>
        `<li class="item"><span class="item-name"><span class="build-frequency-icons">${option.icons.join("")}</span><span>${esc(option.label)}</span></span><span class="pb" aria-hidden="true"><i style="width:${option.percent}%"></i></span><span class="p">${percent.format(option.percent)}%</span></li>`,
    )
    .join("")}</ul>`
}

function buildHtml(champion: Champion, lane: string, hasTimeline: boolean, opponent: string) {
  if (opponent && encountersStatus(champion.name) !== "ready") {
    return encountersStatus(champion.name) === "error"
      ? `<p class="build-data-sample" role="status">Não foi possível carregar os confrontos de ${esc(champion.name)}. Escolha o adversário de novo para tentar outra vez.</p>`
      : `<p class="build-data-sample" role="status">Carregando os confrontos de ${esc(champion.name)}…</p>`
  }
  const build = opponent ? opponentBuild(champion, lane, opponent) : championBuild(champion, lane)
  if (!build) return `<span class="na">Sem build coletada para ${esc(champion.name)}.</span>`
  const { games } = build
  const section = (title: string, content: string) => `<div class="build-section"><h5>${title}</h5>${content}</div>`
  const items = (entries: Frequency<number>[]) => frequencyList(entries.map(entry => itemOption(entry, games)))
  const boots = new Set(build.boots.map(entry => entry.value))
  const equipment = build.finalItems.filter(entry => !boots.has(entry.value))
  const featured = equipment.filter(entry => completedItems.has(entry.value)).slice(0, 6)
  const topItems = featured.length ? featured : equipment.slice(0, 6)
  return `<div class="build">
      <section class="build-column">
        <h4>Build e feitiços</h4>
        ${section(
          "Itens iniciais",
          build.starterItems?.length
            ? frequencyList(build.starterItems.map(entry => starterOption(entry, games)))
            : '<span class="na">Sem compras iniciais registradas.</span>',
        )}
        ${section("Itens no inventário final", items(topItems))}
        ${section(
          "Botas",
          build.boots.length
            ? items(build.boots) +
                (build.gamesWithoutFinalBoots
                  ? `<small class="build-data-sample">${gameCount(build.gamesWithoutFinalBoots)} sem botas no inventário final</small>`
                  : "")
            : '<span class="na">Nenhuma bota no inventário final.</span>',
        )}
        ${section("Feitiços", frequencyList(build.spells.map(spellOption)))}
      </section>
      <div class="build-column build-progression">
        <section>
          <h4>Runas</h4>
          ${runePage(build)}
        </section>
        ${buildSkills(champion.name, build.skillOrder, games)}
      </div>
    </div>
    ${
      hasTimeline
        ? `<section class="build-timeline" data-build-timeline="${esc(champion.name)}" data-lane="${esc(lane)}" data-opponent="${esc(opponent)}" aria-label="Compras jogo a jogo">
      ${buildTimelineLoading()}
    </section>`
        : ""
    }`
}

export function buildTimelineLoading() {
  return `<header class="build-timeline-header"><h4>Compras jogo a jogo</h4></header>
    <p class="build-data-sample" role="status">Carregando compras jogo a jogo…</p>
    <div class="build-timeline-placeholder" aria-hidden="true"><span></span><span></span></div>`
}

/** `withTimeline`: mostra "Compras jogo a jogo" (só na página do campeão). */
export function buildDetails(champion: Champion, lane: string, action = "", hasTimeline = false, opponent = "") {
  if (opponent) return buildHtml(champion, lane, hasTimeline, opponent)
  const samples = Object.entries(champion.lanes)
    .flatMap(([position, sample]) =>
      (!lane || position === lane) && "sampleGames" in sample && sample.sampleGames
        ? [[position, sample] as const]
        : [],
    )
    .map(([position, sample], index) => buildSample(sample, position, index === 0 ? action : ""))
    .join("")
  const missingSample = lane ? `<p class="hint">Sem estatísticas de desempenho coletadas em ${esc(lane)}.</p>` : ""
  return (
    (samples || `<div class="build-sample-heading">${missingSample}${action}</div>`) +
    buildHtml(champion, lane, hasTimeline, opponent)
  )
}
