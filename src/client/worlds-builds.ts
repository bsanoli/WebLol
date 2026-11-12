import { iconMarkup, laneIconMarkup } from "./icon"
import DATA from "../data/worlds.json"
import { champions, itemNames, runeNames } from "../data/worlds-2026-builds.json"
import buildAssets from "../data/worlds-2026-build-assets.json"
import { LOL_DATA, lolAsset, lolImage, lolKey } from "./lol-media"
import { championSlug, esc, ico, kdaOf, sortIcons, teamLogo, wrPill } from "./worlds-display"
import { runePage } from "./worlds-runes"

type Champion = (typeof DATA.champs)[number]
type LaneSample = Extract<Champion["lanes"][keyof Champion["lanes"]], { n: number }>
type Frequency<T> = { value: T; count: number; percent: number }
type SampleBuild = (typeof champions.Ezreal)["all"]
type BuildData = Omit<SampleBuild, "skillOrder" | "starterItems"> & {
  starterItems?: Frequency<number[]>[]
  skillOrder: Omit<SampleBuild["skillOrder"], "priority"> & {
    priority: Pick<NonNullable<SampleBuild["skillOrder"]["priority"]>, "firstSample" | "first" | "secondSample" | "firstAndSecond"> | null
  }
}
type BuildIconKind = "item" | "rune" | "spell"
type Option = { label: string; icons: string[]; percent: number }
const buildData: Partial<Record<string, Partial<Record<string, BuildData>>>> = champions
const itemLabels: Partial<Record<number, string>> = itemNames
const runeLabels: Partial<Record<number, string>> = runeNames
const runeAssets: Partial<Record<number, (string | null)[]>> = buildAssets.runes
const runeTreeIcons = new Map(Object.values(LOL_DATA.runeTrees).flatMap(tree =>
  tree ? [[tree.name, lolAsset(tree.icon)] as const] : []))
const abilities: Partial<Record<string, Partial<Record<string, { name: string; description: string; icon: string }>>>> = buildAssets.abilities
const itemKeys = new Map(Object.entries(LOL_DATA.item).map(([key, path]) => [Number(path?.match(/(\d+)\.png$/)?.[1]), key]))
const spellKeys = new Map(Object.entries(LOL_DATA.spell).map(([key, path]) => [path?.split("/").at(-1)?.replace(".png", ""), key]))
const completedItems = new Set(buildAssets.completedItems)
const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const gameCount = (games: number) => games === 1 ? "1 jogo" : `${games} jogos`

function championBuild(champion: Champion, lane: string) {
  return buildData[champion.name]?.[lane || "all"]
}

function buildIcon(kind: BuildIconKind, key: string | undefined, label: string, usage: string, fallback?: string) {
  const local = key && LOL_DATA[kind][key];
  const className = `build-icon build-icon-${kind}`;
  const image = local ? lolImage(local, className) : fallback
    ? `<img alt="" class="${className}" loading="lazy" src="${esc(fallback)}">`
    : "";
  if (!image) return "";
  const text = esc(`${label} · ${usage}`);
  return local
    ? `<button type="button" class="build-icon-trigger" data-game-tip="${kind}:${key}" aria-label="${text}" data-tip="${text}">${image}</button>`
    : `<span class="build-icon-static" role="img" aria-label="${text}" title="${text}">${image}</span>`;
}

/** Ícone de item com tooltip; usado também pela linha do tempo de compras. */
export function itemIcon(item: number, usage: string) {
  const label = itemLabels[item] ?? String(item);
  const fallback = `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/item/${item}.png`;
  return buildIcon("item", itemKeys.get(item), label, usage, fallback);
}

export const itemName = (item: number) => itemLabels[item] ?? String(item);
export const isCompletedItem = (item: number) => completedItems.has(item);
export const bootItems = new Set<number>(Object.values(buildData).flatMap(lanes =>
  Object.values(lanes ?? {}).flatMap(build => build?.boots.map(entry => entry.value) ?? [])));
