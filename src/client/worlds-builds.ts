import { iconMarkup, laneIconMarkup } from "./icon"
import DATA from "../data/worlds.json"
import { LOL_DATA, lolImage, lolKey, type RuneTree } from "./lol-media"
import { championSlug, esc, ico, kdaOf, sortIcons, teamLogo, wrPill } from "./worlds-display"
import { readRunePage, runePage } from "./worlds-runes"

type Champion = (typeof DATA.champs)[number]
type ChampionBuild = NonNullable<Champion["build"]>
type LaneSample = Extract<Champion["lanes"][keyof Champion["lanes"]], { n: number }>
type BuildOption = (string | number)[]
type BuildIconKind = "item" | "rune" | "spell"

const PTXT=(n: string,p: number,what: string)=>`${n}: usado em ${p}% dos jogos ${what}`;
function buildIcon(kind: BuildIconKind, name: string, interactive = true, usage = "") {
  const key = lolKey(name);
  const icon = lolImage(LOL_DATA[kind][key], `build-icon build-icon-${kind}`);
  if (!icon || !interactive) return icon;
  const label = kind === "rune" ? LOL_DATA.runeNames[key] : LOL_DATA[`${kind}Details`][key]?.name;
  return `<button type="button" class="build-icon-trigger" data-game-tip="${kind}:${key}" aria-label="${esc(label ?? name)}"${usage ? ` data-tip="${esc(usage)}"` : ""}>${icon}</button>`;
}
const buildOptionNames=(kind: BuildIconKind,name: string)=>kind==="spell"?name.split(" and "):[name];
const gameCount = (games: number) => games === 1 ? "1 jogo" : `${games} jogos`;

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

function itemsHtml(list: BuildOption[],what: string,kind: BuildIconKind,num=false){
  return `<ul class="items${kind==="rune"?" rune-frequency":""}">${list.map(([n,p,en],i)=>{
    if(typeof n!=="string"||typeof p!=="number")return "";
    const names=buildOptionNames(kind,typeof en==="string"?en:n);
    const icons=names.map(name=>buildIcon(kind,name,kind!=="rune")).join("");
    const label=kind==="rune"?LOL_DATA.runeNames[lolKey(names[0])]||n:n;
    const runeTip=kind==="rune"?` data-game-tip="rune:${lolKey(names[0])}"`:"";
    return `<li class="item${num?" item-ranked":""}" data-tip="${esc(PTXT(label,p,what)+(en&&en!==label?` · em inglês: ${en}`:""))}"${runeTip}>${num?`<span class="n">${i+1}</span>`:""}<span class="item-name">${icons}<span>${esc(label)}</span></span><span class="pb" aria-hidden="true"><i style="width:${p}%"></i></span><span class="p">${p}%</span></li>`;
  }).join("")}</ul>`;
}
function buildHtml(c: Champion){const b=c.build;if(!b)return `<span class="na">Sem build coletada para ${esc(c.name)}.</span>`;
  const w=`de ${c.name}`;
  const section=(title: string,content: string)=>`<div class="build-section"><h5>${title}</h5>${content}</div>`;
  const column=(title: string,sections: (string | undefined)[],className = "")=>{
    const content=sections.filter(Boolean).join("");
    return content ? `<section class="build-column${className ? ` ${className}` : ""}"><h4>${title}</h4>${content}</section>` : "";
  };
  const equipment=[
    b.items && section("Itens por frequência de uso",itemsHtml(b.items,w,"item",true)),
    b.support && section("Item de suporte",itemsHtml(b.support,w,"item"))
  ].filter(Boolean).join("");
  const keyRunes=b.keys && section("Frequência da runa principal",itemsHtml(b.keys,w,"rune"));
  const runeDetails=b.runes && section("Página de runas mais usada",runePage(b.runes,b.runes_en||[]));
  const boots=b.boots && section("Botas",itemsHtml(b.boots,w,"item"));
  const spells=b.spells && section("Feitiços",itemsHtml(b.spells,w,"spell"));
  return `<div class="build">${column("Build e feitiços",[equipment,boots,spells])}${column("Runas",[runeDetails,keyRunes],"build-runes")}</div>`;
}

