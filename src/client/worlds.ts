// @ts-nocheck -- A tela legada ainda usa estado e eventos DOM sem tipos explícitos.
import { iconMarkup, laneIconMarkup } from "./icon"
import DATA from "../data/worlds.json"
import { LOL_DATA, lolAsset, lolChampion, lolKey } from "./lol-media"
import { buildDetails, buildHtml, buildLaneHighlights, buildMatchups, buildSample, buildsTable, orderedMatchups } from "./worlds-builds"
import { effectText } from "./worlds-effect-text"
import { LANES, LC, pct, wrPill, ico, esc, championSlug, sortIcons, teamLogo, teamRegion } from "./worlds-display"
import { initializeTheme } from "./theme"
import { initializeMotionNav, revealContent } from "./motion"

initializeTheme()
initializeMotionNav("#tabs")

const G=DATA.games, C=DATA.champs;
const tipEl=()=>document.getElementById('tip');
const tipSelector = "[data-game-tip], [data-tip]";
let tipTarget, dismissedGameTip;
let definitionTerm;
function hideDefinition() {
  if (!definitionTerm) return;
  definitionTerm.removeAttribute("aria-describedby");
  definitionTerm = undefined;
  tipEl().querySelector(".effect-definition")?.remove();
}
function showDefinition(term) {
  if (definitionTerm === term) return;
  hideDefinition();
  const definition = document.createElement("div");
  definition.id = "effect-definition";
  definition.className = "effect-definition";
  definition.setAttribute("role", "tooltip");
  definition.textContent = term.dataset.definition;
  tipEl().append(definition);
  definitionTerm = term;
  term.setAttribute("aria-describedby", definition.id);
  const anchor = term.getBoundingClientRect();
  const panel = tipEl().getBoundingClientRect();
  const {width, height} = definition.getBoundingClientRect();
  const right = document.documentElement.clientWidth - width - 8;
  const beside = panel.right <= right ? panel.right : panel.left - width;
  const fitsBeside = beside >= 8 && beside <= right;
  const left = fitsBeside ? beside : anchor.left + (anchor.width - width) / 2;
  const top = fitsBeside || anchor.bottom + height <= innerHeight - 8 ? anchor.bottom : anchor.top - height;
  definition.style.left = Math.max(8, Math.min(left, right)) + "px";
  definition.style.top = Math.max(8, Math.min(top, innerHeight - height - 8)) + "px";
}
function hideTip() {
  hideDefinition();
  if (tipTarget?.dataset.gameTip) tipTarget.removeAttribute("aria-describedby");
  tipEl().hidden = true;
  tipTarget = undefined;
}
function showTip(target, x, y) {
  const el = tipEl();
  const { tip, gameTip } = target.dataset;
  if (gameTip && tipTarget === target && !el.hidden) return;
  hideDefinition();
  if (tipTarget?.dataset.gameTip) tipTarget.removeAttribute("aria-describedby");
  el.classList.toggle("game-tip", Boolean(gameTip));
  el.setAttribute("role", gameTip ? "region" : "tooltip");
  el.removeAttribute("aria-labelledby");
  el.style.maxHeight = "";
  el.textContent = tip ?? "";
  if (gameTip) {
    const [kind, key] = gameTip.split(":");
    const detail = kind === "rune"
      ? { name: LOL_DATA.runeNames[key], description: LOL_DATA.runeDescriptions[key] }
      : LOL_DATA[`${kind}Details`][key];
    const heading = document.createElement("strong");
    heading.id = "game-tip-title";
    heading.className = "game-tip-title";
    el.setAttribute("aria-labelledby", heading.id);
    const icon = LOL_DATA[kind][key];
    if (icon) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = lolAsset(icon);
      heading.append(img);
    }
    heading.append(detail?.name ?? key);
    const description = effectText(detail?.description ?? "Descrição indisponível no patch 26.20.", detail?.effects);
    el.prepend(heading, description);
  }
  el.hidden = false;
  tipTarget = target;
  const {width, height} = el.getBoundingClientRect();
  if (gameTip) {
    target.setAttribute("aria-describedby", el.id);
    const anchor = target.getBoundingClientRect();
    const above = Math.max(0, anchor.top - 8);
    const below = Math.max(0, innerHeight - anchor.bottom - 8);
    const placeAbove = height <= above || (height > below && above >= below);
    const availableHeight = placeAbove ? above : below;
    el.style.maxHeight = availableHeight + "px";
    const left = anchor.left + (anchor.width - width) / 2;
    const top = placeAbove ? anchor.top - Math.min(height, availableHeight) : anchor.bottom;
    el.style.left = Math.max(8, Math.min(left, document.documentElement.clientWidth - width - 8)) + "px";
    el.style.top = Math.max(8, top) + "px";
    return;
  }
  const left = x + 14 + width > innerWidth - 8 ? x - width - 14 : x + 14;
  const top = y + 16 + height > innerHeight - 8 ? y - height - 12 : y + 16;
  el.style.left = Math.max(8, left) + "px";
  el.style.top = Math.max(8, top) + "px";
}
document.addEventListener("mousemove", e => {
  if (tipEl().contains(e.target)) {
    const term = e.target.closest(".effect-term");
    if (term) showDefinition(term);
    return;
  }
  if (definitionTerm !== document.activeElement) hideDefinition();
  const target = e.target.closest?.(tipSelector);
  if (target && target === dismissedGameTip) return;
  dismissedGameTip = undefined;
  if (target) showTip(target, e.clientX, e.clientY);
  else hideTip();
});
document.addEventListener("focusin", e => {
  if (tipEl().contains(e.target)) {
    if (e.target.matches(".effect-term")) showDefinition(e.target);
    return;
  }
  const target = e.target.closest(tipSelector);
  if (!target) return;
  const {left, bottom} = target.getBoundingClientRect();
  dismissedGameTip = undefined;
  showTip(target, left, bottom);
});
document.addEventListener("click", e => {
  const term = e.target.closest?.(".effect-term");
  if (term && tipEl().contains(term)) {
    showDefinition(term);
    return;
  }
  const target = e.target.closest?.("[data-game-tip]");
  if (target) showTip(target);
});
document.addEventListener("focusout", e => {
  if (!e.relatedTarget || (!tipEl().contains(e.relatedTarget) && e.relatedTarget !== tipTarget)) hideTip();
});
document.addEventListener("keydown", e => {
  const panel = tipEl();
  if (e.key === "Tab" && tipTarget?.dataset.gameTip && !panel.hidden) {
    const terms = panel.querySelectorAll(".effect-term");
    if (!e.shiftKey && e.target === tipTarget && terms.length) {
      e.preventDefault();
      terms[0].focus();
      return;
    }
    if ((e.shiftKey && e.target === terms[0]) || (!e.shiftKey && e.target === terms[terms.length - 1])) {
      if (e.shiftKey) e.preventDefault();
      hideDefinition();
      tipTarget.focus({preventScroll: true});
      if (!e.shiftKey) hideTip();
      return;
    }
  }
  if (e.key !== "Escape") return;
  if (panel.contains(e.target)) tipTarget?.focus({preventScroll: true});
  if (tipTarget?.dataset.gameTip) dismissedGameTip = tipTarget;
  hideTip();
});
document.addEventListener("scroll", e => {
  if (e.target !== tipEl()) {
    hideTip();
    return;
  }
  hideDefinition();
  const term = document.activeElement;
  if (e.target.contains(term) && term.matches(".effect-term:focus-visible")) {
    const {top, bottom} = term.getBoundingClientRect();
    const panel = e.target.getBoundingClientRect();
    if (top >= panel.top && bottom <= panel.bottom) showDefinition(term);
  }
}, true);
document.addEventListener("pointerdown", event => {
  if (tipTarget?.dataset.gameTip && !tipTarget.contains(event.target) && !tipEl().contains(event.target)) hideTip();
  const trigger = document.querySelector('[data-floating-picker][aria-expanded="true"]');
  if (trigger && !trigger.parentElement.contains(event.target)) trigger.click();
});
function wireFloatingPicker(trigger, picker, focusOnOpen) {
  const field = trigger.parentElement;
  const setOpen = open => {
    picker.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  };
  const close = () => {
    setOpen(false);
    trigger.focus();
  };
  trigger.onclick = () => {
    setOpen(picker.hidden);
    if (!picker.hidden && trigger.matches(":focus-visible")) focusOnOpen()?.focus();
  };
  field.onfocusout = e => {
    if (e.relatedTarget && !field.contains(e.relatedTarget)) setOpen(false);
  };
  field.onkeydown = e => {
    if (e.key !== "Escape" || picker.hidden) return;
    e.preventDefault();
    close();
  };
  return close;
}
const TIPS={picks:"Jogos em que o campeão foi escolhido nesta lane",wr:"Vitórias ÷ jogos do campeão no torneio",bans:"Quantas vezes foi banido",pres:"% dos jogos em que foi pickado ou banido",kda:"(Abates + Assistências) ÷ Mortes, pelas médias por jogo",k:"Abates por jogo (média)",d:"Mortes por jogo (média)",a:"Assistências por jogo (média)",name:"Clique para ordenar",n:"Jogos coletados do jogador",team:"Time",lane:"Lane principal",chs:"Campeões mais jogados (jogos)"};
function showSort(sort) {
  document.querySelectorAll("th button[data-k]").forEach(button => {
    const heading = button.closest("th");
    if (button.dataset.k === sort.k) heading.setAttribute("aria-sort", sort.d < 0 ? "descending" : "ascending");
    else heading.removeAttribute("aria-sort");
  });
}
const kdaOf=(k,d,a)=>d?(k+a)/d:k+a;