bootItems.delete(1001); // Botas básicas não contam como botas completas

function usageOf(entry: Pick<Frequency<unknown>, "count" | "percent">, games: number) {
  return `${entry.count} de ${games} · ${percent.format(entry.percent)}%`;
}

function itemOption(entry: Frequency<number>, games: number): Option {
  return { ...entry, label: itemName(entry.value), icons: [itemIcon(entry.value, usageOf(entry, games))] };
}

function starterOption(entry: Frequency<number[]>, games: number): Option {
  const quantities = new Map<number, number>();
  for (const item of entry.value) quantities.set(item, (quantities.get(item) ?? 0) + 1);
  const items = [...quantities].map(([value, quantity]) => {
    const item = itemOption({ ...entry, value }, games);
    return { ...item, label: quantity > 1 ? `${quantity}× ${item.label}` : item.label };
  });
  return { ...entry, label: items.map(item => item.label).join(" + "), icons: items.flatMap(item => item.icons) };
}

function runeIcon(entry: Frequency<number>, games: number) {
  const label = runeLabels[entry.value] ?? String(entry.value);
  const [key, path] = runeAssets[entry.value] ?? [];
  const fallback = runeTreeIcons.get(label) ??
    (path ? `https://ddragon.leagueoflegends.com/cdn/img/${path}` : undefined);
  return buildIcon("rune", key ?? undefined, label, usageOf(entry, games), fallback);
}

function spellOption(entry: Frequency<string>): Option {
  const keys = entry.value.split("+").map(name => spellKeys.get(name) ?? lolKey(name));
  const labels = keys.map(key => LOL_DATA.spellDetails[key]?.name ?? key);
  return {
    ...entry,
    label: labels.join(" + "),
    icons: keys.map((key, index) => buildIcon("spell", key, labels[index], `${percent.format(entry.percent)}%`)),
  };
}

export function buildMatchesQuery(champion: Champion, lane: string, query: string) {
  const term = query.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const matches = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(term);
  if (matches(champion.name)) return true;
  const build = championBuild(champion, lane);
  return build?.finalItems.some(({ value }) => matches(itemLabels[value] ?? "") ||
    matches(itemKeys.get(value) ?? ""));
}

function buildSample(sample: LaneSample, position?: string, action = "") {
  const counts = (entries: LaneSample["players"], showTeamLogo = false) => `<ul class="build-sample-counts">${entries.map(([name, count]) =>
    `<li><span class="build-sample-person">${showTeamLogo ? teamLogo(String(name)) : ""}${esc(name)}</span><strong>${count}</strong></li>`).join("")}</ul>`;
  const metrics = [
    ["KDA", kdaOf(sample.k, sample.d, sample.a).toFixed(2)],
    ["Abates", sample.k.toFixed(1)],
    ["Mortes", sample.d.toFixed(1)],
    ["Assistências", sample.a.toFixed(1)],
  ];
  return `<section class="build-sample" aria-label="Amostra${position ? ` de ${esc(position)}` : ""}">
    <header class="build-sample-heading">
      <h4>${position ? laneIconMarkup(position) + esc(position) : "Amostra"}</h4>
      <span>${gameCount(sample.n)} na amostra${sample.n < sample.picks ? ` de ${sample.picks} jogos` : ""}</span>
      ${action}
    </header>
    <div class="build-sample-grid">
      <div class="build-sample-performance">
        <div class="build-sample-record"><strong class="build-sample-wins">${sample.w}V</strong><span>/</span><strong class="build-sample-losses">${sample.n - sample.w}D</strong></div>
        <dl class="build-sample-metrics">${metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
      </div>
      <div><div class="build-sample-list-heading"><h5>Quem jogou</h5><span>· jogos</span></div>${counts(sample.players)}</div>
      <div><div class="build-sample-list-heading"><h5>Times</h5><span>· jogos</span></div>${counts(sample.teams, true)}</div>
    </div>
  </section>`;
}

