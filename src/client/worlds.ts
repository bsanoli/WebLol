// @ts-nocheck -- A tela legada ainda usa estado e eventos DOM sem tipos explícitos.
import { iconMarkup } from "./icon"
import DATA from "../data/worlds.json"
import { lolAsset, lolChampion } from "./lol-media"
import { buildHtml, buildsTable } from "./worlds-builds"
import { LANES, LC, pct, wrPill, ico, esc, championSlug } from "./worlds-display"

const G=DATA.games, C=DATA.champs;
const tipEl=()=>document.getElementById('tip');
function showTip(t,x,y){const el=tipEl();el.textContent=t;el.hidden=false;const r=el.getBoundingClientRect();let L=x+14,T=y+16;if(L+r.width>innerWidth-8)L=x-r.width-14;if(T+r.height>innerHeight-8)T=y-r.height-12;el.style.left=Math.max(8,L)+"px";el.style.top=Math.max(8,T)+"px"}
document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t.dataset.tip,e.clientX,e.clientY);else tipEl().hidden=true});
document.addEventListener('focusin',e=>{const t=e.target.closest('[data-tip]');if(t){const r=t.getBoundingClientRect();showTip(t.dataset.tip,r.left,r.bottom)}});
document.addEventListener('focusout',()=>tipEl().hidden=true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')tipEl().hidden=true});
document.addEventListener('scroll',()=>tipEl().hidden=true,true);
const TIPS={picks:"Jogos em que o campeão foi escolhido nesta lane",wr:"Vitórias ÷ jogos do campeão no torneio",bans:"Quantas vezes foi banido",pres:"% dos jogos em que foi pickado ou banido",kda:"(Abates + Assistências) ÷ Mortes, pelas médias por jogo",k:"Abates por jogo (média)",d:"Mortes por jogo (média)",a:"Assistências por jogo (média)",name:"Clique para ordenar",n:"Jogos coletados do jogador",team:"Time",lane:"Lane principal",chs:"Campeões mais jogados (jogos)"};
const dot=l=>l?`<span class="dot" style="background:var(${LC[l]})" title="${l}"></span>`:'';
const sortIcons = `<span class="sort-asc">${iconMarkup("ascending")}</span><span class="sort-desc">${iconMarkup("descending")}</span>`;
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
 .map(([v,l],i)=>`<div class="kpi" data-tip="${["Total de jogos do Play-In até as Semifinais","Campeões que foram pickados ou banidos pelo menos uma vez",`${topBan.name} foi banido em ${topBan.bans} de ${G} jogos`,`${topPick.name} foi escolhido em ${topPick.picks} jogos (${topPick.wins} vitórias)`][i]}"><div class="v">${esc(v)}</div><div class="l">${l}</div></div>`).join("");

const TABS = [
  ["geral", "Visão geral", "chart"],
  ["campeoes", "Campeões", "roles"],
  ["builds", "Builds", "box"],
  ["matchups", "Confrontos", "matchups"],
  ["comps", "Composições", "team"],
  ["jogadores", "Jogadores", "users"],
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
    if (!DATA.comps.some(game => game.b === cTeam || game.r === cTeam)) cTeam = "";
    if (!DATA.comps.some(game => game.st === cSt)) cSt = "";
  }
  render(id);
};
const validTab = id => TABS.some(tab => tab[0] === id) || laneById.has(id);
tabsEl.innerHTML = TABS.map(([id, label, icon]) =>
  `<button data-id="${id}">${iconMarkup(icon)}${label}</button>`
).join("");
laneSelect.innerHTML = [...laneById].map(([id, lane]) => `<option value="${id}">${lane}</option>`).join("");
laneSelect.onchange = () => go(laneSelect.value);
tabsEl.onclick = e => {
  const button = e.target.closest("button");
  if (button) go(button.dataset.id === "campeoes" ? selectedLane : button.dataset.id);
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
  if(id==="geral")v.innerHTML=overview();
  else if(id==="jogadores"){v.innerHTML=playersView();wirePlayers()}
  else if(id==="matchups"){v.innerHTML=muView();wireMu()}
  else if(id==="comps"){v.innerHTML=compsView();wireComps()}
  else if(id==="builds"){v.innerHTML=buildsView();wireBuilds()}
  else{const lane=laneById.get(selectedLane);v.innerHTML=laneView(lane);v.querySelector(".tools").prepend(laneFilter);wireLane(lane)}
  document.body.dataset.page = isLane ? "campeoes" : id;
  if(id === "geral" || id === "jogadores") window.frameElement?.dispatchEvent(new CustomEvent("weblol:analytics", { detail: {
    kind: id === "geral" ? "overview" : "players", games: G, players: DATA.players,
    champions: C.map(c => ({name:c.name,picks:c.picks,wins:c.wins,bans:c.bans,portrait:lolChampion(c.name)?.portrait ? lolAsset(lolChampion(c.name).portrait) : undefined}))
  }}));
  enhanceAnalyticsUI();
}