// KPIs
const topBan=[...C].sort((a,b)=>b.bans-a.bans)[0], topPick=[...C].sort((a,b)=>b.picks-a.picks)[0];
document.getElementById('kpis').innerHTML=[[G,"jogos"],[C.length,"campeões usados"],[topBan.name,`mais banido · ${pct(topBan.bans/G)}`],[topPick.name,`mais pickado · ${topPick.picks}`]]
 .map(([v,l],i)=>`<div class="wl-panel kpi" data-tip="${["Total de jogos do Play-In até as Semifinais","Campeões que foram pickados ou banidos pelo menos uma vez",`${topBan.name} foi banido em ${topBan.bans} de ${G} jogos`,`${topPick.name} foi escolhido em ${topPick.picks} jogos (${topPick.wins} vitórias)`][i]}"><div class="v">${esc(v)}</div><div class="l">${l}</div></div>`).join("");

const TABS = [
  ["geral", "Visão geral", "chart"],
  ["campeoes", "Campeões", "champion"],
  ["builds", "Builds", "inventory"],
  ["matchups", "Confrontos", "matchups"],
  ["comps", "Composições", "composition"],
  ["jogadores", "Jogadores", "player"],
];
const tabsEl = document.getElementById("tabs");
const laneFilter = document.getElementById("lane-filter");
const laneSelect = document.getElementById("lane-select");
const laneById = new Map(LANES.map(([lane]) => [lane.toLowerCase(), lane]));
let selectedLane = "top";
let laneChampion = "", laneQuery = "", buildChampion = "", buildQuery = "", playerQuery = "", playerLane = "";
const worldsPaths = { geral: "", campeoes: "/campeoes", builds: "/builds", matchups: "/confrontos", comps: "/composicoes", jogadores: "/jogadores" };
const laneFromParam = value => laneById.get(value) || "";

function publishWorlds(id, parts = [], filters = {}, replace = false) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const path = "/worlds" + worldsPaths[id] + parts.map(part => "/" + part).join("") + (query ? "?" + query : "");
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:navigate", {detail:{path, replace}}));
}

window.applyWebLolRoute = ([page, first, second], params) => {
  const id = Object.keys(worldsPaths).find(key => worldsPaths[key] === "/" + page) || "geral";
  const query = params.get("busca") || "";
  const lane = laneFromParam(params.get("posicao"));
  if (id === "campeoes") {
    selectedLane = lane ? lane.toLowerCase() : "top";
    laneChampion = first || "";
    laneQuery = query;
  } else if (id === "builds") {
    buildChampion = first || "";
    buildQuery = query;
    bLane = lane;
    buildMinGames = readBuildMinGames(params.get("minJogos"));
  } else if (id === "matchups") {
    muLane = laneFromParam(first) || "Mid";
    muChamp = Object.keys(DATA.matchups[muLane] || {}).find(name => championSlug(name) === second);
  } else if (id === "jogadores") {
    playerQuery = query;
    playerLane = lane;
  } else if (id === "comps") {
    cQ = query;
    cTeam = params.get("time") || "";
    cSt = params.get("fase") || "";
    cChamps = new Set((params.get("campeoes") || "").split(",").filter(slug => compChampions.has(slug)));
    if (!DATA.comps.some(game => game.b === cTeam || game.r === cTeam)) cTeam = "";
    if (!DATA.comps.some(game => game.st === cSt)) cSt = "";
  }
  render(id);
};
const validTab = id => TABS.some(tab => tab[0] === id) || laneById.has(id);
tabsEl.innerHTML = TABS.map(([id, label, icon]) =>
  `<button data-slot="button" data-variant="ghost" data-id="${id}">${iconMarkup(icon)}${label}</button>`
).join("");
laneSelect.innerHTML = [...laneById].map(([id, lane]) => `<option value="${id}">${lane}</option>`).join("");
laneSelect.onchange = () => go(laneSelect.value);
tabsEl.onclick = e => {
  const button = e.target.closest("button");
  if (!button) return;
  go(button.dataset.id === "campeoes" ? selectedLane : button.dataset.id);
  window.scrollTo(0, 0);
};
function go(id) {
  if (!validTab(id)) id = "geral";
  if (laneById.has(id) || id === "campeoes") {
    selectedLane = laneById.has(id) ? id : selectedLane;
    laneChampion = laneQuery = "";
    publishWorlds("campeoes", [], {posicao:selectedLane});
    render("campeoes");
    return;
  }
  window.applyWebLolRoute([worldsPaths[id].slice(1)], new URLSearchParams());
  publishWorlds(id);
}