function frequencyList(options: Option[]) {
  return `<ul class="items build-frequency">${options.map(option =>
    `<li class="item"><span class="item-name">${option.icons.join("")}<span>${esc(option.label)}</span></span><span class="pb" aria-hidden="true"><i style="width:${option.percent}%"></i></span><span class="p">${percent.format(option.percent)}%</span></li>`
  ).join("")}</ul>`;
}

export function abilityDetail(champion: string, slot: string) {
  const detail = abilities[champion]?.[slot];
  const folder = slot === "P" ? "passive" : "spell";
  return detail && { ...detail, icon: `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/${folder}/${detail.icon}` };
}

function skillIcon(champion: string, slot: string) {
  const detail = abilityDetail(champion, slot);
  const label = slot === "P" ? "Passiva" : slot;
  return detail ? `<button type="button" class="build-icon-trigger build-ability" data-game-tip="ability:${esc(champion)}:${slot}"
    aria-label="${esc(`${label} · ${detail.name}`)}"><img alt="" class="build-icon" loading="lazy" src="${esc(detail.icon)}"><b aria-hidden="true">${slot}</b></button>`
    : `<strong>${esc(slot)}</strong>`;
}

function skillSequence(champion: string, value: string) {
  const slots = ["Q", "W", "E", "R"];
  const points = [...value];
  const levelCount = 18;
  const hasExtraPoints = points.length > levelCount;
  const icons = slots.map(slot => skillIcon(champion, slot)).join("");
  const cells = Array.from({ length: Math.max(levelCount, points.length) }, (_, index) => {
    const number = index + 1;
    const slot = points[index];
    const extra = number > levelCount;
    const point = hasExtraPoints ? `Ponto registrado ${number}` : `Nível ${number}`;
    const numberLabel = extra ? `+${number - levelCount}` : number;
    if (!slot) return `<li class="build-skill-level" aria-label="${point} · Sem registro">
      <span aria-hidden="true">${numberLabel}</span><span class="build-skill-key" aria-hidden="true">–</span></li>`;
    const detail = abilityDetail(champion, slot);
    const label = `${point} · ${slot}${detail ? ` · ${detail.name}` : ""}`;
    const row = slots.indexOf(slot) + 2;
    return `<li class="build-skill-level"><span aria-hidden="true">${numberLabel}</span>
      <span class="build-skill-connector" style="grid-row:2 / ${row + 1}" aria-hidden="true"></span>
      <button type="button" class="build-skill-key build-skill-marker" data-slot-key="${esc(slot)}" aria-label="${esc(label)}"
        style="grid-row:${row}"
        ${detail ? `data-game-tip="ability:${esc(champion)}:${esc(slot)}" data-tip="${point}"` : `data-tip="${esc(label)}"`}>${esc(slot)}</button></li>`;
  });
  const legend = (header = '<span aria-hidden="true"></span>') =>
    `<li class="build-skill-icons">${header}${icons}</li>`;
  return `${hasExtraPoints ? '<p class="build-skill-sequence-label">Ordem dos pontos registrados</p>' : ""}
    <div class="build-skill-scroll" tabindex="0" role="region" aria-label="Ordem de habilidades por nível">
    <ol class="build-skill-grid" role="list" aria-label="Sequência de pontos de habilidade">
      ${legend(skillIcon(champion, "P"))}${cells.slice(0, levelCount).join("")}
    </ol>
    ${hasExtraPoints ? `<div class="build-skill-extras">
      <span>Registros adicionais</span><ol class="build-skill-grid" role="list" aria-label="Registros adicionais">${legend()}${cells.slice(levelCount).join("")}</ol>
    </div>` : ""}</div>`;
}