function barList(list,valFn,max,segs,vw=52,tipFn=null){
  return `<div class="bars">${list.map((c,i)=>{
    const s=segs(c).map(([w,col,tip])=>`<i style="width:${w/max*100}%;background:var(${col})" data-tip="${esc(tip||"")}"></i>`).join("");
    return `<div class="bar" style="grid-template-columns:22px minmax(110px,150px) 1fr ${vw}px"><span class="rk">${i+1}</span><span class="nm">${ico(c.name,c.main)}${esc(c.name)}</span><span class="track">${s}</span><span class="val" data-tip="${esc(tipFn?tipFn(c):"")}">${valFn(c)}</span></div>`}).join("")}</div>`;
}
function overview(){
  const picks=[...C].sort((a,b)=>b.picks-a.picks||b.wins-a.wins).slice(0,15);
  const bans=[...C].sort((a,b)=>b.bans-a.bans||b.picks-a.picks).slice(0,15);
  const pres=[...C].sort((a,b)=>(b.picks+b.bans)-(a.picks+a.bans)).slice(0,15);
  const mp=picks[0].picks, mb=bans[0].bans;
  const pickRows=`<div class="bars">${picks.map((c,i)=>`<div class="bar" style="grid-template-columns:22px minmax(110px,150px) 1fr 34px 52px"><span class="rk">${i+1}</span><span class="nm">${ico(c.name,c.main)}${esc(c.name)}</span><span class="track" data-tip="${esc(c.name)}: ${c.wins} vitórias e ${c.picks-c.wins} derrotas em ${c.picks} jogos"><i style="width:${c.wins/mp*100}%;background:var(--good)" data-tip="${esc(c.name)}: ${c.wins} vitórias"></i><i style="width:${(c.picks-c.wins)/mp*100}%;background:var(--bad);opacity:.55" data-tip="${esc(c.name)}: ${c.picks-c.wins} derrotas"></i></span><span class="val" data-tip="Jogos com ${esc(c.name)}: ${c.wins} vitórias, ${c.picks-c.wins} derrotas">${c.picks}</span><span>${wrPill(c.wins,c.picks)}</span></div>`).join("")}</div>`;
  const banRows=barList(bans,c=>`${c.bans} <span class="na">· ${pct(c.bans/G)}</span>`,mb,c=>[[c.bans,'--ban',`${c.name}: banido em ${c.bans} de ${G} jogos (${pct(c.bans/G)})`]],82,c=>`Bans de ${c.name} e % dos ${G} jogos`);
  const presRows=barList(pres,c=>pct((c.picks+c.bans)/G),G,c=>[[c.picks,'--pick',`${c.name}: ${c.picks} picks (${c.wins}V ${c.picks-c.wins}D)`],[c.bans,'--ban',`${c.name}: ${c.bans} bans`]],52,c=>`Presença: ${c.picks} picks + ${c.bans} bans = ${c.picks+c.bans} de ${G} jogos`);
  const lanes=LANES.map(([l,col])=>{
    const ls=C.filter(c=>c.lanes[l]).sort((a,b)=>b.lanes[l].picks-a.lanes[l].picks).slice(0,5);
    return `<button class="lanecard" style="--c:var(${col})" data-go="${l.toLowerCase()}"><h3>${l}</h3><div class="lchead"><span>Campeão</span><span data-tip="Jogos nesta lane">Jogos</span><span data-tip="Taxa de vitória do campeão em todas as posições">Vitórias</span></div><ol>${ls.map(c=>`<li><b class="nmi">${ico(c.name)}<span class="ell" title="${esc(c.name)}">${esc(c.name)}</span></b><span class="lane-games" data-tip="${esc(c.name)} jogou ${c.lanes[l].picks} vezes de ${l}">${c.lanes[l].picks}</span>${wrPill(c.wins,c.picks)}</li>`).join("")}</ol><div class="more" >Ver campeões · ${l} →</div></button>`}).join("");
  setTimeout(() => {
    document.querySelectorAll(".lanecard[data-go]").forEach(card => {
      card.onclick = () => {
        go(card.dataset.go);
        window.scrollTo({ top: 0, behavior: "instant" });
      };
    });
  });
  return `<div id="analytics-root"><div class="grid2">
   <section class="panel"><h2>Mais pickados</h2><p class="hint">Barra = jogos (verde vitórias, vermelho derrotas). À direita, a taxa de vitória.</p>${pickRows}</section>
   <section class="panel"><h2>Mais banidos</h2><p class="hint">Bans e % dos ${G} jogos em que o campeão foi banido.</p>${banRows}</section>
  </div>
  <section class="panel" style="margin-top:20px"><h2>Prioridade no draft</h2><p class="hint">Presença = % dos jogos em que o campeão foi pickado ou banido.</p>
   <div class="legend"><span><i class="dot" style="background:var(--pick)"></i>Picks</span><span><i class="dot" style="background:var(--ban)"></i>Bans</span></div>${presRows}</section>
  </div><section class="lane-overview"><h2>Explore por posição</h2><p class="hint">Mais escolhidos em cada posição. A taxa de vitória considera todos os jogos do campeão.</p><div class="lanes">${lanes}</div></section>`;
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
  <div class="tools"><input id="q" type="search" placeholder="Buscar campeão…" aria-label="Buscar campeão"></div>
  <div class="tablewrap"><table><thead><tr>${LCOLS.map(([k,l])=>`<th><button data-k="${k}" data-tip="${TIPS[k]}">${l}${sortIcons}</button></th>`).join("")}</tr></thead><tbody id="tb"></tbody></table></div></section>`;
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
       <td>${wrPill(c.wins,c.picks)}</td><td class="num" data-tip="Banido em ${c.bans} de ${G} jogos">${c.bans}</td><td class="num" data-tip="${c.picks} picks + ${c.bans} bans em ${G} jogos">${pct(r.pres)}</td>
       <td class="num kda" data-tip="${has?`(${L.k.toFixed(1)} + ${L.a.toFixed(1)}) ÷ ${L.d.toFixed(1)}`:"Sem dados"}">${has?r.kda.toFixed(2):'<span class="na">–</span>'}</td>
       <td class="num">${has?L.k.toFixed(1):'–'}</td><td class="num">${has?L.d.toFixed(1):'–'}</td><td class="num">${has?L.a.toFixed(1):'–'}</td></tr>
       <tr class="detail" ${open?'':'hidden'}><td colspan="9"><div class="champion-detail">${has?`<div class="dgrid">
        <div><h4>Resultado na amostra</h4>${L.w}V – ${L.n-L.w}D em ${L.n} jogos${L.n<L.picks?` <span class="na">(de ${L.picks})</span>`:''}</div>

        <div><h4>Quem jogou</h4><div class="chips">${L.players.map(([p,n])=>`<span class="chip">${esc(p)} · ${n}</span>`).join("")}</div></div>
        <div><h4>Times</h4><div class="chips">${L.teams.map(([t,n])=>`<span class="chip">${esc(t)} · ${n}</span>`).join("")}</div></div>
       </div>${buildHtml(c)}`:`<span class="na">Sem detalhes coletados para este campeão (poucos jogos). ${c.picks} jogos no total, ${c.wins} vitórias.</span>`}</div></td></tr>`}).join("");
  };
  tb.onclick=e=>{
    const tr=e.target.closest('tr.main');if(!tr)return;
    const previous=tb.querySelector("tr.open");
    if(previous){previous.classList.remove("open");previous.nextElementSibling.hidden=true;previous.setAttribute("aria-expanded","false")}
    laneChampion=tr===previous?"":tr.dataset.champion;
    if(laneChampion){tr.classList.add("open");tr.nextElementSibling.hidden=false;tr.setAttribute("aria-expanded","true")}
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
function buildsView(){
  return `<section class="builds-page"><h2>Builds</h2><p class="hint">Compare as escolhas mais frequentes no Worlds. Os percentuais ao lado dos itens, runas e feitiços indicam a frequência de uso.</p>
  <div class="tools"><input id="bq" type="search" placeholder="Buscar campeão ou item…" aria-label="Buscar campeão ou item">
  <select id="bl" aria-label="Filtrar por lane"><option value="">Todas as lanes</option>${LANES.map(([l])=>`<option ${l===bLane?'selected':''}>${l}</option>`).join("")}</select></div>
  <div class="bcards" id="bc"></div></section>`}
function wireBuilds(){
  const q=document.getElementById('bq'),sel=document.getElementById('bl'),bc=document.getElementById('bc');
  const list=C.filter(c=>c.build).sort((a,b)=>b.picks-a.picks);
  q.value=buildQuery;
  const publish = (replace = false) => publishWorlds("builds", buildChampion ? [buildChampion] : [], {posicao:bLane.toLowerCase(), busca:buildQuery}, replace);
  const draw=()=>{const f=q.value.trim().toLowerCase();bLane=sel.value;
    const matches=list.filter(c=>buildChampion ? championSlug(c.name)===buildChampion :
      (!bLane||c.lanes[bLane])&&(c.name.toLowerCase().includes(f)||JSON.stringify(c.build).toLowerCase().includes(f)));
    const champion=buildChampion && matches[0];
    const content=champion
      ? `<article class="bcard"><h3>${ico(champion.name,champion.main)}${esc(champion.name)} <span class="build-meta">${champion.main} · ${champion.picks} jogos</span><span class="build-winrate">${wrPill(champion.wins,champion.picks)} <small>de vitórias</small></span></h3>${buildHtml(champion)}</article>`
      : matches.length ? buildsTable(matches) : "";
    const back=buildChampion ? '<div class="build-back"><button class="build-route" data-build="">Voltar à lista de builds</button></div>' : '';
    bc.classList.toggle("build-detail", !!buildChampion);
    bc.innerHTML=back+(content||'<div class="empty-state" role="status"><h3>Nenhuma build encontrada</h3><p>Tente outro campeão ou item, ou selecione todas as posições.</p></div>');
    enhanceAnalyticsUI();
  };
  bc.onclick=e=>{
    const button=e.target.closest("[data-build]");if(!button)return;
    buildChampion=button.dataset.build;
    draw();publish();
    bc.querySelector("button")?.focus();
  };
  q.oninput=()=>{buildQuery=q.value;buildChampion="";draw();publish(true)};
  sel.onchange=()=>{buildChampion="";draw();publish()};
  draw();
}

// Players
let plSort={k:"n",d:-1};
const PCOLS=[["name","Jogador"],["team","Time"],["lane","Lane"],["n","Jogos"],["wr","Win rate"],["kda","KDA"],["chs","Campeões"]];
function playersView(){
  return `<section><h2>Jogadores</h2><p class="hint">Desempenho de cada jogador nos campeões com detalhes coletados (${DATA.players.reduce((s,p)=>s+p.n,0)} participações). Não inclui todos os jogos do torneio.</p>
  <details class="comparison-disclosure" ${window.frameElement?"":"hidden"}><summary>Comparar o desempenho de dois jogadores</summary><div id="analytics-root"></div></details>
  <div class="tools"><input id="pq" type="search" placeholder="Buscar jogador ou time…" aria-label="Buscar jogador ou time">
  <select id="pl" aria-label="Filtrar por lane"><option value="">Todas as lanes</option>${LANES.map(([l])=>`<option>${l}</option>`).join("")}</select></div>
  <div class="tablewrap"><table><thead><tr>${PCOLS.map(([k,l])=>`<th><button data-k="${k}" data-tip="${k==="wr"?"Vitórias ÷ jogos do jogador":k==="kda"?"(Abates + Assistências) ÷ Mortes, somando todos os jogos":TIPS[k]}">${l}${sortIcons}</button></th>`).join("")}</tr></thead><tbody id="ptb"></tbody></table></div></section>`;
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
    tb.innerHTML=list.map(p=>`<tr><td class="champ">${esc(p.name)}</td><td>${esc(p.team)}</td><td><span class="mini">${dot(p.lane)}${p.lane}</span></td>
      <td class="num">${p.n}</td><td>${wrPill(p.w,p.n)}</td><td class="num kda">${p.kda.toFixed(2)}</td>
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
  <nav id="mulanes" style="margin:0 0 12px">${LANES.map(([l])=>`<button data-l="${l}" aria-selected="${l===muLane}">${dot(l)}${l}</button>`).join("")}</nav>
  <div class="matchups-grid">
   <div class="panel mu-picker"><div style="padding:14px 16px 6px"><h2 style="font-size:18px">Escolha o campeão</h2></div><div id="mulist" class="mulist"></div></div>
   <div class="panel" id="mudetail"></div>
  </div>
  <section class="panel" style="margin-top:20px"><h2>Confrontos mais repetidos</h2><p class="hint">Duelos que mais aconteceram nesta lane. A barra mostra quem venceu mais.</p><div id="mutop" class="bars"></div></section></section>`;
}
function wireMu(){
  const M=DATA.matchups[muLane]||{};
  const champs=Object.entries(M).map(([c,ops])=>({c,n:ops.reduce((s,o)=>s+o[1],0),w:ops.reduce((s,o)=>s+o[2],0)})).sort((a,b)=>b.n-a.n);
  if(!muChamp||!M[muChamp])muChamp=champs[0]&&champs[0].c;
  document.getElementById('mulanes').onclick=e=>{const b=e.target.closest('button');if(!b)return;muLane=b.dataset.l;muChamp=null;render("matchups");publishWorlds("matchups",[muLane.toLowerCase()])};
  const list=document.getElementById('mulist');
  list.innerHTML=champs.map(x=>`<button class="murow" aria-pressed="${x.c===muChamp}" data-c="${esc(x.c)}"><span class="nmi">${ico(x.c,muLane)}${esc(x.c)}</span><span class="na">${x.n} jogos</span>${wrPill(x.w,x.n)}</button>`).join("");
  list.onclick=e=>{const b=e.target.closest('button');if(!b)return;muChamp=b.dataset.c;wireMu();publishWorlds("matchups",[muLane.toLowerCase(),championSlug(muChamp)])};
  const ops=(M[muChamp]||[]).slice().sort((a,b)=>b[1]-a[1]||b[2]/b[1]-a[2]/a[1]);
  const tot=ops.reduce((s,o)=>s+o[1],0), tw=ops.reduce((s,o)=>s+o[2],0);
  const good=ops.filter(o=>o[1]>=2&&o[2]/o[1]>=.6), bad=ops.filter(o=>o[1]>=2&&o[2]/o[1]<=.4);
  document.getElementById('mudetail').innerHTML=`<div class="muhead">${ico(muChamp,muLane)}<div><h2 style="margin:0">${esc(muChamp)} <span class="na" style="font-size:16px">${muLane}</span></h2>
    <div class="hint" style="margin:0">${tot} jogos · ${tw}V ${tot-tw}D · ${ops.length} adversários diferentes</div></div></div>
   <div class="chips" style="margin:12px 0">${good.length?`<span class="na" style="font-size:12px;align-self:center">Maior taxa de vitória:</span>`+good.map(o=>`<span class="chip good">${ico(o[0])}${esc(o[0])} ${o[2]}-${o[1]-o[2]}</span>`).join(""):""}
   ${bad.length?`<span class="na" style="font-size:12px;align-self:center;margin-left:8px">Menor taxa de vitória:</span>`+bad.map(o=>`<span class="chip bad">${ico(o[0])}${esc(o[0])} ${o[2]}-${o[1]-o[2]}</span>`).join(""):""}</div>
   <div class="tablewrap" style="border:none"><table><thead><tr><th style="padding:10px">Contra</th><th style="padding:10px;text-align:right">Jogos</th><th style="padding:10px">Resultado</th><th style="padding:10px;text-align:right">KDA ${esc(muChamp)}</th><th style="padding:10px;text-align:right">KDA adversário</th><th style="padding:10px;text-align:right">K / D / A médio</th></tr></thead>
   <tbody>${ops.map(o=>{const[op,n,w,k,d,a,ok,od,oa]=o;const my=kdaOf(k,d,a),their=kdaOf(ok,od,oa);
     return `<tr><td class="champ"><span class="nmi">${ico(op,muLane)}${esc(op)}</span></td><td class="num">${n}</td>
     <td><span class="mini"><span class="wl" data-tip="${w} vitórias e ${n-w} derrotas contra ${esc(op)}">${'<i class="w"></i>'.repeat(w)}${'<i class="l"></i>'.repeat(n-w)}</span>${wrPill(w,n)}</span></td>
     <td class="num kda" style="color:var(${my>=their?'--good':'--bad'})" data-tip="KDA de ${esc(muChamp)} nesses jogos: (${k} + ${a}) ÷ ${d}">${my.toFixed(2)}</td><td class="num" data-tip="KDA de ${esc(op)} nesses jogos: (${ok} + ${oa}) ÷ ${od}">${their.toFixed(2)}</td>
     <td class="num">${(k/n).toFixed(1)} / ${(d/n).toFixed(1)} / ${(a/n).toFixed(1)}</td></tr>`}).join("")}</tbody></table></div>
   <p class="hint" style="margin:10px 0 0">Com 1 ou 2 jogos o resultado é só um indício. Os destaques consideram duelos com pelo menos 2 jogos.</p>`;
  // most repeated duels in lane
  const seen=new Set(), pairs=[];
  for(const [c,ops2] of Object.entries(M))for(const o of ops2){const key=[c,o[0]].sort().join("|");if(seen.has(key))continue;seen.add(key);pairs.push({a:c,b:o[0],n:o[1],w:o[2]})}
  pairs.sort((x,y)=>y.n-x.n);
  const top=pairs.slice(0,10), mx=top.length?top[0].n:1;
  document.getElementById('mutop').innerHTML=top.map(p=>`<div class="duel"><span class="nmi">${ico(p.a,muLane)}${esc(p.a)}</span>
    <span class="track"><i style="width:${p.w/p.n*100}%;background:var(${LC[muLane]})"></i><i style="width:${(p.n-p.w)/p.n*100}%;background:var(--line)"></i></span>
    <span class="nmi" style="justify-content:flex-end">${esc(p.b)}${ico(p.b,muLane).replace('margin-right:7px','')}</span><span class="val">${p.w}-${p.n-p.w}</span></div>`).join("");
}
let cTeam="",cQ="",cSt="";
function compsView(){
  const teams=[...new Set(DATA.comps.flatMap(g=>[g.b,g.r]))].sort();
  const sts=[...new Set(DATA.comps.map(g=>g.st))];
  return `<section><h2>Composições do Worlds</h2><p class="hint">Composição completa de cada jogo: quem jogou contra quem, com campeão, jogador e K/D/A por lane. Lado azul à esquerda, vermelho à direita. O ícone de confirmação ${iconMarkup("check")} marca o vencedor. Base: ${DATA.mgames} jogos com draft completo.</p>
  <div class="tools"><input id="cq" type="search" placeholder="Buscar campeão ou jogador…" aria-label="Buscar campeão ou jogador" value="${esc(cQ||"")}">
  <select id="ct" aria-label="Time"><option value="">Todos os times</option>${teams.map(t=>`<option${t===cTeam?' selected':''}>${esc(t)}</option>`).join("")}</select>
  <select id="cs" aria-label="Fase"><option value="">Todas as fases</option>${sts.map(t=>`<option${t===cSt?' selected':''}>${esc(t)}</option>`).join("")}</select></div>
  <p class="hint" id="cn"></p><div class="cgrid" id="cl"></div></section>`;
}
function compCard(g,q){
  const hl=t=>q&&t.toLowerCase().includes(q)?`<mark>${esc(t)}</mark>`:esc(t);
  const side=(c,p,k,r)=>{const ch=`<td${r?' class="r"':''}><span class="ch">${ico(c)}<span>${hl(c)}<span class="pl">${hl(p)}</span></span></span></td>`,kd=`<td class="k${r?'':' r'}" data-tip="Abates / Mortes / Assistências de ${esc(p)}">${k}</td>`;return r?kd+ch:ch+kd};
  return `<article class="cg"><div class="st">${esc(g.st)} · Jogo ${g.g}</div>
  <div class="tm"><span class="${g.bw?'won':'lost'}" data-tip="Lado azul${g.bw?' · venceu':''}">${esc(g.b)}${g.bw?` ${iconMarkup("check")}`:''}</span><span class="vs">vs</span><span class="${g.bw?'lost':'won'}" data-tip="Lado vermelho${g.bw?'':' · venceu'}">${esc(g.r)}${g.bw?'':` ${iconMarkup("check")}`}</span></div>
  <table>${g.p.map(([l,cb,pb,kb,cr,pr,kr])=>`<tr>${side(cb,pb,kb,0)}<td class="ln">${dot(l)}</td>${side(cr,pr,kr,1)}</tr>`).join("")}</table></article>`;
}
function wireComps(){
  const order=g=>{const m=g.s.match(/(\d+)/g)||[];const base=g.s.startsWith('play')?0:g.s.includes('quarter')?200:g.s.includes('semi')?300:g.s.includes('final')?400:100;return base+(+m[0]||0)*10+(+m[1]||0)/100};
  const all=DATA.comps.slice().sort((a,b)=>order(b)-order(a)||a.g-b.g);
  const draw=()=>{
    const q=(cQ||"").trim().toLowerCase();
    const L=all.filter(g=>(!cTeam||g.b===cTeam||g.r===cTeam)&&(!cSt||g.st===cSt)&&(!q||g.p.some(r=>[r[1],r[2],r[4],r[5]].some(t=>t.toLowerCase().includes(q)))));
    let extra="";
    if(cTeam){const w=L.filter(g=>(g.b===cTeam)===g.bw).length;extra=` · ${esc(cTeam)}: ${w} vitórias e ${L.length-w} derrotas`}
    document.getElementById('cn').innerHTML=`${L.length} jogo${L.length===1?'':'s'}${extra}`;
    document.getElementById('cl').innerHTML=L.map(g=>compCard(g,q)).join("")||'<p class="hint">Nenhum jogo encontrado.</p>';
  };
  const publish = (replace = false) => publishWorlds("comps", [], {time:cTeam, fase:cSt, busca:cQ}, replace);
  document.getElementById('cq').oninput=e=>{cQ=e.target.value;draw();enhanceAnalyticsUI();publish(true)};
  document.getElementById('ct').onchange=e=>{cTeam=e.target.value;draw();enhanceAnalyticsUI();publish()};
  document.getElementById('cs').onchange=e=>{cSt=e.target.value;draw();enhanceAnalyticsUI();publish()};
  draw();
  enhanceAnalyticsUI();
}

if (!window.frameElement) {
  addEventListener("hashchange", () => render(location.hash.slice(1) || "geral"));
  render(location.hash.slice(1) || "geral");
} else render("geral");

function enhanceAnalyticsUI() {
  document.querySelectorAll(".tablewrap").forEach(el => {
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