function render(id){
  const previousPage=document.body.dataset.page;
  hideTip();
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:analytics-clear"));
  document.getElementById("kpis").hidden = !!window.frameElement || id !== "geral";
  if(!validTab(id))id="geral";
  const isLane = laneById.has(id) || id === "campeoes";
  if (laneById.has(id)) selectedLane = id;
  laneFilter.hidden = !isLane;
  laneSelect.value = selectedLane;
  tabsEl.querySelectorAll("button").forEach(button => {
    const active = button.dataset.id === (isLane ? "campeoes" : id);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const v=document.getElementById('view');
  if (v.contains(laneFilter)) v.before(laneFilter);
  if(id==="geral"){v.innerHTML=overview();wireLaneOverview(v)}
  else if(id==="jogadores"){v.innerHTML=playersView();wirePlayers()}
  else if(id==="matchups"){v.innerHTML=muView();wireMu()}
  else if(id==="comps"){v.innerHTML=compsView();wireComps()}
  else if(id==="builds"){v.innerHTML=buildsView();wireBuilds()}
  else{const lane=laneById.get(selectedLane);v.innerHTML=laneView(lane);v.querySelector(".tools").prepend(laneFilter);wireLane(lane)}
  document.body.dataset.page = isLane ? "campeoes" : id;
  if(previousPage!==document.body.dataset.page)revealContent(v);
  if(id === "geral" || id === "jogadores") window.frameElement?.dispatchEvent(new CustomEvent("weblol:analytics", { detail: {
    kind: id === "geral" ? "overview" : "players", games: G, players: DATA.players,
    champions: C.map(c => ({name:c.name,picks:c.picks,wins:c.wins,bans:c.bans,portrait:lolChampion(c.name)?.portrait ? lolAsset(lolChampion(c.name).portrait) : undefined}))
  }}));
  enhanceAnalyticsUI();
}

function rankedChampion(champion){
  const name=esc(champion.name);
  return `<span class="nm">${ico(champion.name)}${laneIconMarkup(champion.main,true)}<span class="ranked-name" title="${name}">${name}</span></span>`;
}

function barList(list,valFn,max,segs,vw=52,tipFn=null){
  return `<div class="bars">${list.map((c,i)=>{
    const s=segs(c).map(([w,col,tip])=>`<i style="width:${w/max*100}%;background:var(${col})" data-tip="${esc(tip||"")}"></i>`).join("");
    return `<div class="bar" style="grid-template-columns:22px minmax(110px,150px) 1fr ${vw}px"><span class="rk">${i+1}</span>${rankedChampion(c)}<span class="track">${s}</span><span class="val" data-tip="${esc(tipFn?tipFn(c):"")}">${valFn(c)}</span></div>`}).join("")}</div>`;
}
function overview(){
  const picks=[...C].sort((a,b)=>b.picks-a.picks||b.wins-a.wins).slice(0,15);
  const bans=[...C].sort((a,b)=>b.bans-a.bans||b.picks-a.picks).slice(0,15);
  const pres=[...C].sort((a,b)=>(b.picks+b.bans)-(a.picks+a.bans)).slice(0,15);
  const mp=picks[0].picks, mb=bans[0].bans;
  const pickRows=`<div class="bars">${picks.map((c,i)=>`<div class="bar" style="grid-template-columns:22px minmax(110px,150px) 1fr 34px 52px"><span class="rk">${i+1}</span>${rankedChampion(c)}<span class="track" data-tip="${esc(c.name)}: ${c.wins} vitórias e ${c.picks-c.wins} derrotas em ${c.picks} jogos"><i style="width:${c.wins/mp*100}%;background:var(--good)" data-tip="${esc(c.name)}: ${c.wins} vitórias"></i><i style="width:${(c.picks-c.wins)/mp*100}%;background:var(--bad);opacity:.55" data-tip="${esc(c.name)}: ${c.picks-c.wins} derrotas"></i></span><span class="val" data-tip="Jogos com ${esc(c.name)}: ${c.wins} vitórias, ${c.picks-c.wins} derrotas">${c.picks}</span><span>${wrPill(c.wins,c.picks)}</span></div>`).join("")}</div>`;
  const banRows=barList(bans,c=>`${c.bans} <span class="na">· ${pct(c.bans/G)}</span>`,mb,c=>[[c.bans,'--ban',`${c.name}: banido em ${c.bans} de ${G} jogos (${pct(c.bans/G)})`]],82,c=>`Bans de ${c.name} e % dos ${G} jogos`);
  const presRows=barList(pres,c=>pct((c.picks+c.bans)/G),G,c=>[[c.picks,'--pick',`${c.name}: ${c.picks} picks (${c.wins}V ${c.picks-c.wins}D)`],[c.bans,'--ban',`${c.name}: ${c.bans} bans`]],52,c=>`Presença: ${c.picks} picks + ${c.bans} bans = ${c.picks+c.bans} de ${G} jogos`);
  const lanes = LANES.map(([lane]) => {
    const id = lane.toLowerCase();
    const champions = C.filter(c => c.lanes[lane]).sort((a,b) => b.lanes[lane].picks - a.lanes[lane].picks).slice(0, 5);
    const rows = champions.map(c => {
      const name = esc(c.name);
      const games = c.lanes[lane].picks;
      return `<tr>
        <th scope="row"><span class="lane-champion">${ico(c.name)}<span title="${name}">${name}</span></span></th>
        <td data-tip="${name} jogou ${games} vezes de ${lane}">${games}</td>
        <td>${wrPill(c.wins, c.picks)}</td>
      </tr>`;
    }).join("");
    const href = window.frameElement ? `./#/worlds/campeoes?posicao=${id}` : `#${id}`;
    return `<article class="wl-panel lane-card" data-go="${id}">
      <h3 class="wl-card-title" id="lane-title-${id}"><span class="lane-label">${laneIconMarkup(lane)}${lane}</span></h3>
      <table aria-labelledby="lane-title-${id}">
        <thead><tr><th scope="col">Campeão</th><th scope="col" data-tip="Jogos nesta lane">Jogos</th><th scope="col" data-tip="Taxa de vitória do campeão em todas as posições">Vitórias</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <a class="lane-card-link" href="${href}" aria-label="Ver todos os campeões de ${lane}">Ver todos os campeões ${iconMarkup("next")}</a>
    </article>`;
  }).join("");
  return `<div id="analytics-root"><div class="grid2">
   <section class="wl-panel panel"><h2>Mais pickados</h2><p class="hint">Barra = jogos (verde vitórias, vermelho derrotas). À direita, a taxa de vitória.</p>${pickRows}</section>
   <section class="wl-panel panel"><h2>Mais banidos</h2><p class="hint">Bans e % dos ${G} jogos em que o campeão foi banido.</p>${banRows}</section>
  </div>
  <section class="wl-panel panel" style="margin-top:20px"><h2>Prioridade no draft</h2><p class="hint">Presença = % dos jogos em que o campeão foi pickado ou banido.</p>
   <div class="legend"><span><i class="dot" style="background:var(--pick)"></i>Picks</span><span><i class="dot" style="background:var(--ban)"></i>Bans</span></div>${presRows}</section>
  </div><section class="lane-overview"><h2>Explore por posição</h2><p class="hint">Mais escolhidos em cada posição. A taxa de vitória considera todos os jogos do campeão.</p><div class="lane-grid">${lanes}</div></section>`;
}

function wireLaneOverview(view) {
  view.querySelector(".lane-grid").onclick = event => {
    const card = event.target.closest(".lane-card");
    if (!card || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(card.dataset.go);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
}

// Lane view
let laneSort={k:"picks",d:-1};
const LCOLS=[["name","Campeão"],["picks","Jogos"],["wr","Win rate"],["bans","Bans"],["pres","Presença"],["kda","KDA"],["k","Abates"],["d","Mortes"],["a","Assist."]];
function laneRows(lane){
  return C.filter(c=>c.lanes[lane]).map(c=>{const L=c.lanes[lane];return {c,L,name:c.name,picks:L.picks,wr:c.picks?c.wins/c.picks:0,bans:c.bans,pres:(c.picks+c.bans)/G,
    kda:L.n?kdaOf(L.k,L.d,L.a):-1,k:L.n?L.k:-1,d:L.n?L.d:-1,a:L.n?L.a:-1}});
}
function laneView(lane){
  return `<section><h2>Campeões por posição</h2><p class="hint">Abra um campeão para ver a amostra, os jogadores e a build. Os cabeçalhos ordenam a tabela.</p>
  <div class="wl-panel tools"><input id="q" type="search" placeholder="Buscar campeão…" aria-label="Buscar campeão"></div>
  <div class="wl-panel tablewrap"><table><thead><tr>${LCOLS.map(([k,l])=>`<th><button data-k="${k}" data-tip="${TIPS[k]}">${l}${sortIcons}</button></th>`).join("")}</tr></thead><tbody id="tb"></tbody></table></div></section>`;
}
function wireLane(lane){
  const rows=laneRows(lane), max=Math.max(...rows.map(r=>r.picks));
  const tb=document.getElementById('tb'), q=document.getElementById('q');
  q.value=laneQuery;
  const publish = (replace = false) => publishWorlds("campeoes", laneChampion ? [laneChampion] : [], {posicao:selectedLane, busca:laneQuery}, replace);
  const draw=()=>{
    const f=q.value.trim().toLowerCase();
    const list=rows.filter(r=>r.name.toLowerCase().includes(f)).sort((a,b)=>{const x=a[laneSort.k],y=b[laneSort.k];return (typeof x==="string"?x.localeCompare(y):x-y)*laneSort.d||b.picks-a.picks});
    showSort(laneSort);
    tb.innerHTML=list.map(r=>{const {c,L}=r;const has=!!L.n, slug=championSlug(c.name), open=slug===laneChampion;
      const shared=Object.keys(c.lanes).length>1?`<span class="na" style="font-weight:400"> · também ${Object.keys(c.lanes).filter(x=>x!==lane).join(", ")}</span>`:"";
      return `<tr class="main${open?' open':''}" data-champion="${slug}" tabindex="0"><td class="champ"><span class="chev">${iconMarkup("next")}</span>${ico(c.name)}${esc(c.name)}${shared}</td>
       <td class="num" data-tip="${r.picks} jogos de ${lane}"><div class="mini" style="justify-content:flex-end">${r.picks}<span class="track"><i style="width:${r.picks/max*100}%;background:var(${LC[lane]})"></i></span></div></td>
       <td class="num">${wrPill(c.wins,c.picks)}</td><td class="num" data-tip="Banido em ${c.bans} de ${G} jogos">${c.bans}</td><td class="num" data-tip="${c.picks} picks + ${c.bans} bans em ${G} jogos">${pct(r.pres)}</td>
       <td class="num kda" data-tip="${has?`(${L.k.toFixed(1)} + ${L.a.toFixed(1)}) ÷ ${L.d.toFixed(1)}`:"Sem dados"}">${has?r.kda.toFixed(2):'<span class="na">–</span>'}</td>
       <td class="num">${has?L.k.toFixed(1):'–'}</td><td class="num">${has?L.d.toFixed(1):'–'}</td><td class="num">${has?L.a.toFixed(1):'–'}</td></tr>
       <tr class="detail" ${open?'':'hidden'}><td colspan="9"><div class="champion-detail">${has?`${buildSample(L)}${buildHtml(c, "expanded")}`:`<span class="na">Sem detalhes coletados para este campeão (poucos jogos). ${c.picks} jogos no total, ${c.wins} vitórias.</span>`}</div></td></tr>`}).join("");
  };
  tb.onclick=e=>{
    const tr=e.target.closest('tr.main');if(!tr)return;
    const previous=tb.querySelector("tr.open");
    if(previous){previous.classList.remove("open");previous.nextElementSibling.hidden=true;previous.setAttribute("aria-expanded","false")}
    laneChampion=tr===previous?"":tr.dataset.champion;
    if(laneChampion){tr.classList.add("open");tr.nextElementSibling.hidden=false;tr.setAttribute("aria-expanded","true");revealContent(tr.nextElementSibling.querySelector(".champion-detail"),true)}
    enhanceAnalyticsUI();publish();
  };
  tb.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches('tr.main')){e.preventDefault();e.target.click()}};
  document.querySelector('thead').onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;laneSort=laneSort.k===k?{k,d:-laneSort.d}:{k,d:k==="name"||k==="d"?1:-1};draw()};
  q.oninput=()=>{laneQuery=q.value;laneChampion="";draw();enhanceAnalyticsUI();publish(true)};
  draw();
  enhanceAnalyticsUI();
  if(laneChampion)tb.querySelector("tr.open")?.scrollIntoView({block:"nearest"});
}

// Builds
let bLane="";
let buildMinGames = 0;
let buildSort = {k:"picks", d:-1};
function readBuildMinGames(value) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}
const compactBuilds = matchMedia("(max-width: 767px)");
function syncBuildDetailSpan() {
  const cell = document.querySelector(".build-inline-detail:not([hidden]) > td");
  if (cell) cell.colSpan = compactBuilds.matches ? 4 : 8;
}
compactBuilds.addEventListener("change", syncBuildDetailSpan);
const buildLaneIcon = lane => lane ? laneIconMarkup(lane) : iconMarkup("layers");
function buildsView(){
  return `<section class="builds-page" aria-label="Builds">
  <div class="wl-panel tools"><input id="bq" type="search" placeholder="Buscar campeão ou item…" aria-label="Buscar campeão ou item">
  <div class="build-lane-tabs" role="group" aria-label="Filtrar por posição">
    ${["", ...LANES.map(([lane]) => lane)].map(lane => {
      const label = esc(lane || "Todas as posições");
      return `<button type="button" data-slot="button" data-variant="ghost" data-lane="${esc(lane)}" aria-label="${label}" title="${label}" aria-pressed="${lane === bLane}">${buildLaneIcon(lane)}</button>`;
    }).join("")}
  </div>
  <label class="build-min-games" for="bmin">Mínimo de jogos <input id="bmin" type="number" min="0" step="1" inputmode="numeric" value="${buildMinGames}"></label>
  <button id="build-clear-all" type="button" data-slot="button" data-variant="outline">${iconMarkup("reset")} Limpar filtros</button></div>
  <div class="bcards" id="bc"></div></section>`}
