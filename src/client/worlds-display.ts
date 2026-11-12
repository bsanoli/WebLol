import { lolChampion, lolImage } from "./lol-media"
import { iconMarkup } from "./icon"

export const sortIcons = `<span class="sort-asc">${iconMarkup("ascending")}</span><span class="sort-desc">${iconMarkup("descending")}</span>`;

export const LANES=[["Top","--top"],["Jungle","--jungle"],["Mid","--midlane"],["ADC","--adc"],["Suporte","--sup"]];
export const LC=Object.fromEntries(LANES);

// Escudos e ligas dos classificados do Worlds 2026.
// https://lolesports.com/en-GB/news/worlds-2026-primer
const teams = [
  ["Anyone's Legend", "al", "LPL"],
  ["Bilibili Gaming", "blg", "LPL"],
  ["Cloud9", "c9", "LCS"],
  ["CTBC Flying Oyster", "cfo", "LCP"],
  ["Dplus Kia", "dk", "LCK"],
  ["FURIA", "fur", "CBLOL"],
  ["G2 Esports", "g2", "LEC"],
  ["Gen.G", "gen", "LCK"],
  ["Hanwha Life Esports", "hle", "LCK"],
  ["Invictus Gaming", "ig", "LPL"],
  ["Karmine Corp", "kc", "LEC"],
  ["LOS", "los", "CBLOL"],
  ["LYON", "lyon", "LCS"],
  ["Movistar KOI", "mkoi", "LEC"],
  ["MVK", "mvk", "LCP"],
  ["T1", "t1", "LCK"],
  ["Top Esports", "tes", "LPL"],
  ["Team Liquid", "tl", "LCS"],
  ["Team Secret Whales", "tsw", "LCP"],
];
const teamByName = new Map(teams.flatMap(([name, code, region]) => {
  const team = {code, region};
  return [[name.toLowerCase(), team], [code, team]] as const;
}));
export const teamRegion = (name: string) => teamByName.get(name.toLowerCase())?.region;

export function teamLogo(team: string) {
  const code = teamByName.get(team.toLowerCase())?.code;
  return code ? `<img class="team-logo" data-team="${code}" src="assets/worlds-teams/${code}.png" width="32" height="32" loading="lazy" alt="">` : "";
}

export const pct=(x: number)=>Math.round(x*100)+"%";
export const wrPill=(w: number,n: number)=>{if(!n)return '<span class="wr" aria-label="Sem jogos">—</span>';const r=w/n;return `<span class="wr ${r>=.55?'g':r<=.45?'b':''}" data-tip="Win rate: ${w} vitórias e ${n-w} derrotas em ${n} jogos">${pct(r)}</span>`};
const ini=(n: string)=>n.replace(/[^A-Za-z ]/g,"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
export const ico=(n: string)=>`<span class="av" data-i="${ini(n)}">${lolImage(lolChampion(n)?.portrait)}</span>`;
export const esc=(s: unknown)=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c] ?? c));
export const championSlug = (name: string) => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const kdaOf = (kills: number, deaths: number, assists: number) => deaths ? (kills + assists) / deaths : kills + assists;
