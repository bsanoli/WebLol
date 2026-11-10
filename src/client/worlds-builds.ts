import type DATA from "../data/worlds.json"
import { LOL_DATA, lolImage, lolKey, type RuneTree } from "./lol-media"
import { championSlug, esc, ico, wrPill } from "./worlds-display"
import { readRunePage, runePage } from "./worlds-runes"

type Champion = (typeof DATA.champs)[number]
type ChampionBuild = NonNullable<Champion["build"]>
type BuildOption = (string | number)[]
type BuildIconKind = "item" | "rune" | "spell"

const PTXT=(n: string,p: number,what: string)=>`${n}: usado em ${p}% dos jogos ${what}`;
const buildIcon=(kind: BuildIconKind,name: string)=>lolImage(LOL_DATA[kind][lolKey(name)],`build-icon build-icon-${kind}`);
const buildOptionNames=(kind: BuildIconKind,name: string)=>kind==="spell"?name.split(" and "):[name];
function itemsHtml(list: BuildOption[],what: string,kind: BuildIconKind,num=false){
  return `<div class="items">${list.map(([n,p,en],i)=>{
    if(typeof n!=="string"||typeof p!=="number")return "";
    const names=buildOptionNames(kind,typeof en==="string"?en:n);
    const icons=names.map(name=>buildIcon(kind,name)).join("");
    const label=kind==="rune"?LOL_DATA.runeNames[lolKey(names[0])]||n:n;
    return `<span class="item${num?" item-ranked":""}" data-tip="${esc(PTXT(label,p,what)+(en&&en!==label?` · em inglês: ${en}`:""))}">${num?`<span class="n">${i+1}</span>`:""}<span class="item-name">${icons}<span>${esc(label)}</span></span><span class="pb"><i style="width:${p}%"></i></span><span class="p">${p}%</span></span>`;
  }).join("")}</div>`;
}
export function buildHtml(c: Champion){const b=c.build;if(!b)return `<span class="na">Build não disponível no site para ${esc(c.name)}.</span>`;
  const w=`de ${c.name}`;
  const section=(title: string,content: string)=>`<section class="build-section"><h4>${title}</h4>${content}</section>`;
  const column=(...sections: (string | undefined)[])=>{
    const content=sections.filter(Boolean).join("");
    return content ? `<div class="build-column">${content}</div>` : "";
  };
  const equipment=[
    b.items && section("Itens por frequência de uso",itemsHtml(b.items,w,"item",true)),
    b.support && section("Item de suporte",itemsHtml(b.support,w,"item"))
  ].filter(Boolean).join("");
  const keyRunes=b.keys && section("Runa principal",itemsHtml(b.keys,w,"rune"));
  const runeDetails=b.runes && section("Página de runas mais usada",runePage(b.runes,b.runes_en||[]));
  const boots=b.boots && section("Botas",itemsHtml(b.boots,w,"item"));
  const spells=b.spells && section("Feitiços",itemsHtml(b.spells,w,"spell"));
  return `<div class="build">${column(equipment,boots,spells)}${column(runeDetails,keyRunes)}</div>`;
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
