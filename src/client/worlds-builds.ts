import type DATA from "../data/worlds.json"
import { LOL_DATA, lolImage, lolKey, type RuneTree } from "./lol-media"
import { championSlug, esc, ico, teamLogo, wrPill } from "./worlds-display"
import { readRunePage, runePage } from "./worlds-runes"

type Champion = (typeof DATA.champs)[number]
type ChampionBuild = NonNullable<Champion["build"]>
type LaneSample = Extract<Champion["lanes"][keyof Champion["lanes"]], { n: number }>
type BuildOption = (string | number)[]
type BuildIconKind = "item" | "rune" | "spell"

const PTXT=(n: string,p: number,what: string)=>`${n}: usado em ${p}% dos jogos ${what}`;
function buildIcon(kind: BuildIconKind, name: string, interactive = true) {
  const key = lolKey(name);
  const icon = lolImage(LOL_DATA[kind][key], `build-icon build-icon-${kind}`);
  if (!icon || !interactive) return icon;
  const label = kind === "rune" ? LOL_DATA.runeNames[key] : LOL_DATA[`${kind}Details`][key]?.name;
  return `<button type="button" class="build-icon-trigger" data-game-tip="${kind}:${key}" aria-label="${esc(label ?? name)}">${icon}</button>`;
}
const buildOptionNames=(kind: BuildIconKind,name: string)=>kind==="spell"?name.split(" and "):[name];

export function buildSample(sample: LaneSample, position?: string) {
  const counts = (entries: LaneSample["players"], showTeamLogo = false) => `<ul class="build-sample-counts">${entries.map(([name, count]) =>
    `<li>${showTeamLogo ? teamLogo(String(name)) : ""}<span>${esc(name)}</span> <strong>${count}</strong></li>`).join("")}</ul>`;
  const showSampleSize = position || sample.n !== sample.picks;
  return `<div class="build-sample">
    <div><h4>${position ? `Resultado na amostra <span class="na">· ${esc(position)}</span>` : "Amostra"}</h4>
      <span><strong class="build-sample-wins">${sample.w}V</strong>
        <span class="na">/</span>
        <strong class="build-sample-losses">${sample.n - sample.w}D</strong>
        ${showSampleSize ? `<span class="na">em ${sample.n} jogos${sample.n < sample.picks ? ` (de ${sample.picks})` : ""}</span>` : ""}
      </span>
    </div>
    <div><h4>Quem jogou</h4>${counts(sample.players)}</div>
    <div><h4>Times</h4>${counts(sample.teams, true)}</div>
  </div>`;
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
export function buildHtml(c: Champion, layout: "page" | "expanded" = "page"){const b=c.build;if(!b)return `<span class="na">Build não disponível no site para ${esc(c.name)}.</span>`;
  const w=`de ${c.name}`;
  const section=(title: string,content: string)=>`<div class="build-section"><h5>${title}</h5>${content}</div>`;
  const column=(title: string,sections: (string | undefined)[],className = "")=>{
    const content=sections.filter(Boolean).join("");
    return content ? `<section class="build-column${className ? ` ${className}` : ""}"><h4>${title}</h4>${content}</section>` : "";
  };
  const equipment=[
    b.items && section(layout === "expanded" ? "Por frequência de uso" : "Itens por frequência de uso",itemsHtml(b.items,w,"item",true)),
    b.support && section("Item de suporte",itemsHtml(b.support,w,"item"))
  ].filter(Boolean).join("");
  const keyRunes=b.keys && section("Frequência da runa principal",itemsHtml(b.keys,w,"rune"));
  const runeDetails=b.runes && section("Página de runas mais usada",runePage(b.runes,b.runes_en||[]));
  const boots=b.boots && section("Botas",itemsHtml(b.boots,w,"item"));
  const spells=b.spells && section("Feitiços",itemsHtml(b.spells,w,"spell"));
  if (layout === "expanded") {
    return `<div class="build build-expanded">
      ${column("Itens",[equipment])}
      ${column("Botas e feitiços",[boots,spells],"build-utility")}
      ${column("Runas",[runeDetails,keyRunes],"build-runes")}
    </div>`;
  }
  return `<div class="build">${column("Build e feitiços",[equipment,boots,spells])}${column("Runas",[runeDetails,keyRunes],"build-runes")}</div>`;
}

const missingBuildOption='<span class="na" aria-label="Sem dados">—</span>';
function secondaryRuneTree(build: ChampionBuild){
  const mainRune=build.keys?.[0];
  if(!mainRune)return;
  const {primary, secondaryTree}=readRunePage(build.runes_en||[]);
  if(primary[0]===lolKey(String(mainRune[2]||mainRune[0])))return secondaryTree;
}

function buildPreviewOption(entry: BuildOption | undefined,kind: BuildIconKind,secondaryTree?: RuneTree){
  if(!entry)return missingBuildOption;
  const [name,frequency,english]=entry;
  if(typeof name!=="string"||typeof frequency!=="number")return missingBuildOption;
  const names=buildOptionNames(kind,typeof english==="string"?english:name);
  const title=kind==="rune"?LOL_DATA.runeNames[lolKey(names[0])]||name:name;
  const icons=names.map(value=>buildIcon(kind,value)).join("");
  const secondaryLabel=secondaryTree?`Árvore secundária da página de runas mais usada: ${secondaryTree.name}`:"";
  const secondaryIcon=secondaryTree?`<span class="build-option-secondary" role="img" aria-label="${esc(secondaryLabel)}" title="${esc(secondaryLabel)}">${lolImage(secondaryTree.icon,"build-icon")}</span>`:"";
  return `<div class="build-option"><span class="build-option-icons${kind==="rune"?" build-option-runes":""}">${icons}${secondaryIcon}</span>
    <span class="build-option-name">${esc(title)}</span><span class="build-frequency">${frequency}%</span>
  </div>`;
}

export function buildsTable(champions: (Champion & { build: ChampionBuild })[]){
  const rows=champions.map(c=>{
    const {build}=c;
    const items=(build.items||build.support||[]).slice(0,3);
    return `<tr>
      <th scope="row"><span class="build-champion">${ico(c.name)}<span>${esc(c.name)}<small>${esc(c.main)}</small></span></span></th>
      <td class="build-stat">${c.picks}</td>
      <td class="build-stat">${wrPill(c.wins,c.picks)}</td>
      <td><div class="build-options">${items.map(entry=>buildPreviewOption(entry,"item")).join("")||missingBuildOption}</div></td>
      <td>${buildPreviewOption(build.boots?.[0],"item")}</td>
      <td>${buildPreviewOption(build.keys?.[0],"rune",secondaryRuneTree(build))}</td>
      <td>${buildPreviewOption(build.spells?.[0],"spell")}</td>
      <td><button data-slot="button" data-variant="outline" data-size="sm" type="button" class="build-route" data-build="${championSlug(c.name)}" aria-label="Abrir build de ${esc(c.name)}">Ver build</button></td>
    </tr>`;
  }).join("");
  return `<div class="wl-panel tablewrap builds-table-wrap" role="region" aria-label="Comparação de builds" tabindex="0">
    <table class="builds-table" aria-label="Builds por campeão">
      <thead><tr><th scope="col">Campeão</th><th scope="col" class="build-stat">Jogos</th><th scope="col" class="build-stat">Vitórias</th>
      <th scope="col">Itens mais usados</th><th scope="col">Botas</th><th scope="col">Runa principal</th>
      <th scope="col">Feitiços</th><th scope="col">Detalhes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
