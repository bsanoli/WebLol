// @ts-nocheck -- Integração legada com o DOM e dados locais.
import { iconMarkup } from "@/shared/ui/icon"
import { revealContent } from "@/shared/lib/motion"
import { WAVE_HTML } from "./wave-guide"

/* ===== Conhecimento: tempos dos objetivos ===== */
import { gameIconMarkup } from "./game-icon"

const OBJ=[
 {n:"Dragões elementais",icon:"dragon",c:"#e08a3c",first:"5:00",resp:"5:00",rs:300,rows:[["Onde","Rio de baixo"],["Alma","4º dragão do mesmo time"],["Rift elemental","Muda o mapa após o 2º dragão"]],p:"O 3º dragão define o elemento da Alma (o mapa muda depois do 2º)."},
 {n:"Dragão Ancião",icon:"dragon_elder",c:"#9fd3e6",first:"6:00 após a Alma",resp:"6:00",rs:360,rows:[["Onde","Rio de baixo"],["Buff","~2:30 · executa inimigos com vida baixa"]],p:"Só aparece depois que algum time pega a Alma de dragão."},
 {n:"Vastilarvas (Voidgrubs)",icon:"grub",c:"#a36be0",first:"8:00",resp:"Não volta",rows:[["Onde","Fosso de cima (do Barão)"],["Quantidade","3 larvas, 1 onda só"],["Some","~14:45 se ninguém pegar"]],p:"Desde o patch 25.9 não existe mais a 2ª onda. Bônus contra torres para quem pegar."},
 {n:"Arauto do Vale",icon:"riftherald",c:"#d75a8c",first:"15:00",resp:"Não volta",rows:[["Onde","Fosso de cima"],["Some","19:45 se ninguém pegar"],["Uso","Olho do Arauto para derrubar torre"]],p:"Um por jogo. Divide o fosso com o Barão, que nasce aos 20:00."},
 {n:"Barão Na'Shor",icon:"baron",c:"#8a6be0",first:"20:00",resp:"6:00",rs:360,rows:[["Onde","Fosso de cima"],["Buff","3:00 · empodera minions e recall"]],p:"Voltou para 20:00 na temporada 2026 (patch 26.1)."},
];
const CAMPS=[
 ["Buffs (Azul / Vermelho)","0:55","5:00",300],
 ["Scuttle (caranguejo do rio)","2:55","2:30",150],
 ["Lobos / Aves (Raptors)","0:55","2:15",135],
 ["Gromp / Krugs","1:07","2:15",135],
 ["Inibidor","—","5:00",300],
 ["Minions (1ª onda)","0:30","—",0],
];
const OTHER=[
 ["Ondas de minions","1ª onda aos 0:30. Depois da fase de rotas a cada 25s, e a cada 20s no fim do jogo."],
 ["Super minions","Saem em toda onda enquanto o inibidor estiver caído."],
 ["Torre do Nexus","Volta com 40% de vida."],
 ["Faelights","Pontos fixos que dão visão extra; alguns desde o início, mais quando o mapa muda pelo dragão."],
];
const toS=t=>{const m=String(t).trim().match(/^(\d{1,2})[:.,h ]?(\d{2})?$/);if(!m)return null;return(+m[1])*60+(+(m[2]||0))};
const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
/* ===== Conhecimento: controle de wave ===== */
export function mountKnowledge({ getState, save, publishTeamRoute, mountSectionTabs }) {
const $ = selector => document.querySelector(selector);
function renderKnow(){
  const S = getState();
  const kt=S.kTab||"obj";
  const know = $("#know");
  const previousTab = know.dataset.activeTab;
  if (!know.firstElementChild) {
    know.innerHTML = `<div class="ktabs"></div>
  <div id="panel-wave" role="tabpanel" aria-labelledby="tab-wave">${WAVE_HTML}</div>
  <div id="panel-obj" role="tabpanel" aria-labelledby="tab-obj">
  <div class="warn">${iconMarkup("warning")} Tempos da temporada 2026 (patch 26.1 em diante, jogo atual 16.x). As mudanças vieram do preview oficial da Riot e de guias de 2026; os primeiros spawns da selva são das notas do patch 26.1; os tempos de volta dos campos pequenos são os de sempre. Confirmem no jogo se algum patch novo mexer nisso. Os tempos são do relógio do jogo.</div>
  <div class="kgrid">${OBJ.map((o,i)=>`<div class="wl-panel obj"><h3>${gameIconMarkup(o.icon)}<span>${o.n}</span></h3>
     <div class="kv"><span>Primeiro spawn</span><span>${o.first}</span></div>
     <div class="kv"><span>Volta em</span><span>${o.resp}</span></div>
     ${o.rows.map(r=>`<div class="kv"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("")}
     <p>${o.p}</p>
     ${o.rs?`<div class="calc">Morreu em <input data-slot="input" data-o="${o.rs}" placeholder="mm:ss"> → volta <span class="r" id="r${i}">—</span></div>`:""}
   </div>`).join("")}</div>
  <h2 class="ks">Selva e estruturas</h2>
  <table><tr><th>O quê</th><th>Primeiro spawn</th><th>Volta em</th><th>Calculadora</th></tr>
  ${CAMPS.map((c,i)=>`<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]?`<div class="calc" style="margin:0">morreu <input data-slot="input" data-o="${c[3]}" placeholder="mm:ss"> → <span class="r">—</span></div>`:""}</td></tr>`).join("")}</table>
  <h2 class="ks">Ouro das torres e placas (patch 26.1)</h2>
  <table><tr><th>Torre</th><th>Placas</th><th>Ouro por placa</th><th>Total</th><th>Detalhes</th></tr>
  <tr><td>Externa (T1)</td><td>5</td><td>120</td><td>até 600</td><td>A placa perde 10 de ouro por minuto a partir dos 11:00, no máximo −40 (fica em 80 a partir dos 15:00). Torre destruída não dá ouro extra (antes dava 250). Total mínimo de 400.</td></tr>
  <tr><td>Interna (T2)</td><td>5</td><td>120</td><td>600</td><td>Os 600 de ouro foram divididos entre as 5 placas (novo em 2026).</td></tr>
  <tr><td>Inibidor (T3)</td><td>5</td><td>120</td><td>600</td><td>Os 600 de ouro foram divididos entre as 5 placas (novo em 2026).</td></tr>
  <tr><td>Primeira torre do jogo</td><td>—</td><td>—</td><td>+300</td><td>Dividido entre os aliados próximos. Primeiro abate do jogo vale +100.</td></tr>
  </table>
  <p style="color:var(--mut);font-size:12px;margin:8px 0 0">Placas são permanentes (não caem mais aos 14:00) e caem quando a torre perde 10%, 25%, 45%, 70% e 100% da vida. Cada placa quebrada dá 20s de resistência extra (Bulwark) à torre. Valores do patch 26.1: patches seguintes podem ter ajustado o ouro.</p>
  <h2 class="ks">Outras regras de 2026</h2>
  <table>${OTHER.map(o=>`<tr><td style="width:180px;color:var(--gold)">${o[0]}</td><td>${o[1]}</td></tr>`).join("")}</table>
  <h2 class="ks">Linha do tempo do início de jogo</h2>
  <table><tr><th>Tempo</th><th>Evento</th></tr>
  ${[["0:30","1ª onda de minions"],["0:55","Buffs e campos da selva"],["1:07","Gromp e Krugs"],["2:55","Scuttles"],["5:00","1º dragão"],["8:00","Vastilarvas (única onda)"],["15:00","Arauto do Vale"],["19:45","Arauto some se ninguém pegou"],["20:00","Barão Na'Shor"]].map(r=>`<tr><td style="width:100px;font-weight:700">${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>
  <p style="color:var(--mut);font-size:12px;margin-top:18px">Fontes: <a style="color:var(--acc)" href="https://www.leagueoflegends.com/news/dev/dev-2026-season-one-gameplay-preview/" target="_blank">Riot — /dev 2026 Season One</a> · <a style="color:var(--acc)" href="https://www.nerfplz.com/2026/08/every-summoners-rift-objective.html" target="_blank">nerfplz — Every Summoner's Rift objective</a> · <a style="color:var(--acc)" href="https://www.riftpatchnotes.com/lol/unit/void-grubs" target="_blank">riftpatchnotes — Voidgrubs</a> · <a style="color:var(--acc)" href="https://www.leagueoflegends.com/en-sg/news/game-updates/patch-26-1-notes/" target="_blank">Riot — Notas do patch 26.1</a></p></div>`;
  }
  know.dataset.activeTab = kt;
  mountSectionTabs(know.querySelector(".ktabs"), "Seção de conhecimento", kt, [
    { value: "obj", label: "Objetivos e tempos", icon: "clock" },
    { value: "wave", label: "Controle de wave", icon: "book" },
  ], value => {
    S.kTab = value;
    save(false);
    renderKnow();
    publishTeamRoute("know");
  });
  $("#panel-wave").hidden = kt !== "wave";
  $("#panel-obj").hidden = kt !== "obj";
  if (previousTab && previousTab !== kt) revealContent($("#k-" + kt));
}
$("#know").addEventListener("input",e=>{const inp=e.target.closest("[data-o]");if(!inp)return;const s=toS(inp.value);const out=inp.parentElement.querySelector(".r");out.textContent=s==null?"—":fmt(s+ +inp.dataset.o)});

return renderKnow;
}