function buildSkills(champion: string, order: BuildData["skillOrder"], games: number) {
  const [mostCommon, ...alternatives] = order.observedSequences;
  const sequences = mostCommon ? [mostCommon, ...alternatives.filter(sequence =>
    !sequence.value.startsWith(mostCommon.value)).slice(0, 2)] : [];
  const priority = order.priority?.firstAndSecond[0] ?? order.priority?.first[0];
  return `<section class="build-skills">
    <header class="build-skill-header">
      <h4>Ordem de habilidades</h4>
      ${priority ? `<div class="build-skill-priority">Prioridade
        ${priority.value.split(">").map(slot => `<span class="build-skill-key" data-slot-key="${esc(slot)}">${esc(slot)}</span>`).join('<span aria-hidden="true">→</span>')}
      </div>` : ""}
    </header>
    ${sequences.length > 1 ? `<div class="build-skill-options" role="group" aria-label="Sequências mais frequentes">
      ${sequences.map((sequence, index) => `<button type="button" data-slot="button" data-variant="outline" data-size="sm"
        data-skill-sequence="${index}" aria-pressed="${index === 0}">${index === 0 ? "Mais comum" : `Alternativa ${index}`} · ${gameCount(sequence.count)}</button>`).join("")}
    </div>` : ""}
    ${sequences.length ? sequences.map((sequence, index) => `<div data-skill-panel="${index}"${index ? " hidden" : ""}>
      ${skillSequence(champion, sequence.value)}
      <p class="build-data-sample build-skill-sample">${index === 0 ? "Sequência mais comum" : `Alternativa ${index}`} · ${usageOf(sequence, games)}</p>
    </div>`).join("") : '<span class="na">Sem sequência de habilidades registrada.</span>'}
  </section>`;
}

function buildHtml(champion: Champion, lane: string, withTimeline: boolean) {
  const build = championBuild(champion, lane);
  if (!build) return `<span class="na">Sem build coletada para ${esc(champion.name)}.</span>`;
  const { games } = build;
  const section = (title: string, content: string) => `<div class="build-section"><h5>${title}</h5>${content}</div>`;
  const items = (entries: Frequency<number>[]) => frequencyList(entries.map(entry => itemOption(entry, games)));
  const boots = new Set(build.boots.map(entry => entry.value));
  const equipment = build.finalItems.filter(entry => !boots.has(entry.value));
  const featured = equipment.filter(entry => completedItems.has(entry.value)).slice(0, 6);
  const topItems = featured.length ? featured : equipment.slice(0, 6);
  return `<div class="build">
      <section class="build-column">
        <h4>Build e feitiços</h4>
        ${section("Itens iniciais", build.starterItems?.length
          ? frequencyList(build.starterItems.map(entry => starterOption(entry, games)))
          : '<span class="na">Sem compras iniciais registradas.</span>')}
        ${section("Itens no inventário final", items(topItems))}
        ${section("Botas", build.boots.length
          ? items(build.boots) + (build.gamesWithoutFinalBoots ? `<small class="build-data-sample">${gameCount(build.gamesWithoutFinalBoots)} sem botas no inventário final</small>` : "")
          : '<span class="na">Nenhuma bota no inventário final.</span>')}
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
    ${withTimeline ? `<section class="build-timeline" data-build-timeline="${esc(champion.name)}" data-lane="${esc(lane)}" aria-label="Compras jogo a jogo">
      <p class="build-data-sample">Carregando compras jogo a jogo…</p>
    </section>` : ""}`;
}

/** Preenche as seções "Compras jogo a jogo" de `root`; os dados por jogo ficam num arquivo separado. */
export async function hydrateBuildTimelines(root: ParentNode) {
  const sections = [...root.querySelectorAll<HTMLElement>("[data-build-timeline]:not([data-ready])")];
  if (!sections.length) return;
  const { buildTimeline } = await import("./worlds-build-timeline");
  for (const section of sections) {
    section.dataset.ready = "";
    section.innerHTML = buildTimeline(section.dataset.buildTimeline ?? "", section.dataset.lane ?? "");
  }
}

