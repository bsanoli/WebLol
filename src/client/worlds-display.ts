import { lolChampion, lolImage } from "./lol-media"

export const LANES=[["Top","--top"],["Jungle","--jungle"],["Mid","--midlane"],["ADC","--adc"],["Suporte","--sup"]];
export const LC=Object.fromEntries(LANES);

// Escudos exibidos pela Riot na lista oficial de classificados do Worlds 2026.
// https://lolesports.com/en-US/tournament/115660540725177488/overview
const teams = [
  ["Anyone's Legend", "al"],
  ["Bilibili Gaming", "blg"],
  ["Cloud9", "c9"],
  ["CTBC Flying Oyster", "cfo"],
  ["Dplus Kia", "dk"],
  ["FURIA", "fur"],
  ["G2 Esports", "g2"],
  ["Gen.G", "gen"],
  ["Hanwha Life Esports", "hle"],
  ["Invictus Gaming", "ig"],
  ["Karmine Corp", "kc"],
  ["LOS", "los"],
  ["LYON", "lyon"],
  ["Movistar KOI", "mkoi"],
  ["MVK", "mvk"],
  ["T1", "t1"],
  ["Top Esports", "tes"],
  ["Team Liquid", "tl"],
  ["Team Secret Whales", "tsw"],
];
const teamLogos = new Map(teams.flatMap(([name, code]) => [[name.toLowerCase(), code], [code, code]] as const));

export function teamLogo(team: string) {
  const code = teamLogos.get(team.toLowerCase());
  return code ? `<img class="team-logo" data-team="${code}" src="assets/worlds-teams/${code}.png" width="32" height="32" loading="lazy" alt="">` : "";
}

export const pct=(x: number)=>Math.round(x*100)+"%";
export const wrPill=(w: number,n: number)=>{if(!n)return '<span class="wr" aria-label="Sem jogos">—</span>';const r=w/n;return `<span class="wr ${r>=.55?'g':r<=.45?'b':''}" data-tip="Win rate: ${w} vitórias e ${n-w} derrotas em ${n} jogos">${pct(r)}</span>`};
const ini=(n: string)=>n.replace(/[^A-Za-z ]/g,"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
export const ico=(n: string,l?: string)=>`<span class="av"${l?` style="--ring:var(${LC[l]})"`:''} data-i="${ini(n)}">${lolImage(lolChampion(n)?.portrait)}</span>`;
export const esc=(s: unknown)=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c] ?? c));
export const championSlug = (name: string) => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