export function buildDetails(champion: Champion, lane: string, action = "") {
  const samples = Object.entries(champion.lanes)
    .filter(([position, sample]) => (!lane || position === lane) && sample.n)
    .map(([position, sample], index) => buildSample(sample, position, index === 0 ? action : "")).join("");
  const missingSample = lane ? `<p class="hint">Sem estatísticas de desempenho coletadas em ${esc(lane)}.</p>` : "";
  return (samples || `<div class="build-sample-heading">${missingSample}${action}</div>`) + buildHtml(champion);
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
function secondaryRuneTree(build: ChampionBuild){
  const mainRune=build?.keys?.[0];
  if(!mainRune)return;
  const {primary, secondaryTree}=readRunePage(build.runes_en||[]);
  if(primary[0]===lolKey(String(mainRune[2]||mainRune[0])))return secondaryTree;
}

function buildPreviewIcons(entry: BuildOption, kind: BuildIconKind) {
  const [name,frequency,english]=entry;
  if(typeof name!=="string"||typeof frequency!=="number")return "";
  const names=buildOptionNames(kind,typeof english==="string"?english:name);
  const usage=kind==="spell"
    ? `${name} · combinação usada em ${frequency}% dos jogos`
    : `Usado em ${frequency}% dos jogos`;
  return names.map(value=>buildIcon(kind,value,true,usage)).join("");
}

function buildPreviewOption(entry: BuildOption | undefined,kind: BuildIconKind,secondaryTree?: RuneTree){
  const icons=entry ? buildPreviewIcons(entry,kind) : "";
  if(!icons)return missingBuildOption;
  const secondaryLabel=secondaryTree?`Árvore secundária da página de runas mais usada: ${secondaryTree.name}`:"";
  const secondaryIcon=secondaryTree?`<span class="build-option-secondary" role="img" aria-label="${esc(secondaryLabel)}" title="${esc(secondaryLabel)}">${lolImage(secondaryTree.icon,"build-icon")}</span>`:"";
  return `<div class="build-option-icons${kind==="rune"?" build-option-runes":""}">${icons}${secondaryIcon}</div>`;
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
    const {build}=c;
    const items = (build?.items?.length ? build.items : build?.support ?? []).slice(0, 3);
    const games = buildGameCount(c, lane);
    const slug=championSlug(c.name);
    const banRate = Math.round(c.bans / DATA.games * 100);
    const banLevel = banRate >= 30 ? "high" : banRate >= 10 ? "medium" : "low";
    return `<tr class="build-summary-row">
      <th scope="row" class="build-col-champion"><button type="button" class="build-champion build-toggle" data-build-toggle="${slug}" aria-expanded="false" aria-controls="build-detail-${slug}">${iconMarkup("next")}${ico(c.name)}<span>${esc(c.name)}<small>${esc(lane || c.main)}<span class="build-mobile-games"> · ${gameCount(games)}</span></small></span></button></th>
      <td class="build-col-games build-stat">${games}</td>
      <td class="build-col-win build-stat">${wrPill(c.wins,c.picks)}</td>
      <td class="build-col-ban build-stat"><span class="wr" data-ban-level="${banLevel}" data-tip="Banido em ${c.bans} de ${DATA.games} jogos do torneio">${banRate}%</span></td>
      <td class="build-col-items"><div class="build-option-icons">${build ? items.map(entry=>buildPreviewIcons(entry,"item")).join("") || missingBuildOption : '<span class="na">Sem build</span>'}</div></td>
      <td class="build-col-boots">${buildPreviewOption(build?.boots?.[0],"item")}</td>
      <td class="build-col-runes">${buildPreviewOption(build?.keys?.[0],"rune",build ? secondaryRuneTree(build) : undefined)}</td>
      <td class="build-col-spells">${buildPreviewOption(build?.spells?.[0],"spell")}</td>
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