/** `withTimeline`: mostra "Compras jogo a jogo" (só na página do campeão). */
export function buildDetails(champion: Champion, lane: string, action = "", withTimeline = false) {
  const samples = Object.entries(champion.lanes)
    .filter(([position, sample]) => (!lane || position === lane) && sample.n)
    .map(([position, sample], index) => buildSample(sample, position, index === 0 ? action : "")).join("");
  const missingSample = lane ? `<p class="hint">Sem estatísticas de desempenho coletadas em ${esc(lane)}.</p>` : "";
  return (samples || `<div class="build-sample-heading">${missingSample}${action}</div>`) + buildHtml(champion, lane, withTimeline);
}

type Matchup = [opponent: string, games: number, wins: number, ...stats: number[]]
const matchups: Record<string, Record<string, (string | number)[][]>> = DATA.matchups

export function orderedMatchups(position: string, champion: string) {
  return (matchups[position]?.[champion] ?? [])
    .filter((row): row is Matchup => row.length >= 3 && typeof row[0] === "string"
      && row.slice(1).every(value => typeof value === "number"))
    .sort((a, b) => b[1] - a[1] || b[2] / b[1] - a[2] / a[1]);
}

export function buildMatchups(champion: Champion, position: string) {
  const lane = position || champion.main;
  const opponents = orderedMatchups(lane, champion.name);
  const games = opponents.reduce((total, [, count]) => total + count, 0);
  return `<h3>Confrontos mais frequentes</h3>
    <div class="build-context-champion">${ico(champion.name)}<div>
      <strong>${esc(champion.name)}</strong>
      <span class="lane-label">${laneIconMarkup(lane, true)}${esc(lane)}${games ? ` · ${gameCount(games)} com draft completo` : ""}</span>
    </div></div>
    ${opponents.length ? `<ul class="build-context-list" aria-label="Adversários por número de jogos">
      ${opponents.slice(0, 5).map(([opponent, count, wins]) => `<li>
        <span class="build-context-name">${ico(opponent)}${esc(opponent)}</span>
        <span class="build-context-count">${gameCount(count)}</span>
        <span class="build-context-result" aria-label="${wins} vitórias e ${count - wins} derrotas">
          <strong class="build-sample-wins">${wins}V</strong> / <strong class="build-sample-losses">${count - wins}D</strong>
        </span>
      </li>`).join("")}
    </ul>
    <button type="button" data-slot="button" data-variant="outline" data-size="sm" class="build-context-link"
      data-build-matchups="${championSlug(champion.name)}" data-lane="${esc(lane.toLowerCase())}">Ver todos os confrontos ${iconMarkup("next")}</button>`
    : `<p class="hint">Sem confrontos registrados para este campeão na posição.</p>`}`;
}