function wireBuilds(){
  const q=document.getElementById('bq'),bc=document.getElementById('bc');
  const laneTabs = document.querySelector<HTMLElement>(".build-lane-tabs");
  const laneButtons = [...laneTabs.querySelectorAll<HTMLButtonElement>("button")];
  const minimum = document.getElementById("bmin");
  const clearAll = document.getElementById("build-clear-all");
  const hasFilters = () => Boolean(buildQuery || bLane || buildMinGames);
  const list=C.filter(c=>c.build).sort((a,b)=>b.picks-a.picks);
  const bySlug = new Map(list.map(champion => [championSlug(champion.name), champion]));
  let highlights = "";
  const sortBuildRows = () => {
    const body = bc.querySelector(".builds-table tbody");
    if (!body) return;
    const rows = new Map([...body.querySelectorAll(".build-toggle")].map(button => [button.dataset.buildToggle, button.closest("tr")]));
    const value = c => buildSort.k === "wr" ? c.wins / c.picks : c[buildSort.k];
    const ordered = list.filter(c => rows.has(championSlug(c.name)))
      .sort((a,b) => (value(a) - value(b)) * buildSort.d || b.picks - a.picks);
    body.append(...ordered.flatMap(c => {
      const row = rows.get(championSlug(c.name));
      return [row, row.nextElementSibling];
    }));
    showSort(buildSort);
  };
  q.value=buildQuery;
  const publish = (replace = false) => publishWorlds("builds", buildChampion ? [buildChampion] : [], {posicao:bLane.toLowerCase(), busca:buildQuery, minJogos:buildMinGames}, replace);
  const draw=()=>{const f=q.value.trim().toLowerCase();
    clearAll.setAttribute("aria-disabled", String(!hasFilters()));
    const matches=list.filter(c=>buildChampion ? championSlug(c.name)===buildChampion :
      c.picks >= buildMinGames && (!bLane||c.lanes[bLane])&&(c.name.toLowerCase().includes(f)||JSON.stringify(c.build).toLowerCase().includes(f)));
    const champion=buildChampion && matches[0];
    const context = champion ? buildMatchups(champion, champion.lanes[bLane] ? bLane : "") : buildLaneHighlights(matches, bLane);
    highlights = champion ? "" : context;
    const content=champion
      ? `<article class="wl-panel bcard"><h3>${ico(champion.name)}${esc(champion.name)} <span class="build-meta">${champion.main} · ${champion.picks} jogos</span><span class="build-winrate">${wrPill(champion.wins,champion.picks)} <small>de vitórias</small></span></h3>${buildDetails(champion)}</article>`
      : matches.length ? buildsTable(matches) : "";
    const back=buildChampion ? '<div class="build-back"><button data-slot="button" data-variant="outline" data-size="sm" class="build-route" data-build="">Voltar à lista de builds</button></div>' : '';
    bc.classList.toggle("build-detail", !!buildChampion);
    bc.innerHTML=back+(content
      ? `<div class="builds-workspace">${content}<aside class="wl-panel build-context build-context-side" aria-label="Contexto da build" aria-live="polite">${context}</aside></div>`
      : '<div class="empty-state" role="status"><h3>Nenhuma build encontrada</h3><p>Ajuste a busca, a posição ou o mínimo de jogos.</p></div>');
    sortBuildRows();
    enhanceAnalyticsUI();
  };
  const setExpanded = (button, expanded) => {
    button.setAttribute("aria-expanded", String(expanded));
    const detail = document.getElementById(button.getAttribute("aria-controls"));
    detail.hidden = !expanded;
    if(expanded)revealContent(detail.cells[0].firstElementChild,true);
    return detail.cells[0];
  };
  const toggleBuild = toggle => {
    const previous=bc.querySelector('.build-toggle[aria-expanded="true"]');
    if(previous)setExpanded(previous,false);
    const side = bc.querySelector(".build-context-side");
    if(previous===toggle){
      side.innerHTML=highlights;
      return;
    }
    const champion=bySlug.get(toggle.dataset.buildToggle);
    const context=buildMatchups(champion,bLane);
    const cell=setExpanded(toggle,true);
    syncBuildDetailSpan();
    if(!cell.firstElementChild){
      cell.innerHTML=`<div class="champion-detail"><div class="build-inline-heading">
        <h3>Build de ${esc(champion.name)} <small>${champion.picks} jogos</small></h3>
        <button data-slot="button" data-variant="outline" data-size="sm" type="button" data-build="${toggle.dataset.buildToggle}">Abrir página da build</button>
      </div>${buildDetails(champion,"expanded")}
      <section class="build-context build-context-inline" aria-label="Confrontos da build">${context}</section></div>`;
    }
    side.innerHTML=context;
    enhanceAnalyticsUI();
  };
  bc.onclick=e=>{
    const sort = e.target.closest(".builds-table thead button[data-k]");
    if (sort) {
      const k = sort.dataset.k;
      buildSort = {k, d:buildSort.k === k ? -buildSort.d : -1};
      sortBuildRows();
      return;
    }
    const matchup = e.target.closest("[data-build-matchups]");
    if(matchup){
      const parts=[matchup.dataset.lane, matchup.dataset.buildMatchups];
      window.applyWebLolRoute(["confrontos", ...parts], new URLSearchParams());
      publishWorlds("matchups",parts);
      document.querySelector("#mulist [aria-pressed='true']")?.focus();
      window.scrollTo(0, 0);
      return;
    }
    const highlight=e.target.closest("[data-highlight-build]");
    const toggle=highlight ? bc.querySelector(`[data-build-toggle="${highlight.dataset.highlightBuild}"]`)
      : e.target.closest("[data-build-toggle]") ??
        (!e.target.closest("button") && e.target.closest(".build-summary-row")?.querySelector("[data-build-toggle]"));
    if(toggle){
      toggleBuild(toggle);
      if(highlight)toggle.focus({preventScroll:true});
      toggle.scrollIntoView({block:"nearest"});
      return;
    }
    const button=e.target.closest("[data-build]");if(!button)return;
    const previous=buildChampion;
    buildChampion=button.dataset.build;
    draw();publish();
    const next=buildChampion ? bc.querySelector(".build-back button")
      : bc.querySelector(`[data-build-toggle="${previous}"]`);
    (next ?? q).focus();
  };
  q.oninput=()=>{buildQuery=q.value;buildChampion="";draw();publish(true)};
  const syncLane = () => {
    laneButtons.forEach(option => {
      const selected = option.dataset.lane === bLane;
      option.setAttribute("aria-pressed", String(selected));
    });
  };
  laneTabs.onclick = e => {
    const option = e.target.closest("button[data-lane]");
    if (!option || option.dataset.lane === bLane) return;
    bLane = option.dataset.lane;
    buildChampion = "";
    syncLane();
    draw();
    publish();
  };
  syncLane();
  minimum.oninput = () => {
    if (!minimum.validity.valid || (minimum.value && !Number.isSafeInteger(minimum.valueAsNumber))) return;
    const count = readBuildMinGames(minimum.value);
    if (buildMinGames === count) return;
    buildMinGames = count;
    draw();publish(true);
  };
  minimum.onblur = () => { minimum.value = String(buildMinGames); };
  clearAll.onclick = () => {
    if (!hasFilters()) return;
    q.value = buildQuery = "";
    bLane = "";
    buildMinGames = 0;
    minimum.value = "0";
    syncLane();
    draw();publish();
  };
  draw();
}