export function buildLaneHighlights(champions: Champion[], position: keyof Champion["lanes"] | "") {
  const top = (count: (champion: Champion) => number) => champions.map(champion => ({
    champion, count: count(champion),
  })).filter(entry => entry.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const lists = [
    { title: "Mais escolhidos", entries: top(c => position ? c.lanes[position]?.picks ?? 0 : c.picks) },
    { title: "Mais banidos no torneio", entries: top(c => c.bans) },
  ];
  return `<h3>${position ? `Destaques · ${esc(position)}` : "Destaques do Worlds"}</h3>
    ${lists.filter(({ entries }) => entries.length).map(({ title, entries }) => `<h4>${title}</h4>
      <ul class="build-context-list build-context-ranking">${entries.map(({ champion, count }) => `<li>
        <button type="button" data-slot="button" data-variant="ghost" class="build-context-rank" data-highlight-build="${championSlug(champion.name)}">
          <span class="build-context-name">${ico(champion.name)}${esc(champion.name)}</span><strong>${count}</strong>
        </button>
      </li>`).join("")}</ul>`).join("")}`;
}

const missingBuildOption='<span class="na" aria-label="Sem dados">—</span>';
function buildPreview(...options: Option[]) {
  const icons = options.flatMap(option => option.icons).filter(Boolean).join("");
  return icons ? `<div class="build-option-icons">${icons}</div>` : missingBuildOption;
}

function buildRunePreview(primary: Frequency<number>, secondary: Frequency<number>, games: number) {
  const primaryIcon = runeIcon(primary, games);
  const secondaryIcon = runeIcon(secondary, games);
  if (!primaryIcon && !secondaryIcon) return missingBuildOption;
  return `<div class="build-option-icons build-option-runes">${primaryIcon}${
    secondaryIcon ? `<span class="build-option-secondary">${secondaryIcon}</span>` : ""
  }</div>`;
}

export function buildGameCount(champion: Champion, lane: keyof Champion["lanes"] | "") {
  return lane ? champion.lanes[lane]?.picks ?? 0 : champion.picks;
}

const buildStats = [
  ["games", "picks", "Jogos"],
  ["win", "wr", "Win rate"],
  ["ban", "bans", "Ban rate"],
];

export function buildsTable(champions: Champion[], lane: keyof Champion["lanes"] | ""){
  const rows=champions.map(c=>{
    const build = championBuild(c, lane);
    const games = buildGameCount(c, lane);
    const equipment = build?.finalItems.filter(entry => completedItems.has(entry.value)) ?? [];
    const items = equipment.slice(0, 3).map(entry => itemOption(entry, games));
    const boots = build?.boots[0];
    const keystone = build?.primaryRunes[0]?.[0];
    const secondaryTree = build?.secondaryTrees[0];
    const spells = build?.spells[0];
    const slug=championSlug(c.name);
    const banRate = Math.round(c.bans / DATA.games * 100);
    const banLevel = banRate >= 30 ? "high" : banRate >= 10 ? "medium" : "low";
    return `<tr class="build-summary-row">
      <th scope="row" class="build-col-champion"><button type="button" class="build-champion build-toggle" data-build-toggle="${slug}" aria-expanded="false" aria-controls="build-detail-${slug}">${iconMarkup("next")}${ico(c.name)}<span>${esc(c.name)}<small>${esc(lane || c.main)}<span class="build-mobile-games"> · ${gameCount(games)}</span></small></span></button></th>
      <td class="build-col-games build-stat">${games}</td>
      <td class="build-col-win build-stat">${wrPill(c.wins,c.picks)}</td>
      <td class="build-col-ban build-stat"><span class="wr" data-ban-level="${banLevel}" data-tip="Banido em ${c.bans} de ${DATA.games} jogos do torneio">${banRate}%</span></td>
      <td class="build-col-items">${buildPreview(...items)}</td>
      <td class="build-col-boots">${boots ? buildPreview(itemOption(boots, games)) : missingBuildOption}</td>
      <td class="build-col-runes">${keystone && secondaryTree ? buildRunePreview(keystone, secondaryTree, games) : missingBuildOption}</td>
      <td class="build-col-spells">${spells ? buildPreview(spellOption(spells)) : missingBuildOption}</td>
    </tr>
    <tr class="detail build-inline-detail" id="build-detail-${slug}" hidden><td colspan="8"></td></tr>`;
  }).join("");
  return `<div class="wl-panel tablewrap builds-table-wrap" role="region" aria-label="Comparação de builds">
    <table class="builds-table" aria-label="Builds por campeão">
      <caption>Win rate e ban rate consideram o torneio inteiro.</caption>
      <thead><tr><th scope="col" class="build-col-champion">Campeão</th>
      ${buildStats.map(([column, key, label]) => `<th scope="col" class="build-col-${column} build-stat"><button type="button" data-k="${key}">${label}${sortIcons}</button></th>`).join("")}
      <th scope="col" class="build-col-items">Itens</th><th scope="col" class="build-col-boots">Botas</th><th scope="col" class="build-col-runes">Runas</th>
      <th scope="col" class="build-col-spells">Feitiços</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