// Players
let plSort={k:"n",d:-1};
const PCOLS=[["name","Jogador"],["team","Time"],["lane","Lane"],["n","Jogos"],["wr","Win rate"],["kda","KDA"],["chs","Campeões"]];
function playersView(){
  return `<section><h2>Jogadores</h2><p class="hint">Desempenho de cada jogador nos campeões com detalhes coletados (${DATA.players.reduce((s,p)=>s+p.n,0)} participações). Não inclui todos os jogos do torneio.</p>
  <details class="comparison-disclosure" ${window.frameElement?"":"hidden"}><summary>Comparar o desempenho de dois jogadores</summary><div id="analytics-root"></div></details>
  <div class="wl-panel tools"><input id="pq" type="search" placeholder="Buscar jogador ou time…" aria-label="Buscar jogador ou time">
  <select id="pl" aria-label="Filtrar por lane"><option value="">Todas as lanes</option>${LANES.map(([l])=>`<option>${l}</option>`).join("")}</select></div>
  <div class="wl-panel tablewrap"><table><thead><tr>${PCOLS.map(([k,l])=>`<th><button data-k="${k}" data-tip="${k==="wr"?"Vitórias ÷ jogos do jogador":k==="kda"?"(Abates + Assistências) ÷ Mortes, somando todos os jogos":TIPS[k]}">${l}${sortIcons}</button></th>`).join("")}</tr></thead><tbody id="ptb"></tbody></table></div></section>`;
}
function wirePlayers(){
  const rows=DATA.players.map(p=>({...p,wr:p.w/p.n,kda:kdaOf(p.k,p.d,p.a),chs:p.ch.length}));
  const tb=document.getElementById('ptb'),q=document.getElementById('pq'),sel=document.getElementById('pl');
  q.value=playerQuery;
  sel.value=playerLane;
  const publish = (replace = false) => publishWorlds("jogadores", [], {posicao:playerLane.toLowerCase(), busca:playerQuery}, replace);
  const draw=()=>{const f=q.value.trim().toLowerCase(),l=sel.value;
    const list=rows.filter(p=>(!l||p.lane===l)&&(p.name.toLowerCase().includes(f)||p.team.toLowerCase().includes(f)))
      .sort((a,b)=>{const x=a[plSort.k],y=b[plSort.k];return (typeof x==="string"?x.localeCompare(y):x-y)*plSort.d||b.n-a.n});
    showSort(plSort);
    tb.innerHTML=list.map(p=>`<tr><td class="champ">${esc(p.name)}</td><td><span class="team-cell">${teamLogo(p.team)}${esc(p.team)}</span></td><td><span class="lane-label">${laneIconMarkup(p.lane)}${p.lane}</span></td>
      <td class="num">${p.n}</td><td class="num">${wrPill(p.w,p.n)}</td><td class="num kda">${p.kda.toFixed(2)}</td>
      <td><div class="chips">${p.ch.map(([c,n])=>`<span class="chip">${ico(c)}${esc(c)} · ${n}</span>`).join("")}</div></td></tr>`).join("");
  };
  document.querySelector('thead').onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.k;plSort=plSort.k===k?{k,d:-plSort.d}:{k,d:["name","team","lane"].includes(k)?1:-1};draw()};
  q.oninput=()=>{playerQuery=q.value;draw();enhanceAnalyticsUI();publish(true)};
  sel.onchange=()=>{playerLane=sel.value;draw();enhanceAnalyticsUI();publish()};
  draw();
  enhanceAnalyticsUI();
}
// Matchups
let muLane="Mid", muChamp=null;
function muView(){
  return `<section class="matchups-view"><h2>Confrontos por posição</h2><p class="hint">Como cada campeão foi contra o adversário direto da mesma lane. Base: ${DATA.mgames} jogos com draft completo. Escolha a lane e o campeão.</p>
  <nav id="mulanes" style="margin:0 0 12px">${LANES.map(([l])=>`<button data-slot="button" data-variant="ghost" data-l="${l}" aria-selected="${l===muLane}"><span class="lane-label">${laneIconMarkup(l)}${l}</span></button>`).join("")}</nav>
  <div class="matchups-grid">
   <div class="wl-panel panel mu-picker"><div class="mu-picker-heading"><h2>Escolha o campeão</h2></div><div id="mulist" class="mulist"></div></div>
   <div class="wl-panel panel" id="mudetail"></div>
  </div>
  <section class="wl-panel panel mu-repeated"><h2>Confrontos mais repetidos</h2><p class="hint">Duelos que mais aconteceram nesta lane. A barra mostra quem venceu mais.</p><div id="mutop" class="bars"></div></section></section>`;
}
function wireMu(){
  const M=DATA.matchups[muLane]||{};
  const champs=Object.entries(M).map(([c,ops])=>({c,n:ops.reduce((s,o)=>s+o[1],0),w:ops.reduce((s,o)=>s+o[2],0)})).sort((a,b)=>b.n-a.n);
  if(!muChamp||!M[muChamp])muChamp=champs[0]&&champs[0].c;
  document.getElementById('mulanes').onclick=e=>{const b=e.target.closest('button');if(!b)return;muLane=b.dataset.l;muChamp=null;render("matchups");publishWorlds("matchups",[muLane.toLowerCase()])};
  const list=document.getElementById('mulist');
  list.innerHTML=champs.map(x=>`<button class="murow" aria-pressed="${x.c===muChamp}" data-c="${esc(x.c)}"><span class="nmi">${ico(x.c)}${esc(x.c)}</span><span class="na">${x.n} jogos</span>${wrPill(x.w,x.n)}</button>`).join("");
  list.onclick=e=>{const b=e.target.closest('button');if(!b)return;muChamp=b.dataset.c;wireMu();publishWorlds("matchups",[muLane.toLowerCase(),championSlug(muChamp)])};
  const ops=orderedMatchups(muLane,muChamp);
  const tot=ops.reduce((s,o)=>s+o[1],0), tw=ops.reduce((s,o)=>s+o[2],0);
  const good=ops.filter(o=>o[1]>=2&&o[2]/o[1]>=.6), bad=ops.filter(o=>o[1]>=2&&o[2]/o[1]<=.4);
  document.getElementById('mudetail').innerHTML=`<div class="muhead">${ico(muChamp)}<div><h2 style="margin:0">${esc(muChamp)} <span class="na" style="font-size:16px">${muLane}</span></h2>
    <div class="hint" style="margin:0">${tot} jogos · ${tw}V ${tot-tw}D · ${ops.length} adversários diferentes</div></div></div>
   <div class="chips" style="margin:12px 0">${good.length?`<span class="na" style="font-size:12px;align-self:center">Maior taxa de vitória:</span>`+good.map(o=>`<span class="chip good">${ico(o[0])}${esc(o[0])} ${o[2]}-${o[1]-o[2]}</span>`).join(""):""}
   ${bad.length?`<span class="na" style="font-size:12px;align-self:center;margin-left:8px">Menor taxa de vitória:</span>`+bad.map(o=>`<span class="chip bad">${ico(o[0])}${esc(o[0])} ${o[2]}-${o[1]-o[2]}</span>`).join(""):""}</div>
   <div class="tablewrap mu-table"><table><thead><tr><th>Contra</th><th>Jogos</th><th>Resultado</th><th>KDA ${esc(muChamp)}</th><th>KDA adversário</th><th>K / D / A médio</th></tr></thead>
   <tbody>${ops.map(o=>{const[op,n,w,k,d,a,ok,od,oa]=o;const my=kdaOf(k,d,a),their=kdaOf(ok,od,oa);
     return `<tr><td class="champ"><span class="nmi">${ico(op)}${esc(op)}</span></td><td class="num">${n}</td>
     <td><span class="mini"><span class="wl" data-tip="${w} vitórias e ${n-w} derrotas contra ${esc(op)}">${'<i class="w"></i>'.repeat(w)}${'<i class="l"></i>'.repeat(n-w)}</span>${wrPill(w,n)}</span></td>
     <td class="num kda" style="color:var(${my>=their?'--good':'--bad'})" data-tip="KDA de ${esc(muChamp)} nesses jogos: (${k} + ${a}) ÷ ${d}">${my.toFixed(2)}</td><td class="num" data-tip="KDA de ${esc(op)} nesses jogos: (${ok} + ${oa}) ÷ ${od}">${their.toFixed(2)}</td>
     <td class="num">${(k/n).toFixed(1)} / ${(d/n).toFixed(1)} / ${(a/n).toFixed(1)}</td></tr>`}).join("")}</tbody></table></div>
   <p class="hint" style="margin:10px 0 0">Com 1 ou 2 jogos o resultado é só um indício. Os destaques consideram duelos com pelo menos 2 jogos.</p>`;
  // most repeated duels in lane
  const seen=new Set(), pairs=[];
  for(const [c,ops2] of Object.entries(M))for(const o of ops2){const key=[c,o[0]].sort().join("|");if(seen.has(key))continue;seen.add(key);pairs.push({a:c,b:o[0],n:o[1],w:o[2]})}
  pairs.sort((x,y)=>y.n-x.n);
  const top=pairs.slice(0,10), mx=top.length?top[0].n:1;
  document.getElementById('mutop').innerHTML=top.map(p=>`<div class="duel"><span class="nmi">${ico(p.a)}${esc(p.a)}</span>
    <span class="track"><i style="width:${p.w/p.n*100}%;background:var(${LC[muLane]})"></i><i style="width:${(p.n-p.w)/p.n*100}%;background:var(--line)"></i></span>
    <span class="nmi" style="justify-content:flex-end">${esc(p.b)}${ico(p.b)}</span><span class="val">${p.w}-${p.n-p.w}</span></div>`).join("");
}
const compChampionLanes = new Map();
for (const game of DATA.comps) {
  for (const [lane, blue, , , red] of game.p) {
    for (const name of [blue, red]) {
      if (!compChampionLanes.has(name)) compChampionLanes.set(name, new Set());
      compChampionLanes.get(name).add(lane);
    }
  }
}
const compChampions = new Map(
  [...compChampionLanes.keys()]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map(name => [championSlug(name), name]),
);
let cTeam="",cQ="",cSt="",cChamps=new Set();
const teamFilterLabel = () => cTeam ? `${teamLogo(cTeam)}<span class="comp-team-name" title="${esc(cTeam)}">${esc(cTeam)}</span>` : "Todos os times";
function compPicker({id, label, value, hint, options, image, search, empty, clear, category}) {
  return `<div class="comp-picker-field"><span>${label}</span>
    <button id="${id}" class="comp-picker-trigger" type="button" data-slot="button" data-variant="outline" data-floating-picker aria-expanded="false" aria-controls="${id}-picker"${hint ? ` aria-describedby="${hint}"` : ""}>
      <span class="comp-picker-value">${value}</span>${iconMarkup("descending")}
    </button>
    <div id="${id}-picker" class="comp-picker" role="group" aria-label="Filtro de ${label.toLowerCase()}" hidden>
      <input class="comp-picker-search" type="search" aria-label="${search}" placeholder="${search}">
      <div class="comp-picker-categories" role="group" aria-label="${category.label}">
        <button type="button" data-category="" data-slot="button" data-variant="outline" aria-pressed="true">${category.all}</button>
        ${category.values.map(name => `<button type="button" data-category="${esc(name)}" data-slot="button" data-variant="outline" aria-label="${esc(name)}" title="${esc(name)}" aria-pressed="false">${category.icon ? category.icon(name) : esc(name)}</button>`).join("")}
      </div>
      <div class="comp-picker-grid" role="group" aria-label="${label} disponíveis">
        ${[...options].map(([key, name]) => `<button type="button" data-option="${esc(key)}" data-categories="${esc(category.forName(name).join(","))}" aria-label="${esc(name)}" aria-pressed="false" title="${esc(name)}">${image(name)}<span class="comp-picker-check">${iconMarkup("check")}</span></button>`).join("")}
      </div>
      <p class="comp-filter-hint" role="status" hidden>${empty}</p>
      <div class="comp-picker-actions">
        <button type="button" data-picker-clear data-slot="button" data-variant="ghost">${iconMarkup("reset")} ${clear}</button>
      </div>
    </div>
  </div>`;
}
function compsView(){
  const teams=[...new Set(DATA.comps.flatMap(g=>[g.b,g.r]))].sort();
  const sts=[...new Set(DATA.comps.map(g=>g.st))];
  return `<section class="worlds-compositions" aria-labelledby="comps-title">
    <div class="comps-intro">
      <h2 id="comps-title">Composições do Worlds</h2>
      <p class="hint">Compare campeões, jogadores e KDA nas cinco rotas de cada partida. A base reúne ${DATA.mgames} jogos com draft completo.</p>
    </div>
    <div class="wl-panel comp-filters" role="group" aria-label="Filtrar jogos">
      <label for="cq">Buscar<input id="cq" type="search" placeholder="Campeão ou jogador" value="${esc(cQ||"")}"></label>
      ${compPicker({id:"cc", label:"Campeões", value:`${iconMarkup("champion-add")} Escolher campeões`, hint:"cc-hint",
        options:compChampions, image:ico, search:"Buscar campeão", empty:"Nenhum campeão encontrado.", clear:"Limpar seleções",
        category:{label:"Rota jogada no Worlds", all:"Todas", values:LANES.map(([lane]) => lane), icon:laneIconMarkup, forName:name => [...compChampionLanes.get(name)]}})}
      ${compPicker({id:"ct", label:"Times", value:teamFilterLabel(),
        options:teams.map(team => [team, team]), image:teamLogo, search:"Buscar time", empty:"Nenhum time encontrado.", clear:"Todos os times",
        category:{label:"Região", all:"Todas", values:[...new Set(teams.map(teamRegion).filter(Boolean))].sort(), forName:name => [teamRegion(name)]}})}
      <label for="cs">Fase<select id="cs"><option value="">Todas as fases</option>${sts.map(t=>`<option${t===cSt?' selected':''}>${esc(t)}</option>`).join("")}</select></label>
      <button id="comp-clear-all" type="button" data-slot="button" data-variant="outline">${iconMarkup("reset")} Limpar todos os filtros</button>
      <p id="cc-hint" class="comp-filter-hint">A partida precisa ter todos os campeões selecionados, em qualquer lado.</p>
      <div id="cc-active" class="comp-filter-chips" role="group" aria-label="Campeões selecionados" hidden></div>
    </div>
    <p class="comp-count" id="cn" role="status"></p>
    <div class="cgrid" id="cl"></div>
  </section>`;
}
function wireCompPicker(id, {isSelected, onSelect, onClear}) {
  const trigger = document.getElementById(id);
  const picker = document.getElementById(`${id}-picker`);
  const search = picker.querySelector("input");
  const grid = picker.querySelector(".comp-picker-grid");
  const categories = picker.querySelector(".comp-picker-categories");
  let category = "";
  const empty = picker.querySelector('[role="status"]');
  const clear = picker.querySelector("[data-picker-clear]");
  const options = [...grid.querySelectorAll("button")].map(button => ({
    button,
    name: lolKey(button.getAttribute("aria-label")),
    code: button.querySelector("[data-team]")?.dataset.team || "",
    categories: button.dataset.categories.split(","),
  }));
  const close = wireFloatingPicker(trigger, picker, () => search);
  const filterOptions = () => {
    const query = lolKey(search.value);
    for (const option of options) {
      const matchesCategory = !category || option.categories.includes(category);
      option.button.hidden = !matchesCategory || !(option.name.includes(query) || option.code.includes(query));
    }
    empty.hidden = options.some(({button}) => !button.hidden);
    grid.scrollTop = 0;
  };
  const setCategory = value => {
    category = value;
    for (const chip of categories.querySelectorAll("button")) {
      chip.setAttribute("aria-pressed", String(chip.dataset.category === category));
    }
    filterOptions();
  };
  categories.onclick = e => {
    const chip = e.target.closest("button[data-category]");
    if (chip) setCategory(chip.dataset.category);
  };
  search.oninput = filterOptions;
  grid.onclick = e => {
    const option = e.target.closest("button[data-option]");
    if (option) onSelect(option.dataset.option);
  };
  clear.onclick = () => {
    if (clear.getAttribute("aria-disabled") !== "true") onClear();
  };
  return {trigger, close, resetBrowseFilters() {
    search.value = "";
    setCategory("");
  }, sync() {
    let hasSelection = false;
    for (const {button} of options) {
      const selected = isSelected(button.dataset.option);
      button.setAttribute("aria-pressed", String(selected));
      hasSelection ||= selected;
    }
    clear.setAttribute("aria-disabled", String(!hasSelection));
  }};
}
function compCard(g, q, champions){
  const hl=(text, selected=false)=>selected || (q && text.toLowerCase().includes(q)) ? `<mark>${esc(text)}</mark>` : esc(text);
  const team=(name, color, won)=>`<div class="match-team" data-side="${color}">
    ${teamLogo(name)}
    <strong class="match-team-name">${esc(name)}${won?`&nbsp;<span class="match-winner" role="img" aria-label="Vencedor" title="Vencedor">${iconMarkup("check")}</span>`:""}</strong>
  </div>`;
  const side=(champion, player, kda, right)=>{
    const pick=`<td class="match-pick"><div class="match-champion">
      ${ico(champion)}<div><strong>${hl(champion, champions.has(champion))}</strong><small>${hl(player)}</small></div>
    </div></td>`;
    const score=`<td class="match-kda" data-tip="Abates / Mortes / Assistências de ${esc(player)}">${kda}</td>`;
    return right ? score+pick : pick+score;
  };
  return `<article class="wl-panel cg">
    <h3 class="match-game">${esc(g.st)} <span aria-hidden="true">·</span> Jogo ${g.g}</h3>
    <div class="match-details">
      <div class="match-scoreboard">${team(g.b,"azul",g.bw)}<span class="vs">VS</span>${team(g.r,"vermelho",!g.bw)}</div>
      <table class="match-lanes" aria-label="Duelos por rota entre ${esc(g.b)} e ${esc(g.r)}">
        <colgroup><col><col class="kda-column"><col class="lane-column"><col class="kda-column"><col></colgroup>
        <thead><tr>
          <th scope="col" aria-label="Campeão e jogador do lado azul">Campeão</th>
          <th scope="col" aria-label="KDA do lado azul">KDA</th>
          <th scope="col">Rota</th>
          <th scope="col" aria-label="KDA do lado vermelho">KDA</th>
          <th scope="col" aria-label="Campeão e jogador do lado vermelho">Campeão</th>
        </tr></thead>
        <tbody>${g.p.map(([l,cb,pb,kb,cr,pr,kr])=>`<tr>${side(cb,pb,kb,false)}<td class="match-lane">${laneIconMarkup(l,true)}</td>${side(cr,pr,kr,true)}</tr>`).join("")}</tbody>
      </table>
    </div>
  </article>`;
}
function wireComps(){
  const order=g=>{const m=g.s.match(/(\d+)/g)||[];const base=g.s.startsWith('play')?0:g.s.includes('quarter')?200:g.s.includes('semi')?300:g.s.includes('final')?400:100;return base+(+m[0]||0)*10+(+m[1]||0)/100};
  const all=DATA.comps.slice().sort((a,b)=>order(b)-order(a)||a.g-b.g);
  const activeChampions = document.getElementById("cc-active");
  const search = document.getElementById("cq");
  const stage = document.getElementById("cs");
  const clearAll = document.getElementById("comp-clear-all");
  const hasFilters = () => Boolean(cQ || cTeam || cSt || cChamps.size);
  const drawChampions = () => {
    championPicker.sync();
    activeChampions.hidden = cChamps.size === 0;
    activeChampions.innerHTML = [...cChamps].map(slug => {
      const name = compChampions.get(slug);
      return `<button type="button" data-slot="button" data-variant="outline" data-champion="${slug}" aria-label="Remover ${esc(name)} do filtro">${ico(name)}${esc(name)}${iconMarkup("close")}</button>`;
    }).join("");
  };
  const draw=()=>{
    clearAll.setAttribute("aria-disabled", String(!hasFilters()));
    const q=(cQ||"").trim().toLowerCase();
    const champions = [...cChamps].map(slug => compChampions.get(slug));
    const L = all.filter(g =>
      (!cTeam || g.b === cTeam || g.r === cTeam) &&
      (!cSt || g.st === cSt) &&
      champions.every(name => g.p.some(([, blue, , , red]) => blue === name || red === name)) &&
      (!q || g.p.some(r => [r[1], r[2], r[4], r[5]].some(t => t.toLowerCase().includes(q))))
    );
    let extra="";
    if(cTeam){const w=L.filter(g=>(g.b===cTeam)===g.bw).length;extra=`<span>${esc(cTeam)} · ${w} vitórias · ${L.length-w} derrotas</span>`}
    document.getElementById('cn').innerHTML=`<strong>${L.length} jogo${L.length===1?'':'s'}</strong>${extra}`;
    const highlightedChampions = new Set(champions);
    document.getElementById('cl').innerHTML=L.map(g=>compCard(g,q,highlightedChampions)).join("")||'<div class="empty-state"><h3>Nenhum jogo encontrado</h3><p>Remova um campeão ou ajuste os outros filtros para ver mais partidas.</p></div>';
  };
  const publish = (replace = false) => publishWorlds("comps", [], {time:cTeam, fase:cSt, busca:cQ, campeoes:[...cChamps].join(",")}, replace);
  const updateResults = () => {
    draw();
    enhanceAnalyticsUI();
    publish();
  };
  const updateChampions = () => {
    drawChampions();
    updateResults();
  };
  const championPicker = wireCompPicker("cc", {
    isSelected: slug => cChamps.has(slug),
    onSelect: slug => {
      if (cChamps.has(slug)) cChamps.delete(slug);
      else cChamps.add(slug);
      updateChampions();
    },
    onClear: () => {
      cChamps.clear();
      updateChampions();
    },
  });
  const drawTeam = () => {
    teamPicker.trigger.querySelector(".comp-picker-value").innerHTML = teamFilterLabel();
    teamPicker.sync();
  };
  const selectTeam = team => {
    cTeam = team;
    drawTeam();
    teamPicker.close();
    updateResults();
  };
  const teamPicker = wireCompPicker("ct", {
    isSelected: team => team === cTeam,
    onSelect: selectTeam,
    onClear: () => selectTeam(""),
  });
  activeChampions.onclick = e => {
    const button = e.target.closest("button[data-champion]");
    if (!button) return;
    cChamps.delete(button.dataset.champion);
    updateChampions();
    championPicker.trigger.focus();
  };
  search.oninput = () => { cQ=search.value; draw(); enhanceAnalyticsUI(); publish(true); };
  stage.onchange = () => { cSt=stage.value; updateResults(); };
  clearAll.onclick = () => {
    if (!hasFilters()) return;
    search.value = cQ = "";
    stage.value = cSt = "";
    cTeam = "";
    cChamps.clear();
    championPicker.resetBrowseFilters();
    teamPicker.resetBrowseFilters();
    drawTeam();
    updateChampions();
  };
  teamPicker.sync();
  drawChampions();
  draw();
  enhanceAnalyticsUI();
}

if (!window.frameElement) {
  addEventListener("hashchange", () => render(location.hash.slice(1) || "geral"));
  render(location.hash.slice(1) || "geral");
} else render("geral");

function enhanceAnalyticsUI() {
  document.querySelectorAll(".tablewrap:not(.builds-table-wrap)").forEach(el => {
    el.tabIndex = 0; el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Tabela de estatísticas. Role horizontalmente para ver todas as colunas.");
  });
  document.querySelectorAll("tr.main").forEach(el => el.setAttribute("aria-expanded", String(el.classList.contains("open"))));
  document.querySelectorAll("[data-tip]").forEach(el => {
    if (el.matches(".item,.rune-token,.preview-item")) el.tabIndex = 0;
    el.setAttribute("aria-describedby", "tip");
  });
  for (const id of ["tb", "ptb"]) {
    const body = document.getElementById(id);
    if(body && !body.children.length) body.innerHTML = `<tr><td colspan="${id === "tb" ? 9 : 7}"><div class="empty-state" role="status"><h3>Nenhum resultado</h3><p>Revise a busca ou o filtro de posição para encontrar outros resultados.</p></div></td></tr>`;
  }
}
