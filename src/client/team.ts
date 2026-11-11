// @ts-nocheck -- O editor legado ainda depende de estado dinâmico vindo do armazenamento local.
import { iconMarkup, laneIconMarkup } from "./icon"
import { LOL_DATA, lolAsset, lolChampion, lolImage } from "./lol-media"
import { initializeTheme } from "./theme"
import { initializeMotionNav, revealContent } from "./motion"

initializeTheme()
initializeMotionNav("header nav")

/* ===== Campeões (funções do editor e catálogo local da Riot) ===== */
const BASE=`Aatrox|Aatrox|T;Ahri|Ahri|M;Akali|Akali|MT;Akshan|Akshan|MT;Alistar|Alistar|S;Ambessa|Ambessa|TJ;Amumu|Amumu|JS;Anivia|Anivia|M;Annie|Annie|MS;Aphelios|Aphelios|A;Ashe|Ashe|AS;Aurelion Sol|AurelionSol|M;Aurora|Aurora|MT;Azir|Azir|M;Bard|Bard|S;Bel'Veth|Belveth|J;Blitzcrank|Blitzcrank|S;Brand|Brand|SMJ;Braum|Braum|S;Briar|Briar|J;Caitlyn|Caitlyn|A;Camille|Camille|TS;Cassiopeia|Cassiopeia|MT;Cho'Gath|Chogath|TM;Corki|Corki|MA;Darius|Darius|T;Diana|Diana|JM;Dr. Mundo|DrMundo|TJ;Draven|Draven|A;Ekko|Ekko|JM;Elise|Elise|J;Evelynn|Evelynn|J;Ezreal|Ezreal|A;Fiddlesticks|Fiddlesticks|J;Fiora|Fiora|T;Fizz|Fizz|M;Galio|Galio|MS;Gangplank|Gangplank|T;Garen|Garen|T;Gnar|Gnar|T;Gragas|Gragas|JTS;Graves|Graves|J;Gwen|Gwen|TJ;Hecarim|Hecarim|J;Heimerdinger|Heimerdinger|MS;Hwei|Hwei|MS;Illaoi|Illaoi|T;Irelia|Irelia|TM;Ivern|Ivern|J;Janna|Janna|S;Jarvan IV|JarvanIV|J;Jax|Jax|TJ;Jayce|Jayce|TM;Jhin|Jhin|A;Jinx|Jinx|A;K'Sante|KSante|T;Kai'Sa|Kaisa|A;Kalista|Kalista|A;Karma|Karma|SM;Karthus|Karthus|J;Kassadin|Kassadin|M;Katarina|Katarina|M;Kayle|Kayle|T;Kayn|Kayn|J;Kennen|Kennen|T;Kha'Zix|Khazix|J;Kindred|Kindred|J;Kled|Kled|T;Kog'Maw|KogMaw|A;LeBlanc|Leblanc|M;Lee Sin|LeeSin|J;Leona|Leona|S;Lillia|Lillia|J;Lissandra|Lissandra|M;Locke|Locke|M;Lucian|Lucian|A;Lulu|Lulu|S;Lux|Lux|SM;Malphite|Malphite|TS;Malzahar|Malzahar|M;Maokai|Maokai|STJ;Master Yi|MasterYi|J;Mel|Mel|MS;Milio|Milio|S;Miss Fortune|MissFortune|A;Mordekaiser|Mordekaiser|T;Morgana|Morgana|S;Naafiri|Naafiri|M;Nami|Nami|S;Nasus|Nasus|T;Nautilus|Nautilus|S;Neeko|Neeko|MS;Nidalee|Nidalee|J;Nilah|Nilah|A;Nocturne|Nocturne|J;Nunu & Willump|Nunu|J;Olaf|Olaf|TJ;Orianna|Orianna|M;Ornn|Ornn|T;Pantheon|Pantheon|TSJ;Poppy|Poppy|TJS;Pyke|Pyke|S;Qiyana|Qiyana|JM;Quinn|Quinn|T;Rakan|Rakan|S;Rammus|Rammus|J;Rek'Sai|RekSai|J;Rell|Rell|S;Renata Glasc|Renata|S;Renekton|Renekton|T;Rengar|Rengar|J;Riven|Riven|T;Rumble|Rumble|T;Ryze|Ryze|M;Samira|Samira|A;Sejuani|Sejuani|J;Senna|Senna|SA;Seraphine|Seraphine|SA;Sett|Sett|TS;Shaco|Shaco|J;Shen|Shen|T;Shyvana|Shyvana|J;Singed|Singed|T;Sion|Sion|T;Sivir|Sivir|A;Skarner|Skarner|J;Smolder|Smolder|A;Sona|Sona|S;Soraka|Soraka|S;Swain|Swain|SM;Sylas|Sylas|MJ;Syndra|Syndra|M;Tahm Kench|TahmKench|ST;Taliyah|Taliyah|JM;Talon|Talon|MJ;Taric|Taric|S;Teemo|Teemo|T;Thresh|Thresh|S;Tristana|Tristana|AM;Trundle|Trundle|JT;Tryndamere|Tryndamere|T;Twisted Fate|TwistedFate|M;Twitch|Twitch|A;Udyr|Udyr|J;Urgot|Urgot|T;Varus|Varus|A;Vayne|Vayne|AT;Veigar|Veigar|M;Vel'Koz|Velkoz|SM;Vex|Vex|M;Vi|Vi|J;Viego|Viego|J;Viktor|Viktor|M;Vladimir|Vladimir|MT;Volibear|Volibear|JT;Warwick|Warwick|J;Wukong|MonkeyKing|JT;Xayah|Xayah|A;Xerath|Xerath|MS;Xin Zhao|XinZhao|J;Yasuo|Yasuo|M;Yone|Yone|MT;Yorick|Yorick|T;Yunara|Yunara|A;Yuumi|Yuumi|S;Zaahen|Zaahen|TJ;Zac|Zac|J;Zed|Zed|M;Zeri|Zeri|A;Ziggs|Ziggs|AM;Zilean|Zilean|S;Zoe|Zoe|M;Zyra|Zyra|S`;
const RL={T:"top",J:"jg",M:"mid",A:"adc",S:"sup"};
const CH=BASE.split(";").map(s=>{const[n,id,r]=s.split("|");return{n,id,r:[...r].map(c=>RL[c])}});
const TAG_ROLE={Fighter:"top",Tank:"top",Mage:"mid",Assassin:"mid",Marksman:"adc",Support:"sup"};
for(const [id,c] of Object.entries(LOL_DATA.champions)){
  const existing=CH.find(x=>x.id===id);
  if(existing){if(c.name==="Nunu & Willump")existing.n=c.name;continue}
  CH.push({n:c.name,id,r:[...new Set(c.tags.map(t=>TAG_ROLE[t]).filter(Boolean))]});
}

/* ===== Dica do Worlds 2026 (picks, vitórias, bans, lane principal) ===== */
const WS={"g":90,"c":{"Nocturne":[15,9,67,"Jungle"],"Vi":[16,10,52,"Jungle"],"Renata Glasc":[16,8,50,"Suporte"],"Cassiopeia":[17,11,40,"Mid"],"Olaf":[17,11,38,"Top"],"Syndra":[22,12,31,"Mid"],"Qiyana":[21,11,32,"Jungle"],"Lee Sin":[28,14,20,"Jungle"],"Ezreal":[27,11,21,"ADC"],"Jarvan IV":[24,14,24,"Jungle"],"Akali":[13,3,34,"Mid"],"Rumble":[25,6,21,"Top"],"Orianna":[22,15,24,"Mid"],"Locke":[12,6,33,"Mid"],"Jayce":[15,8,28,"Top"],"K'Sante":[21,8,19,"Top"],"Nautilus":[24,16,15,"Suporte"],"Lulu":[22,12,14,"Suporte"],"Seraphine":[16,11,20,"Suporte"],"Jhin":[19,11,13,"ADC"],"Galio":[14,10,18,"Mid"],"Wukong":[14,6,18,"Jungle"],"Ambessa":[22,10,9,"Top"],"Pantheon":[15,7,15,"Jungle"],"Viktor":[18,10,9,"Mid"],"Alistar":[23,7,3,"Suporte"],"Lucian":[17,8,7,"ADC"],"Camille":[12,7,11,"Top"],"Caitlyn":[8,2,15,"ADC"],"Renekton":[8,5,14,"Top"],"Yunara":[18,10,3,"ADC"],"Karma":[14,5,6,"Suporte"],"Gnar":[12,8,8,"Top"],"Kalista":[16,8,2,"ADC"],"Trundle":[11,7,7,"Jungle"],"Ashe":[14,10,3,"ADC"],"Kai'Sa":[11,6,6,"ADC"],"Sylas":[6,1,11,"Mid"],"Jax":[7,3,9,"Top"],"Rakan":[12,5,3,"Suporte"],"Skarner":[4,1,11,"Jungle"],"Milio":[14,6,0,"Suporte"],"Taliyah":[9,6,4,"Mid"],"Ryze":[8,2,5,"Mid"],"Xin Zhao":[7,5,6,"Jungle"],"Maokai":[4,0,9,"Jungle"],"Xayah":[10,5,2,"ADC"],"Anivia":[8,2,4,"Mid"],"Ahri":[7,5,5,"Mid"],"Naafiri":[7,3,5,"Jungle"],"Yone":[4,0,7,"Mid"],"Vayne":[1,0,10,"Top"],"Ornn":[9,6,1,"Top"],"Corki":[7,4,3,"ADC"],"Leona":[8,5,1,"Suporte"],"Annie":[6,4,3,"Mid"],"LeBlanc":[4,1,5,"Mid"],"Tristana":[8,3,0,"ADC"],"Shen":[7,2,1,"Top"],"Aurora":[5,3,3,"Mid"],"Twisted Fate":[3,2,5,"Mid"],"Zeri":[4,2,3,"ADC"],"Sivir":[3,2,4,"ADC"],"Miss Fortune":[6,3,0,"ADC"],"Sejuani":[6,1,0,"Jungle"],"Ziggs":[5,1,1,"ADC"],"Draven":[1,1,5,"ADC"],"Poppy":[1,1,5,"Suporte"],"Rell":[5,2,0,"Suporte"],"Zaahen":[5,3,0,"Top"],"Kled":[4,2,1,"Top"],"Bard":[3,2,2,"Suporte"],"Pyke":[2,0,3,"Suporte"],"Aatrox":[4,1,0,"Top"],"Yuumi":[4,2,0,"Suporte"],"Kog'Maw":[3,2,1,"Mid"],"Neeko":[3,1,1,"Suporte"],"Aphelios":[2,1,2,"ADC"],"Gwen":[2,2,2,"Top"],"Kennen":[3,2,0,"Top"],"Nami":[3,2,0,"Suporte"],"Lissandra":[2,1,1,"Mid"],"Varus":[2,2,1,"ADC"],"Cho'Gath":[2,1,0,"Jungle"],"Mel":[2,0,0,"Mid"],"Yorick":[2,0,0,"Top"],"Volibear":[1,1,1,"Top"],"Kha'Zix":[0,0,2,""],"Diana":[1,0,0,"Mid"],"Elise":[1,0,0,"Suporte"],"Gangplank":[1,0,0,"Top"],"Hwei":[1,0,0,"Mid"],"Irelia":[1,1,0,"Top"],"Jinx":[1,0,0,"ADC"],"Lillia":[1,0,0,"Jungle"],"Lux":[1,1,0,"Suporte"],"Malphite":[1,0,0,"Jungle"],"Nasus":[1,0,0,"Jungle"],"Sion":[1,1,0,"Top"],"Swain":[1,1,0,"Mid"],"Tahm Kench":[1,0,0,"Suporte"],"Thresh":[1,0,0,"Suporte"],"Twitch":[1,0,0,"ADC"],"Vel'Koz":[1,1,0,"Suporte"],"Kindred":[0,0,1,""],"Zyra":[0,0,1,""]}};

const LANES=[
 {k:"top",n:"Top",c:"--top"},{k:"jg",n:"Jungle",c:"--jg"},{k:"mid",n:"Mid",c:"--mid"},
 {k:"adc",n:"ADC",c:"--adc"},{k:"sup",n:"Suporte",c:"--sup"},{k:"ban",n:"Bans",c:"--ban"}];
const LN=Object.fromEntries(LANES.map(l=>[l.k,l]));
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ini=n=>n.replace(/[^A-Za-z ]/g,"").split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()||n.slice(0,2);
const byName=n=>CH.find(c=>c.n===n);
const champArt=n=>lolChampion(byName(n)?.id||n);
const img=n=>`<span class="av">${esc(ini(n))}${lolImage(champArt(n)?.portrait,"champ-portrait")}</span>`;

/* ===== Estado / armazenamento ===== */
const KEY="lol-comps-time-v1";
const uid=()=>Math.random().toString(36).slice(2,10);
const blank=(name)=>({id:uid(),name:name||"Nova comp",lanes:{top:[],jg:[],mid:[],adc:[],sup:[],ban:[]},laneNotes:{},notes:"",updated:Date.now()});
let S;
function load(){
  try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
  if(!S||!Array.isArray(S.comps)){
    // Comp inicial tirada do comps.xlsx da pasta
    const c=blank("Comp 1 (do comps.xlsx)");
    c.lanes.mid=["Akali"];c.lanes.jg=["Vi","Jarvan IV","Wukong"];
    c.lanes.adc=["Kai'Sa","Ezreal","Xayah"];c.lanes.sup=["Nautilus","Leona","Karma","Rakan"];
    c.laneNotes={top:"Counter pick",mid:"FP (first pick)",sup:"Leona/Karma"};
    c.notes="Importada da planilha comps.xlsx.\nNa planilha tinha também uma coluna extra com Locke e Rakan (opções extras?).";
    S={comps:[c],cur:c.id};
  }
  if(!S.comps.length){const c=blank();S.comps.push(c);S.cur=c.id}
  if(!S.comps.some(c=>c.id===S.cur))S.cur=S.comps[0].id;
}
function save(flash=true){
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) {
    $("#saved").textContent = "Falha ao salvar";
    toast("Não consegui salvar no navegador. Use Exportar.");
    return;
  }
  if (flash || $("#saved").textContent === "Falha ao salvar") $("#saved").textContent = "Salvo neste navegador";
}
const cur=()=>S.comps.find(c=>c.id===S.cur);
$("#clear-local").onclick=()=>{
  let base;
  try {
    base=JSON.parse(localStorage.getItem("lol-base"));
    if(base && (!Array.isArray(base.data?.comps)||!Array.isArray(base.data?.plays)))throw new Error("Base inválida");
  } catch {
    toast("Não consegui ler a versão salva do time. Nada foi apagado.");
    return;
  }
  const destination=base?`a última versão oficial sincronizada (v${base.version})`:"os dados iniciais do site";
  if(!confirm(`Limpar suas alterações neste navegador?\n\nTodas as composições e jogadas locais serão substituídas por ${destination}.\nSeu login e tema serão mantidos. Envios já feitos para aprovação não serão cancelados.\n\nSe quiser guardar uma cópia, clique em Cancelar e use Exportar antes de continuar.`))return;
  try {
    if(base){
      localStorage.setItem(KEY,JSON.stringify({comps:base.data.comps,plays:base.data.plays,cur:base.data.comps[0]?.id,curPlay:base.data.plays[0]?.id}));
    }else localStorage.removeItem(KEY);
  }catch{
    toast("Não consegui limpar as alterações no navegador. Tente novamente.");
    return;
  }
  // Recarregar também descarta animações e históricos de desfazer do mapa.
  window.location.reload();
};
let active="top";

function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2200)}

/* ===== Lista de comps ===== */
function renderList(){
  const q=$("#csearch").value.toLowerCase();
  const matches=S.comps.filter(c=>!q||c.name.toLowerCase().includes(q)||Object.values(c.lanes).flat().some(n=>n.toLowerCase().includes(q)));
  const selected=cur();
  $("#draft-comp").innerHTML=[selected,...matches.filter(c=>c!==selected)]
    .map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  $("#clist").innerHTML=matches
   .map(c=>{const firsts=["top","jg","mid","adc","sup"].map(l=>c.lanes[l][0]).filter(Boolean);
     return `<div class="composition-item"><button class="ci${c.id===S.cur?" on":""}" aria-pressed="${c.id===S.cur}" data-id="${c.id}"><b>${esc(c.name)}</b>
      <span class="mini">${firsts.map(img).join("")||'<small style="color:var(--mut)">vazia</small>'}</span></button><details class="composition-menu"><summary aria-label="Ações de ${esc(c.name)}">⋯</summary><div><button data-slot="button" data-variant="ghost" data-size="sm" data-comp-action="duplicate" data-id="${c.id}">${iconMarkup("duplicate")} Duplicar</button><button data-slot="button" data-variant="destructive" data-size="sm" data-comp-action="delete" data-id="${c.id}">${iconMarkup("trash")} Excluir</button></div></details></div>`}).join("")||'<div style="color:var(--mut);padding:10px;font-size:12px">Nenhuma comp.</div>';
}
function selectComp(id){S.cur=id;save(false);renderAll();publishTeamRoute("comps")}
$("#clist").onclick=e=>{const action=e.target.closest("[data-comp-action]");if(action){if(action.dataset.compAction==="duplicate")duplicateComp(action.dataset.id);else deleteComp(action.dataset.id);return}const it=e.target.closest(".ci");if(it)selectComp(it.dataset.id)};
function closeCompositionMenus(target?: EventTarget | null){
  const openMenus=document.querySelectorAll<HTMLDetailsElement>(
    "#v-comps details[open]:is(.composition-menu,.option-menu,.lane-note)"
  );
  openMenus.forEach(menu=>{
    if(!(target instanceof Node && menu.contains(target)))menu.open=false;
  });
}
document.addEventListener("click", e=>closeCompositionMenus(e.target));
window.addEventListener("blur", ()=>closeCompositionMenus());
$("#draft-comp").onchange=e=>selectComp(e.target.value);
$("#csearch").oninput=renderList;
$("#new").onclick=()=>{const c=blank("Comp "+(S.comps.length+1));S.comps.unshift(c);S.cur=c.id;active="top";save();renderAll();publishTeamRoute("comps");setTimeout(()=>{$("#cname").focus();$("#cname").select()},0)};
function duplicateComp(id){const c=JSON.parse(JSON.stringify(S.comps.find(c=>c.id===id)));c.id=uid();c.name+=" (cópia)";c.updated=Date.now();S.comps.unshift(c);S.cur=c.id;save();renderAll();publishTeamRoute("comps")};
function deleteComp(id){const c=S.comps.find(c=>c.id===id);if(!confirm(`Excluir a comp "${c.name}"?`))return;S.comps=S.comps.filter(x=>x.id!==c.id);if(!S.comps.length)S.comps.push(blank());if(!S.comps.some(x=>x.id===S.cur))S.cur=S.comps[0].id;save();renderAll();publishTeamRoute("comps")};

/* ===== Editor ===== */
function optionHTML(n,l,i){
  return `<div class="chip ${i===0?"primary":"alternative"}" draggable="true" data-n="${esc(n)}" data-from="${l}">
    <button class="champ-priority" data-priority="${esc(n)}" data-lane="${l}" aria-label="Priorizar ${esc(n)} em ${LN[l].n}" title="${i+1}ª opção · tornar principal">${img(n)}${i===0?`<span><small>Principal</small><b>${esc(n)}</b></span>`:""}</button>
    <details class="option-menu" name="champion-editor-menu"><summary aria-label="Opções de ${esc(n)}">⋯</summary><div><span>${i+1}ª opção · ${esc(n)}</span><button data-slot="button" data-variant="ghost" data-size="sm" data-move="-1" data-n="${esc(n)}" data-lane="${l}" ${i===0?"disabled":""}>Mover antes</button><button data-slot="button" data-variant="ghost" data-size="sm" data-move="1" data-n="${esc(n)}" data-lane="${l}" ${i===cur().lanes[l].length-1?"disabled":""}>Mover depois</button><button data-slot="button" data-variant="destructive" data-size="sm" data-rm="${esc(n)}">Remover ${esc(n)}</button></div></details>
  </div>`;
}
function pickArt(name){
  return name ? lolImage(champArt(name)?.splash, "pick-splash") : "";
}

function laneNoteHTML(c, lane){
  const note=c.laneNotes[lane.k]||"";
  return `<details class="lane-note" name="champion-editor-menu">
    <summary aria-label="Observação de ${lane.n}" title="${esc(note||"Adicionar observação")}">
      ${iconMarkup("edit")}<span class="pick-note-preview">${esc(note||"Nota")}</span>
    </summary>
    <label>Observação de ${lane.n}<input data-ln="${lane.k}" value="${esc(note)}" placeholder="Plano para esta posição"></label>
  </details>`;
}

function renderDraftLaneNotes(c){
  const list=$("#notes-lanes");
  if(!list)return;
  list.innerHTML=LANES.filter(lane=>c.laneNotes[lane.k]?.trim())
    .map(lane=>`<li><b>${lane.n}</b> ${esc(c.laneNotes[lane.k])}</li>`).join("");
  list.hidden=!list.childElementCount;
}

function renderEditor(){
  const previousComposition = $("#editor").dataset.motionComposition;
  const c=cur(),dv=S.view==="draft";
  const notesOpen=$("#composition-notes")?.open;
  $("#v-comps").classList.toggle("draft-view",dv);
  $("#draft-comp").hidden=true;
  const notes=`<details id="composition-notes" ${notesOpen?"open":""}><summary>Anotações da composição</summary><label class="control-label" for="notes">Plano geral</label><textarea id="notes" placeholder="Plano de jogo, condição de vitória…">${esc(c.notes)}</textarea>${dv?`<label class="control-label" for="dnote">Plano do draft · ${DRAFT_SIDE[draftOf(c).side]}</label><textarea id="dnote">${esc(draftOf(c).note[draftOf(c).side])}</textarea><ul id="notes-lanes" class="draft-lane-notes" aria-label="Observações por posição" hidden></ul>`:""}</details>`;
  const editor = $("#editor");
  if (!editor.firstElementChild) {
    editor.innerHTML = `<div class="editor-controls"><input id="cname" aria-label="Nome da composição" placeholder="Nome da composição"><div class="vtog wl-motion-pill" role="group" aria-label="Modo da composição"><button data-slot="button" data-variant="ghost" data-view="lanes">Opções por posição</button><button data-slot="button" data-variant="ghost" data-view="draft">Ordem do draft</button></div></div>`;
    initializeMotionNav("#editor .vtog");
  }
  $("#cname").value = c.name;
  for (const button of editor.querySelectorAll("[data-view]")) {
    const selected = button.dataset.view === S.view;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("on", selected);
  }
  const content = document.createRange();
  content.setStartAfter(editor.firstElementChild);
  content.setEnd(editor, editor.childNodes.length);
  content.deleteContents();
  editor.insertAdjacentHTML("beforeend", `
  ${notes}<button data-slot="button" data-variant="default" type="button" class="jump-picker" data-picker>${iconMarkup("plus")} Adicionar campeão</button>
  ${dv?draftHTML(c):LANES.map(l=>`<div class="lane${active===l.k?" act":""}${l.k==="ban"?" ban-strip":""}" data-l="${l.k}" style="--lc:var(${l.c})">
  ${l.k==="ban"?"":pickArt(c.lanes[l.k][0])}
  <button class="ln lane-label" data-draft-target="${l.k}" aria-pressed="${active===l.k}">${laneIconMarkup(l.k)}${l.n}</button>
  <div class="chips">${c.lanes[l.k].map((n,i)=>optionHTML(n,l.k,i)).join("")||'<span class="empty">Adicionar campeão</span>'}</div>
${laneNoteHTML(c,l)}</div>`).join("")}
  <p class="help">Clique no retrato para priorizar. Arraste para reordenar ou use o menu ⋯ de cada campeão.</p>`);
  renderDraftLaneNotes(c);
  renderTarget();
  editor.dataset.motionComposition = c.id;
  if (previousComposition !== c.id) revealContent(editor);
}
const touch=()=>{cur().updated=Date.now()};
$("#v-comps").addEventListener("input",e=>{
  const c=cur();
  if(e.target.id==="cname"){c.name=e.target.value;touch();save();renderList()}
  else if(e.target.id==="notes"){c.notes=e.target.value;touch();save()}
  else if(e.target.dataset.ln){
    const value=e.target.value;
    c.laneNotes[e.target.dataset.ln]=value;
    const note=e.target.closest(".lane-note");
    note.querySelector(".pick-note-preview").textContent=value||"Nota";
    note.querySelector("summary").title=value||"Adicionar observação";
    renderDraftLaneNotes(c);
    touch();save();
  }
  else if(e.target.id==="dnote"){const d=draftOf(c);d.note[d.side]=e.target.value;touch();save()}
  else if(e.target.dataset.slot!=null){const d=draftOf(c),o=d.order[d.side],i=+e.target.dataset.slot,v=e.target.value,j=o.indexOf(v);[o[i],o[j]]=[v,o[i]];active=v;touch();save();renderEditor();$(`[data-slot="${i}"]`).focus({preventScroll:true})}
});
$("#editor").addEventListener("click",e=>{
  if(e.target.closest("[data-picker]")){ openPicker(); return }
  const priority=e.target.closest("[data-priority]"),move=e.target.closest("[data-move]");
  if(priority||move){const b=priority||move,l=b.dataset.lane,a=cur().lanes[l],n=b.dataset.priority||b.dataset.n,i=a.indexOf(n);if(priority){a.splice(i,1);a.unshift(n)}else{const j=i+Number(b.dataset.move);if(j>=0&&j<a.length)[a[i],a[j]]=[a[j],a[i]]}active=l;touch();save();renderEditor();renderList();renderGrid();(S.view==="draft"?$(`[data-draft-target="${l}"]`):[...document.querySelectorAll("[data-priority]")].find(b=>b.dataset.priority===n&&b.dataset.lane===l))?.focus({preventScroll:true});return}
  const rm=e.target.closest("[data-rm]");
  if(rm){const l=rm.closest("[data-l]").dataset.l;const c=cur();c.lanes[l]=c.lanes[l].filter(n=>n!==rm.dataset.rm);touch();save();renderEditor();renderList();renderGrid();$(`[data-draft-target="${l}"]`)?.focus({preventScroll:true});return}

  const vb=e.target.closest("[data-view]");if(vb){S.view=vb.dataset.view;save(false);renderEditor();$(`[data-view="${S.view}"]`).focus({preventScroll:true});publishTeamRoute("comps");return}
  const sb=e.target.closest("[data-side]");if(sb){draftOf(cur()).side=sb.dataset.side;touch();save();renderEditor();$(`[data-side="${sb.dataset.side}"]`).focus({preventScroll:true});return}
  const target=e.target.closest("[data-draft-target]");
  if(target){
    active=target.dataset.draftTarget;
    renderEditor();
    $(`[data-draft-target="${active}"]`).focus({preventScroll:true});
    return;
  }
  if(e.target.closest("details")||["INPUT","TEXTAREA","SELECT","OPTION"].includes(e.target.tagName))return;
  const ln=e.target.closest("[data-l]");if(ln&&ln.dataset.l!==active){active=ln.dataset.l;renderEditor()}
});
// arrastar e soltar
let drag=null;
document.addEventListener("dragstart",e=>{const ch=e.target.closest(".chip,.ch,.dm");if(!ch)return;drag={n:ch.dataset.n,from:ch.dataset.from||null};e.dataTransfer.setData("text/plain",ch.dataset.n);e.dataTransfer.effectAllowed="move"});
$("#editor").addEventListener("dragover",e=>{const ln=e.target.closest("[data-l]");if(!ln||!drag)return;e.preventDefault();document.querySelectorAll(".drop").forEach(x=>x!==ln&&x.classList.remove("drop"));ln.classList.add("drop")});
$("#editor").addEventListener("dragleave",e=>{const ln=e.target.closest("[data-l]");if(ln&&!ln.contains(e.relatedTarget))ln.classList.remove("drop")});
$("#editor").addEventListener("drop",e=>{
  const ln=e.target.closest("[data-l]");if(!ln||!drag)return;e.preventDefault();
  const to=ln.dataset.l,c=cur(),n=drag.n;
  if(drag.from)c.lanes[drag.from]=c.lanes[drag.from].filter(x=>x!==n);
  const arr=c.lanes[to].filter(x=>x!==n);
  const over=e.target.closest(".chip,.dm");let idx=ln.dataset.bi!=null?Math.min(+ln.dataset.bi,arr.length):arr.length;
  if(over&&over.dataset.n!==n&&ln.dataset.bi==null){idx=arr.indexOf(over.dataset.n);const r=over.getBoundingClientRect();if(e.clientX>r.left+r.width/2)idx++}
  arr.splice(idx,0,n);c.lanes[to]=arr;drag=null;active=to;touch();save();renderEditor();renderList();renderGrid();
});
document.addEventListener("dragend",()=>{drag=null;document.querySelectorAll(".drop").forEach(x=>x.classList.remove("drop"))});

/* ===== Visão de draft (ordem de picks e bans) ===== */
const DORDER=[
 ["Fase de bans 1",["B:ban","R:ban","B:ban","R:ban","B:ban","R:ban"]],
 ["Fase de picks 1",["B:pick","R:pick","R:pick","B:pick","B:pick","R:pick"]],
 ["Fase de bans 2",["R:ban","B:ban","R:ban","B:ban"]],
 ["Fase de picks 2",["R:pick","B:pick","B:pick","R:pick"]]];
const PLANES=["top","jg","mid","adc","sup"];
function draftOf(c){
  if(!c.draft)c.draft={};const d=c.draft;
  if(!d.side)d.side="blue";if(!d.note)d.note={blue:"",red:""};if(!d.order)d.order={};
  for(const s of["blue","red"]){const o=(d.order[s]||[]).filter(l=>PLANES.includes(l));
    d.order[s]=[...new Set([...o,...["mid","jg","sup","adc","top"]])].slice(0,5)}
  return d;
}
const PICKTIP={B1:"First pick",B2:"dupla",B3:"dupla",R1:"dupla",R2:"dupla",R3:"fecha fase 1",R4:"abre fase 2",B4:"dupla",B5:"dupla",R5:"Last pick"};
const DRAFT_SIDE = {blue:"Lado azul", red:"Lado vermelho"} as const;
function draftHTML(c){
  const d=draftOf(c),us=d.side==="blue"?"B":"R";
  // picks e bans têm numeração própria (1º a 10º pick, 1º a 10º ban)
  const seq=[],cnt={B:{pick:0,ban:0},R:{pick:0,ban:0}},kc={pick:0,ban:0};
  DORDER.forEach(([ph,slots],pi)=>slots.forEach(s=>{const[t,k]=s.split(":");const i=cnt[t][k]++;seq.push({t,k,i,code:t+(k==="ban"?"B":"")+(i+1),ph:pi,n:++kc[k]})}));
  const find=(t,k,i)=>seq.find(s=>s.t===t&&s.k===k&&s.i===i);
  const mini=(n,l,j)=>optionHTML(n,l,j);
  const PHN=["Bans 1","Picks 1","Bans 2","Picks 2"];
  // faixa da sequência
  let h=`<div class="draft-toolbar"><div class="dside" role="group" aria-label="Lado da equipe"><span>Nossa equipe</span>
    ${Object.entries(DRAFT_SIDE).map(([key,label])=>`<button data-slot="button" data-variant="outline" data-size="sm" data-side="${key}" aria-pressed="${d.side===key}" class="${d.side===key?`on ${key[0]}`:""}">${label}</button>`).join("")}</div></div>
  <div class="dseq-row"><div class="dseq" role="group" aria-label="Sequência de picks e bans">${PHN.map((p,pi)=>`<div class="dsg"><div class="dsl">${p}</div><div class="dsc">${seq.filter(s=>s.ph===pi).map(s=>`<span class="sq ${s.t==="B"?"b":"r"} ${s.k}${s.t===us?" us":""}" title="${s.n}º ${s.k==="ban"?"ban":"pick"}: ${s.t==="B"?"Azul":"Vermelho"} ${s.k==="ban"?"bane":"escolhe"}">${s.k==="ban"?"":s.n}</span>`).join("")}</div></div>`).join("")}</div></div>`;
  const team=t=>{
    const mine=t===us,side=t==="B"?"b":"r";
    const banSq=i=>{const s=find(t,"ban",i),n=mine?c.lanes.ban[i]:null;
      return `<div class="bsq${n?" has":""}${mine?" mine":""}${mine&&active==="ban"?" act":""}" ${mine?`data-l="ban" data-bi="${i}"`:""} title="${s.n}º ban">
        ${n?`<span class="dm" draggable="true" data-n="${esc(n)}" data-from="ban">${img(n)}<button class="x" data-rm="${esc(n)}" aria-label="Remover ${esc(n)}">${iconMarkup("close")}</button></span>`:`<span class="bn">${s.n}</span>`}</div>`};
    const pick=i=>{const s=find(t,"pick",i),tip=PICKTIP[s.code]||"";
      const meta=`<span class="pkh"><b>${s.code}</b><span title="${s.n}º pick">${s.n}º pick</span>${tip?`<i>${tip}</i>`:""}</span>`;
      if(!mine)return `<div class="pk ${side} them">${meta}<div class="pkn">${iconMarkup("champion")} A definir</div></div>`;
      const l=d.order[d.side][i],L=LN[l],ch=c.lanes[l],m=ch[0];
      const editing=active===l;
      return `<div class="pk ${side} mine${editing?" act":""}" data-l="${l}" style="--lc:var(${L.c})">
        ${pickArt(m)}
        <button type="button" class="pk-target" data-draft-target="${l}" aria-pressed="${editing}" aria-label="${s.code} · ${L.n}${m?" · "+esc(m):" · Escolher campeão"}">
          ${meta}${m?img(m):iconMarkup("champion-add")}
          <span class="pkn${m?"":" pk-empty"}">${m?esc(m):"Escolher campeão"}</span>
        </button>
        <div class="pkf"><span class="lane-label">${laneIconMarkup(l)}<select data-slot="${i}" aria-label="Posição do pick ${t}${i+1}" title="Lane deste pick">${PLANES.map(x=>`<option value="${x}"${x===l?" selected":""}>${LN[x].n}</option>`).join("")}</select></span>
        ${laneNoteHTML(c,L)}
        ${m?mini(m,l,0):""}
        ${ch.length>1?`<div class="alts draft-alternatives" role="group" aria-label="Alternativas de ${L.n}"><span class="draft-alternatives-label" aria-hidden="true">Alternativas</span>${ch.slice(1).map((n,j)=>mini(n,l,j+1)).join("")}</div>`:""}
        </div></div>`};
    return `<section class="tm ${side}${mine?" mine":""}" aria-labelledby="draft-side-${side}">
      <div class="draft-bans">
        ${mine?`<button type="button" class="draft-ban-target" data-draft-target="ban" aria-pressed="${active==="ban"}">Bans ${active==="ban"?'<span class="draft-editing">Editando</span>':""}</button>`:'<div class="draft-phase">Bans</div>'}
        <div class="bans" role="group" aria-label="Bans da primeira e da segunda fase">${[0,1,2].map(banSq).join("")}<span class="bgap"></span>${[3,4].map(banSq).join("")}</div>
        <h3 class="tmh" id="draft-side-${side}">${DRAFT_SIDE[t==="B"?"blue":"red"]}<span>${mine?"Nossa equipe":"Adversário"}</span></h3>
      </div>
      <div class="draft-phase">Picks · Fase 1</div>
      ${[0,1,2].map(pick).join("")}
      <div class="draft-phase">Picks · Fase 2</div>
      ${[3,4].map(pick).join("")}</section>`;
  };
  h+=`<div class="dz">${team("B")}${team("R")}</div>`;
  const extra=c.lanes.ban.slice(5);
  if(extra.length)h+=`<div class="lbl">Bans alternativos</div><div class="alts" data-l="ban">${extra.map((n,j)=>mini(n,"ban",j+5)).join("")}</div>`;
  h+=`<div class="help draft-help">Retrato em destaque: opção principal. Clique em uma opção para priorizá-la ou arraste para reordenar.</div>`;
  return h;
}

/* ===== Grade de campeões ===== */
let role="all";
const ROLEBTN=[{k:"all",n:"Todos"},...LANES.filter(l=>l.k!=="ban")];
$("#roles").innerHTML=ROLEBTN.map(({k,n})=>`<button data-slot="button" data-variant="ghost" data-size="sm" data-r="${k}" aria-pressed="${k==="all"}" class="${k==="all"?"on":""}"><span class="lane-label">${laneIconMarkup(k)}${n}</span></button>`).join("");
$("#roles").onclick=e=>{const b=e.target.closest("button");if(!b)return;role=b.dataset.r;document.querySelectorAll("#roles button").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",String(x===b))});resetGrid()};
const resetGrid=()=>{renderGrid();$("#grid").scrollTop=0};$("#search").oninput=resetGrid;$("#sort").onchange=resetGrid;$("#worlds-only").onchange=resetGrid;
function renderTarget(){
  const c=cur();
  $("#grid").querySelectorAll(".ch").forEach(button => button.setAttribute("aria-pressed", c.lanes[active].includes(button.dataset.n)));
  let context=LN[active].n;
  if(S.view==="draft"&&active!=="ban"){const d=draftOf(c);context=d.side[0].toUpperCase()+(d.order[d.side].indexOf(active)+1)+" · "+context}
  $("#target").innerHTML=`<strong class="draft-target-context">Adicionando em ${context}</strong><label for="pick-target">Destino da edição</label><select id="pick-target">${LANES.map(pos=>`<option value="${pos.k}" ${pos.k===active?"selected":""}>${pos.n}</option>`).join("")}</select><small>Clique para adicionar ou remover do destino.</small>`;
}
$("#target").addEventListener("change",e=>{if(e.target.id!=="pick-target")return;active=e.target.value;renderEditor();$("#pick-target").focus({preventScroll:true})});
function renderGrid(){
  const q=$("#search").value.toLowerCase().replace(/[^a-z]/g,""),c=cur(),srt=$("#sort").value;
  const where={};for(const l of LANES)for(const n of c.lanes[l.k])(where[n]=where[n]||[]).push(l);
  let L=CH.filter(ch=>(!$("#worlds-only").checked||WS.c[ch.n])&&(!q||ch.n.toLowerCase().replace(/[^a-z]/g,"").includes(q))&&(role==="all"||ch.r.includes(role)));
  if(srt==="ws")L.sort((a,b)=>((WS.c[b.n]||[0])[0]-(WS.c[a.n]||[0])[0])||a.n.localeCompare(b.n));
  else if(srt==="wsb")L.sort((a,b)=>((WS.c[b.n]||[0,0,0])[2]-(WS.c[a.n]||[0,0,0])[2])||a.n.localeCompare(b.n));
  else L.sort((a,b)=>a.n.localeCompare(b.n));
  $("#grid").innerHTML=L.map(ch=>{const w=WS.c[ch.n],wh=where[ch.n];
    const tip=ch.n+(w?`\nWorlds 2026: ${w[0]} picks (${w[0]?Math.round(w[1]/w[0]*100):0}% vitórias), ${w[2]} bans em ${WS.g} jogos · lane: ${w[3]}`:"\nNão foi jogado no Worlds 2026");
    return `<button class="ch${wh?" in":""}" aria-pressed="${c.lanes[active].includes(ch.n)}" draggable="true" data-n="${esc(ch.n)}" title="${esc(tip)}">${img(ch.n)}
      ${wh?`<span class="tag" style="--lc:var(${wh[0].c})">${wh.map(l=>l.n.slice(0,3).toUpperCase()).join("/")}</span>`:""}
      ${srt!=="az"&&w?`<span class="ws">${srt==="ws"?w[0]:w[2]}</span>`:""}
      <span class="nm">${esc(ch.n)}</span></button>`}).join("")||'<div style="color:var(--mut)">Nenhum campeão encontrado.</div>';
  $("#gfoot").textContent=`${L.length} de ${CH.length} campeões · imagens: Riot Data Dragon · passe o mouse para ver os números do Worlds 2026`;
}
$("#grid").onclick=e=>{
  const ch=e.target.closest(".ch");if(!ch)return;const n=ch.dataset.n,c=cur(),a=c.lanes[active];
  if(a.includes(n))c.lanes[active]=a.filter(x=>x!==n);else a.push(n);
  touch();save();renderEditor();renderList();renderGrid();
  [...$("#grid").querySelectorAll(".ch")].find(button=>button.dataset.n===n)?.focus({preventScroll:true});
};


let pickerTrigger=null;
const pickerDialog=$("#picker-dialog"),picker=$("#champ-picker");
function openPicker(){pickerTrigger=document.activeElement;pickerDialog.append(picker);pickerDialog.showModal();$("#search").focus()}
pickerDialog.addEventListener("close",()=>{
  (document.querySelector("[data-picker]")||pickerTrigger)?.focus();
  // Keep the content in place through the native dialog exit transition.
  void Promise.allSettled(pickerDialog.getAnimations().map(animation=>animation.finished))
    .then(()=>{if(!pickerDialog.open)$("#comps").append(picker)});
});
$("#close-picker").onclick=()=>pickerDialog.close();
window.matchMedia("(min-width: 1100px)").addEventListener("change",e=>{if(e.matches&&pickerDialog.open)pickerDialog.close()});

/* ===== Exportar / Importar ===== */
$("#exp").onclick=()=>{
  const blob=new Blob([JSON.stringify({app:"lol-comps-time",version:1,exported:new Date().toISOString(),comps:S.comps,plays:S.plays},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`comps-time-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
$("#impb").onclick=()=>$("#imp").click();
$("#imp").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const d=JSON.parse(await f.text());const comps=d.comps||d;if(!Array.isArray(comps))throw 0;
    const replace=confirm(`Arquivo com ${comps.length} comp(s).\n\nOK = SUBSTITUIR as comps atuais\nCancelar = JUNTAR com as atuais`);
    const clean=comps.map(c=>{const b=blank(c.name);b.notes=c.notes||"";b.laneNotes=c.laneNotes||{};if(c.draft)b.draft=c.draft;b.updated=c.updated||Date.now();for(const l of LANES)b.lanes[l.k]=Array.isArray(c.lanes?.[l.k])?c.lanes[l.k].map(String):[];b.id=replace?(c.id||b.id):b.id;return b});
    S.comps=replace?clean:[...clean,...S.comps];S.cur=S.comps[0].id;
    if(Array.isArray(d.plays)){const ps=d.plays.filter(p=>p&&p.live&&Array.isArray(p.steps)).map(p=>({...p,id:replace?(p.id||uid()):uid()}));S.plays=replace?ps:[...plays(),...ps];plays()}
    renderPlays();save();renderAll();publishTeamRoute($("nav [aria-pressed=true]")?.dataset.v || "comps");toast(`${clean.length} comp(s) importada(s)`);
  }catch(err){alert("Arquivo inválido. Use um .json exportado por esta página.")}
  e.target.value="";
};

/* ===== Abas ===== */
const teamPages = {comps:"composicoes", map:"mapa", know:"conhecimento"};
const guides = {obj:"objetivos", wave:"wave"};
const teamNav = [...document.querySelectorAll("header nav [data-v]")];
function showTeamView(view) {
  teamNav.forEach(button=>{
    const active=button.dataset.v===view;
    button.classList.toggle("on",active);
    button.setAttribute("aria-pressed",active);
  });
  document.querySelectorAll(".view").forEach(section=>section.classList.toggle("on",section.id==="v-"+view));
  if(view==="map")renderPlays();
}

function publishTeamRoute(view, {includeItem = true, copy = false} = {}) {
  $("#route-note").hidden=true;
  let path="/time/"+teamPages[view];
  if(view==="know")path+="/"+(guides[S.kTab]||guides.obj);
  if(includeItem && view==="comps")path+="/"+encodeURIComponent(S.cur)+"?modo="+(S.view==="draft"?"draft":"lane");
  if(includeItem && view==="map")path+="/"+encodeURIComponent(S.curPlay);
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:navigate",{detail:{path, copy}}));
}

window.applyWebLolRoute = ([page, item], params) => {
  const view=Object.keys(teamPages).find(key=>teamPages[key]===page)||"comps";
  let missing="";
  const matches=entry=>encodeURIComponent(entry.id)===item;
  if(view==="comps"){
    if(item){
      const comp=S.comps.find(matches);
      if(comp){S.cur=comp.id;$("#csearch").value=""}
      else missing="A composição deste link não está disponível neste navegador. Conecte a pasta do time para carregar a versão oficial.";
    }
    const mode=params.get("modo");
    if(mode==="draft"||mode==="lane")S.view=mode==="draft"?"draft":"lanes";
    renderAll();
  } else if(view==="map" && item){
    const selected=plays().find(matches);
    if(selected && S.curPlay!==selected.id){M.playing=false;M.sel=-1;S.curPlay=selected.id}
    if(!selected)missing="A jogada deste link não está disponível neste navegador. Conecte a pasta do time para carregar a versão oficial.";
  } else if(view==="know"){
    if(item)S.kTab=item==="wave"?"wave":"obj";
    renderKnow();
  }
  const note=$("#route-note");
  note.textContent=missing;
  note.hidden=!missing;
  showTeamView(view);
};

teamNav.forEach(button=>button.onclick=()=>{
  const view=button.dataset.v;
  showTeamView(view);
  publishTeamRoute(view,{includeItem:false});
});
$("#copy-comp").onclick=()=>publishTeamRoute("comps",{copy:true});
$("#copy-play").onclick=()=>publishTeamRoute("map",{copy:true});

/* ===== Conhecimento: tempos dos objetivos ===== */
function gameIconMarkup(file: string) {
  return `<img class="icon game-icon" src="assets/lol/hud/${file}.png" width="24" height="24" alt="">`;
}

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
const WAVE_HTML=`
<div class="warn">${iconMarkup("book")} Guia de controle de wave para a temporada 2026. Os números da wave são das notas dos patches 26.1 e 26.9. As técnicas (freeze, slow push, etc.) são os fundamentos de sempre, ajustados aos tempos novos.</div>

<h2 class="ks">Números da wave em 2026</h2>
<table>
<tr><td style="width:230px;color:var(--gold)">1ª wave</td><td>Sai da base aos <b>0:30</b> (antes era 1:05).</td></tr>
<tr><td style="color:var(--gold)">Intervalo entre waves</td><td><b>30s</b> até 14:00 · <b>25s</b> de 14:00 a 30:00 · <b>20s</b> depois dos 30:00.</td></tr>
<tr><td style="color:var(--gold)">Composição</td><td>3 melee + 3 casters. A partir dos 14:00 a wave com canhão vem com 1 melee a menos; depois dos 30:00 vem 1 melee e 1 caster a menos.</td></tr>
<tr><td style="color:var(--gold)">Wave de canhão</td><td>1º canhão na <b>3ª wave</b>, depois a cada 3 waves no início, a cada 2 waves no meio do jogo e em toda wave no fim (aprox. a partir dos 25:00).</td></tr>
<tr><td style="color:var(--gold)">Ouro</td><td>Melee 20 · caster ~14 · canhão 50+ (sobe com o tempo). Uma wave inteira vale ~125 a 195 de ouro.</td></tr>
<tr><td style="color:var(--gold)">Força dos minions</td><td>Ganham vida e dano a cada 90s (a cada 3 waves). No 26.9 as waves ficaram mais resistentes no meio e no fim da fase de rotas, então leva mais tempo para limpar.</td></tr>
<tr><td style="color:var(--gold)">Velocidade</td><td>Os minions andam mais rápido: 350 → 450 conforme o jogo avança. As waves chegam mais cedo e rotações ficam mais apertadas.</td></tr>
<tr><td style="color:var(--gold)">Super minions</td><td>Saem em <b>toda wave</b> enquanto o inibidor estiver caído.</td></tr>
<tr><td style="color:var(--gold)">Torres</td><td>Placas agora são <b>permanentes</b> e existem também nas torres internas e de inibidor. Wave grande batendo na torre vira ouro de placa o jogo todo.</td></tr>
</table>

<h2 class="ks">Quem a wave favorece</h2>
<div class="kgrid">
 <div class="wl-panel obj"><h3>A wave empurra para quem…</h3>
  <p style="font-size:13px;color:var(--txt);line-height:1.6">• tem <b>mais minions vivos</b> (um caster a mais já faz diferença)<br>• tem o <b>canhão</b> na wave (canhão vivo = wave mais forte)<br>• matou a wave inimiga primeiro (a próxima wave dele chega e empurra)<br>• tem campeão com <b>limpeza em área</b> ou mais nível<br>• tem o <b>caçador por perto</b> (pode empurrar sem medo)</p></div>
 <div class="wl-panel obj"><h3>Onde a wave está</h3>
  <p style="font-size:13px;color:var(--txt);line-height:1.6">• <b>Perto da SUA torre:</b> você está seguro, o inimigo fica exposto ao gank e perde farm se não chegar perto.<br>• <b>No meio:</b> neutra, ninguém tem vantagem grande.<br>• <b>Perto da torre DELE:</b> você tem prioridade (pode sair da lane primeiro), mas está exposto a gank.</p></div>
 <div class="wl-panel obj"><h3>Prioridade (prio)</h3>
  <p style="font-size:13px;color:var(--txt);line-height:1.6">Ter <b>prio</b> é ter a wave empurrada para o lado inimigo. Quem tem prio chega primeiro no rio, no dragão, nas vastilarvas e no arauto. Antes de qualquer objetivo, o time precisa de prio em mid e na lane do lado do objetivo.</p></div>
</div>

<h2 class="ks">Técnicas</h2>
<div class="kgrid wv">
 <div class="wl-panel obj"><h3>${iconMarkup("freeze")} Freeze (congelar)</h3>
  <div class="lanefig"><span class="tw b">${gameIconMarkup("tower")}</span><span class="zone">zona do freeze</span><span class="mm b">●●</span><span class="mm r">●●●●●</span><span class="tw r">${gameIconMarkup("tower")}</span></div>
  <p><b>O que é:</b> segurar a wave parada logo <b>fora do alcance da sua torre</b>, só dando last hit.</p>
  <p><b>Como:</b> a wave inimiga precisa ser maior que a sua (uns 3–4 minions a mais) para ficar parada ali. Deixe a wave vir até você, só dê o último golpe e não bata nos minions à toa. Se a sua wave estiver grande demais, deixe ela bater na torre inimiga e monte o freeze com a próxima.</p>
  <p><b>Quando:</b> você está na frente e quer negar farm/XP; o caçador inimigo está do outro lado do mapa; o inimigo não tem como quebrar o freeze sem se arriscar.</p>
  <p><b>Cuidado:</b> freeze não gera prio. Você fica preso na lane e não ajuda em objetivo.</p></div>
 <div class="wl-panel obj"><h3>${iconMarkup("layers")} Slow push (empilhar)</h3>
  <p><b>O que é:</b> matar só os casters (ou só last hit) para a sua wave sobreviver e se somar com a próxima. Em 2–3 waves vira uma wave gigante.</p>
  <p><b>Quando:</b> antes de um dive; antes de voltar para a base com a wave batendo na torre; para criar pressão enquanto o time faz objetivo do outro lado; quando o canhão está chegando.</p>
  <p><b>Dica:</b> comece o slow push logo depois que a wave "resetou" no meio. O ideal é a wave grande chegar na torre na mesma hora que o seu caçador.</p></div>
 <div class="wl-panel obj"><h3>${gameIconMarkup("push")} Fast push (empurrar rápido)</h3>
  <p><b>O que é:</b> matar a wave o mais rápido possível com habilidades.</p>
  <p><b>Quando:</b> para dar <b>recall</b> sem perder farm; para <b>rotacionar</b> (roam, ajudar no rio); para ter <b>prio</b> antes de dragão, vastilarvas, arauto ou barão; quando o inimigo precisa voltar para a base.</p>
  <p><b>Cuidado:</b> empurrar rápido sem motivo deixa a wave perto da torre inimiga e você exposto a gank.</p></div>
 <div class="wl-panel obj"><h3>${iconMarkup("reset")} Crash e reset</h3>
  <p><b>O que é:</b> levar uma wave grande até bater na torre inimiga.</p>
  <p><b>Por que:</b> o inimigo perde minions embaixo da torre (difícil de farmar) e a wave "volta" (bounce) para o meio ou para você. É o melhor momento para dar recall: você volta e a wave ainda não chegou na sua torre.</p>
  <p><b>Melhor momento:</b> crashar a <b>wave de canhão</b>, que dura mais embaixo da torre.</p></div>
 <div class="wl-panel obj"><h3>${iconMarkup("undo")} Puxar a wave (pull)</h3>
  <p><b>O que é:</b> trazer a wave para mais perto da sua torre de propósito.</p>
  <p><b>Como:</b> pare de bater na wave e fique atrás; ou ataque o campeão inimigo perto dos minions dele para eles virarem em você e você recua andando (eles te seguem). Os minions inimigos vão andar até você.</p>
  <p><b>Quando:</b> para montar um freeze; quando você está mais fraco e precisa farmar seguro; quando o caçador inimigo está perto da sua lane.</p></div>
 <div class="wl-panel obj"><h3>${gameIconMarkup("tower")} Stack para dive</h3>
  <p><b>Receita:</b> 2–3 waves empilhadas (slow push) + caçador ou suporte perto + inimigo com pouca vida ou sem Flash.</p>
  <p><b>Timing:</b> entre logo que a wave grande chegar na torre: os minions tomam os tiros e a torre troca de alvo. Quem toma o primeiro tiro sai do alcance e outro segura a torre.</p>
  <p><b>Não mergulhe</b> sem wave: a torre só bate em vocês. Em 2026 a placa quebrada dá <b>20s de resistência extra</b> à torre (Bulwark), então dive depois de quebrar placas fica mais caro.</p></div>
</div>

<h2 class="ks">O que fazer em cada situação</h2>
<table><tr><th>Situação</th><th>O que fazer com a wave</th></tr>
<tr><td>Vou dar recall</td><td>Fast push ou crash a wave na torre e volte. Melhor ainda numa wave de canhão.</td></tr>
<tr><td>Dragão / vastilarvas / arauto em ~1 min</td><td>Mid e a lane do lado do objetivo empurram para ter prio. Bot e mid chegam primeiro no dragão; top e mid nas vastilarvas e no arauto.</td></tr>
<tr><td>Estou na frente na lane</td><td>Freeze perto da sua torre ou slow push para dive com o caçador.</td></tr>
<tr><td>Estou atrás na lane</td><td>Puxe a wave para perto da sua torre e farme seguro. Não brigue pela wave.</td></tr>
<tr><td>Inimigo deu recall</td><td>Slow push: quando ele voltar, encontra uma wave grande batendo na torre e perde farm/placa.</td></tr>
<tr><td>Inimigo sumiu do mapa</td><td>Não empurre além do meio sem visão. Wave perto da sua torre é a mais segura.</td></tr>
<tr><td>Quero roamar (mid/sup)</td><td>Fast push primeiro. Se a wave estiver indo para a sua torre, você perde farm e XP.</td></tr>
<tr><td>Inimigo freezou em mim</td><td>Chame o caçador para quebrar junto, ou dê recall e volte com a próxima wave. Não force sozinho.</td></tr>
<tr><td>Barão / fim de jogo</td><td>Empurre as side lanes antes do objetivo (as waves chegam a cada 20–25s). Waves no lado inimigo puxam a atenção dele.</td></tr>
</table>

<h2 class="ks">Erros comuns</h2>
<table>
<tr><td style="width:230px;color:var(--red)">Empurrar sem motivo</td><td>Wave perto da torre inimiga sem visão = gank fácil.</td></tr>
<tr><td style="color:var(--red)">Recall com a wave vindo</td><td>Você perde a wave inteira na sua torre (e a torre pode perder placa).</td></tr>
<tr><td style="color:var(--red)">Dive sem wave</td><td>A torre só tem você para bater.</td></tr>
<tr><td style="color:var(--red)">Ir para objetivo sem prio</td><td>O inimigo chega primeiro e você briga em desvantagem.</td></tr>
<tr><td style="color:var(--red)">Esquecer o canhão</td><td>Canhão vivo muda quem empurra. Conte as waves: 3ª wave e depois a cada 3 no começo.</td></tr>
</table>
<p style="color:var(--mut);font-size:12px;margin-top:18px">Fontes: <a style="color:var(--acc)" href="https://www.riftpatchnotes.com/lol/system/minions" target="_blank">riftpatchnotes — Minions (26.1, 26.9, 26.10)</a> · <a style="color:var(--acc)" href="https://www.leagueoflegends.com/news/dev/dev-2026-season-one-gameplay-preview/" target="_blank">Riot — /dev 2026 Season One</a> · <a style="color:var(--acc)" href="https://www.nerfplz.com/2026/10/minions-in-lol-10-rules-wave-plays-by.html" target="_blank">nerfplz — Minions in LoL</a></p>`;

function renderKnow(){
  const kt=S.kTab||"obj";
  const know = $("#know");
  const previousTab = know.dataset.activeTab;
  if (!know.firstElementChild) {
    know.innerHTML = `<div class="ktabs wl-motion-pill" role="group" aria-label="Seção de conhecimento"><button data-slot="button" data-variant="ghost" data-kt="obj">${iconMarkup("clock")} Objetivos e tempos</button><button data-slot="button" data-variant="ghost" data-kt="wave">${gameIconMarkup("bluemelee_circle_classic")} Controle de wave</button></div>
  <div id="k-wave">${WAVE_HTML}</div>
  <div id="k-obj">
  <div class="warn">${iconMarkup("warning")} Tempos da temporada 2026 (patch 26.1 em diante, jogo atual 16.x). As mudanças vieram do preview oficial da Riot e de guias de 2026; os primeiros spawns da selva são das notas do patch 26.1; os tempos de volta dos campos pequenos são os de sempre. Confirmem no jogo se algum patch novo mexer nisso. Os tempos são do relógio do jogo.</div>
  <div class="kgrid">${OBJ.map((o,i)=>`<div class="wl-panel obj"><h3>${gameIconMarkup(o.icon)}<span>${o.n}</span></h3>
     <div class="kv"><span>Primeiro spawn</span><span>${o.first}</span></div>
     <div class="kv"><span>Volta em</span><span>${o.resp}</span></div>
     ${o.rows.map(r=>`<div class="kv"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("")}
     <p>${o.p}</p>
     ${o.rs?`<div class="calc">Morreu em <input data-o="${o.rs}" placeholder="mm:ss"> → volta <span class="r" id="r${i}">—</span></div>`:""}
   </div>`).join("")}</div>
  <h2 class="ks">Selva e estruturas</h2>
  <table><tr><th>O quê</th><th>Primeiro spawn</th><th>Volta em</th><th>Calculadora</th></tr>
  ${CAMPS.map((c,i)=>`<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]?`<div class="calc" style="margin:0">morreu <input data-o="${c[3]}" placeholder="mm:ss"> → <span class="r">—</span></div>`:""}</td></tr>`).join("")}</table>
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
    initializeMotionNav("#know .ktabs");
  }
  know.dataset.activeTab = kt;
  for (const button of know.querySelectorAll("[data-kt]")) {
    const selected = button.dataset.kt === kt;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("on", selected);
  }
  $("#k-wave").hidden = kt !== "wave";
  $("#k-obj").hidden = kt !== "obj";
  if (previousTab && previousTab !== kt) revealContent($("#k-" + kt));
}
$("#know").addEventListener("click",e=>{const b=e.target.closest("[data-kt]");if(!b||S.kTab===b.dataset.kt)return;S.kTab=b.dataset.kt;save(false);renderKnow();$("#know [aria-pressed=true]")?.focus({preventScroll:true});publishTeamRoute("know")});
$("#know").addEventListener("input",e=>{const inp=e.target.closest("[data-o]");if(!inp)return;const s=toS(inp.value);const out=inp.parentElement.querySelector(".r");out.textContent=s==null?"—":fmt(s+ +inp.dataset.o)});

/* ===== Mapa tático ===== */
const ROLES=["top","jg","mid","adc","sup"],RN={top:"TOP",jg:"JG",mid:"MID",adc:"ADC",sup:"SUP"};
const TOKS=[...ROLES.map(r=>"b_"+r),...ROLES.map(r=>"r_"+r)];
const sw=([x,y])=>[y,x]; // espelha lado azul -> vermelho
const PRE={
 base:{top:[4,90],jg:[7,93],mid:[10,96],adc:[4,96],sup:[10,90]},
 lane:{top:[8,38],jg:[24,50],mid:[42,58],adc:[62,93],sup:[60,89]}
};
function preset(k){const p={};for(const r of ROLES){p["b_"+r]=PRE[k][r].slice();p["r_"+r]=sw(PRE[k][r])}return p}
const blankPlay=n=>({id:uid(),name:n||"Nova jogada",live:{pos:preset("lane"),lines:[]},steps:[],cb:"",cr:""});
let M={tool:"move",color:"#ffd34d",sel:-1,playing:false};
function plays(){if(!Array.isArray(S.plays)||!S.plays.length){S.plays=[blankPlay("Jogada 1")];S.curPlay=S.plays[0].id}if(!S.plays.some(p=>p.id===S.curPlay))S.curPlay=S.plays[0].id;return S.plays}
const play=()=>plays().find(p=>p.id===S.curPlay);
const clone=o=>JSON.parse(JSON.stringify(o));

// mapa esquemático (sempre desenhado; a imagem oficial fica por cima quando carrega)
(function schem(){
  const T=[[7,30],[8,54],[7,74],[39,61],[32,68],[24,76],[70,93],[46,92],[26,93],[11,89]];
  const tw=(t,c)=>`<rect x="${t[0]-1.3}" y="${t[1]-1.3}" width="2.6" height="2.6" rx=".5" fill="${c}" stroke="#000" stroke-width=".3"/>`;
  const buffs=[[24,47,"#4fa3ff"],[52,75,"#ff6a4d"]];
  $("#schem").innerHTML=`<rect width="100" height="100" fill="#1b2a1e"/>
  <g fill="#23362a">${[[30,40,9],[40,80,8],[18,62,7],[60,20,9],[80,40,8],[38,18,7],[62,82,7],[82,60,7]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>
  <path d="M10,16 C28,24 40,38 50,50 C60,62 72,76 84,90" stroke="#24506b" stroke-width="8" fill="none" stroke-linecap="round"/>
  <g stroke="#c9b884" stroke-opacity=".4" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
   <path d="M7,84 L7,7 L84,7"/><path d="M16,84 L84,16"/><path d="M16,93 L93,93 L93,16"/></g>
  <path d="M0,100 L0,80 A20,20 0 0 1 20,100 Z" fill="#3d8bff" fill-opacity=".35"/>
  <path d="M100,0 L80,0 A20,20 0 0 0 100,20 Z" fill="#ff4d4d" fill-opacity=".35"/>
  ${T.map(t=>tw(t,"#3d8bff")).join("")}${T.map(t=>tw(sw(t),"#ff4d4d")).join("")}
  ${buffs.map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="1.4" fill="${c}"/><circle cx="${y}" cy="${x}" r="1.4" fill="${c}"/>`).join("")}
  <circle cx="31" cy="28" r="4" fill="#5b3f8f" stroke="#a37bff" stroke-width=".4"/><text x="31" y="28.7" font-size="1.9" text-anchor="middle" fill="#fff">Barão</text>
  <circle cx="69" cy="72" r="4" fill="#7a4a1e" stroke="#ff9d4d" stroke-width=".4"/><text x="69" y="72.7" font-size="1.9" text-anchor="middle" fill="#fff">Dragão</text>`;
})();
function setMapImg(){const im=$("#mapimg");if(!$("#useimg").checked){im.style.display="none";return}
  im.onload=()=>{if($("#useimg").checked)im.style.display="block"};im.onerror=()=>{im.style.display="none"};
  if(im.getAttribute("src")!==lolAsset(LOL_DATA.map))im.src=lolAsset(LOL_DATA.map);
  else if(im.complete&&im.naturalWidth)im.style.display="block"}
$("#useimg").onchange=()=>{S.useImg=$("#useimg").checked;save(false);setMapImg()};

// bolinhas
$("#map").insertAdjacentHTML("beforeend",TOKS.map(t=>`<div class="tok ${t[0]}" data-t="${t}"></div>`).join(""));
function compChamp(cid,role){const c=S.comps.find(x=>x.id===cid);return c&&c.lanes[role]&&c.lanes[role][0]}
function renderTokens(){
  const p=play();
  document.querySelectorAll(".tok").forEach(el=>{const t=el.dataset.t,[side,role]=t.split("_");
    const ch=compChamp(side==="b"?p.cb:p.cr,role);
    el.innerHTML=(ch?img(ch):`<span>${RN[role]}</span>`)+(ch?`<span class="rl">${RN[role]} · ${esc(ch)}</span>`:"");
    el.title=(side==="b"?"Azul ":"Vermelho ")+RN[role]+(ch?" - "+ch:"")});
  placeTokens(p.live.pos);
}
function placeTokens(pos){document.querySelectorAll(".tok").forEach(el=>{const v=pos[el.dataset.t];if(v){el.style.left=v[0]+"%";el.style.top=v[1]+"%"}})}
let dragT=null;
$("#map").addEventListener("pointerdown",e=>{
  const tk=e.target.closest(".tok");
  if(M.playing)return;
  if(tk){preSnap=snapLive();moved=false;dragT=tk;tk.setPointerCapture(e.pointerId);e.preventDefault();return}
  if(M.tool==="erase"){const i=hitLine(pt(e));if(i<0)return toast("Clique em cima de uma seta para apagar");pushUndo();play().live.lines.splice(i,1);hover=-1;save(false);drawLines(play().live.lines);syncStep();return}
  if(M.tool==="draw"){preSnap=snapLive();const p=pt(e);cur_line={c:M.color,pts:[p]};play().live.lines.push(cur_line);$("#cv").setPointerCapture(e.pointerId)}
});
let cur_line=null;
const pt=e=>{const r=$("#map").getBoundingClientRect();return[Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))].map(v=>Math.round(v*10)/10)};
$("#map").addEventListener("pointermove",e=>{
  if(M.tool==="erase"&&!dragT&&!M.playing){const h=hitLine(pt(e));if(h!==hover){hover=h;drawLines(play().live.lines)}return}
  if(dragT){const p=pt(e);moved=true;play().live.pos[dragT.dataset.t]=p;dragT.style.left=p[0]+"%";dragT.style.top=p[1]+"%"}
  else if(cur_line){const p=pt(e),l=cur_line.pts[cur_line.pts.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>0.6){cur_line.pts.push(p);drawLines(play().live.lines)}}
});
const endPtr=()=>{if(dragT||cur_line){if(cur_line&&cur_line.pts.length<2)play().live.lines.pop();else if(cur_line||moved)pushUndo(preSnap);moved=false;dragT=null;cur_line=null;save(false);drawLines(play().live.lines);syncStep()}};
$("#map").addEventListener("pointerup",endPtr);$("#map").addEventListener("pointercancel",endPtr);

// desenho
function drawLines(lines){
  const cv=$("#cv"),r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  if(cv.width!==Math.round(r.width*dpr)){cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr)}
  const g=cv.getContext("2d"),W=cv.width/100,H=cv.height/100;g.clearRect(0,0,cv.width,cv.height);
  g.lineCap="round";g.lineJoin="round";
  (lines||[]).forEach((l,li)=>{if(l.pts.length<2)return;const hl=M.tool==="erase"&&li===hover;g.strokeStyle=hl?"#ff4d4d":l.c;g.fillStyle=hl?"#ff4d4d":l.c;g.lineWidth=(hl?6:3.2)*dpr;g.setLineDash(hl?[8*dpr,5*dpr]:[]);
    g.beginPath();l.pts.forEach((p,i)=>i?g.lineTo(p[0]*W,p[1]*H):g.moveTo(p[0]*W,p[1]*H));g.stroke();
    const a=l.pts[l.pts.length-1],b=l.pts[Math.max(0,l.pts.length-4)],ang=Math.atan2((a[1]-b[1])*H,(a[0]-b[0])*W),s=12*dpr;
    g.beginPath();g.moveTo(a[0]*W,a[1]*H);g.lineTo(a[0]*W-s*Math.cos(ang-0.45),a[1]*H-s*Math.sin(ang-0.45));g.lineTo(a[0]*W-s*Math.cos(ang+0.45),a[1]*H-s*Math.sin(ang+0.45));g.closePath();g.fill()});
}
window.addEventListener("resize",()=>drawLines(play().live.lines));

// ferramentas
const COLS=[["#ffd34d","Amarela"],["#3d8bff","Azul"],["#ff4d4d","Vermelha"],["#ffffff","Branca"],["#5be08a","Verde"]];
$("#cols").innerHTML=COLS.map(([c,name])=>`<button class="col${c===M.color?" on":""}" data-c="${c}" style="--swatch:${c}" aria-label="${name}" aria-pressed="${c===M.color}"></button>`).join("");
$("#cols").onclick=e=>{const b=e.target.closest("[data-c]");if(!b)return;M.color=b.dataset.c;$("#cols").querySelectorAll("[data-c]").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",String(x===b))})};
document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{M.tool=b.dataset.tool;document.querySelectorAll("[data-tool]").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",x===b)});$("#map").classList.toggle("draw",M.tool==="draw");$("#map").classList.toggle("erase",M.tool==="erase");hover=-1;drawLines(play().live.lines)});
$("#clr").onclick=()=>{if(!play().live.lines.length)return;pushUndo();play().live.lines=[];save(false);drawLines([]);syncStep()};
document.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{if(M.playing)return;pushUndo();animateTo(preset(b.dataset.pre),play().live.lines)});
// desfazer / refazer
let preSnap=null,moved=false,hover=-1;const UNDO=[],REDO=[];
function snapLive(){return{pid:S.curPlay,live:clone(play().live)}}
function pushUndo(s){UNDO.push(s||snapLive());if(UNDO.length>100)UNDO.shift();REDO.length=0;undoBtns()}
function undoBtns(){$("#undo").disabled=!UNDO.length;$("#redo").disabled=!REDO.length}
function restore(from,to){if(M.playing||!from.length)return;const s=from.pop(),p=plays().find(x=>x.id===s.pid);if(!p){undoBtns();return}
  to.push({pid:p.id,live:clone(p.live)});p.live=clone(s.live);
  if(p.id!==S.curPlay){S.curPlay=p.id;M.sel=-1}
  save(false);renderPlays();syncStep();undoBtns()}
const undo=()=>restore(UNDO,REDO),redo=()=>restore(REDO,UNDO);
$("#undo").onclick=undo;$("#redo").onclick=redo;undoBtns();
document.addEventListener("keydown",e=>{
  if(!$("#v-map").classList.contains("on")||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  const k=e.key.toLowerCase();if(!(e.ctrlKey||e.metaKey))return;
  if(k==="z"&&!e.shiftKey){e.preventDefault();undo()}else if(k==="y"||(k==="z"&&e.shiftKey)){e.preventDefault();redo()}
});
function hitLine(p){const ls=play().live.lines;let best=-1,bd=2;
  ls.forEach((l,i)=>{for(let j=1;j<l.pts.length;j++){const a=l.pts[j-1],b=l.pts[j],dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;let t=L2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2:0;t=Math.max(0,Math.min(1,t));const d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(d<bd){bd=d;best=i}}});
  return best}

// jogadas
function renderPlays(highlightStep = false){
  const p=play();
  $("#psel").innerHTML=plays().map(x=>`<option value="${x.id}"${x.id===p.id?" selected":""}>${esc(x.name)} (${x.steps.length} passos)</option>`).join("");
  const opts=`<option value="">Só a função (TOP, JG...)</option>`+S.comps.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  $("#cb").innerHTML=opts;$("#cr").innerHTML=opts;$("#cb").value=p.cb||"";$("#cr").value=p.cr||"";
  $("#steps").innerHTML=p.steps.map((s,i)=>`<li data-i="${i}" class="${i===M.sel?"on":""}"${i===M.sel?` aria-current="step"${highlightStep?" data-step-highlight":""}`:""}><input data-lab="${i}" value="${esc(s.label||"Passo "+(i+1))}" aria-label="Nome do passo ${i+1}" title="Clique para renomear"><button data-slot="button" data-variant="destructive" data-size="icon-sm" data-sdel="${i}" aria-label="Apagar passo ${i+1}">${iconMarkup("close")}</button></li>`).join("")||'<li class="none">Nenhum passo ainda.</li>';
  renderStat();
  renderTokens();drawLines(p.live.lines);
}
$("#psel").onchange=()=>{S.curPlay=$("#psel").value;M.sel=-1;save(false);renderPlays();publishTeamRoute("map")};
$("#pnew").onclick=()=>{const n=prompt("Nome da jogada:","Jogada "+(plays().length+1));if(n===null)return;const p=blankPlay(n||undefined);S.plays.push(p);S.curPlay=p.id;M.sel=-1;save();renderPlays();publishTeamRoute("map")};
$("#pren").onclick=()=>{const p=play(),n=prompt("Novo nome:",p.name);if(!n)return;p.name=n;save();renderPlays()};
$("#pdel").onclick=()=>{const p=play();if(!confirm(`Excluir a jogada "${p.name}"?`))return;S.plays=S.plays.filter(x=>x.id!==p.id);plays();M.sel=-1;save();renderPlays();publishTeamRoute("map")};
$("#cb").onchange=()=>{play().cb=$("#cb").value;save(false);renderTokens()};
$("#cr").onchange=()=>{play().cr=$("#cr").value;save(false);renderTokens()};

// passos: o passo selecionado salva sozinho tudo o que muda no mapa
function syncStep(){const p=play();if(!M.edit||M.playing||M.sel<0||!p.steps[M.sel])return;const s=p.steps[M.sel];s.pos=clone(p.live.pos);s.lines=clone(p.live.lines);save(false);flashStep()}
let tFl;function flashStep(){const el=$("#sstat .ok");if(!el)return;el.style.opacity=1;clearTimeout(tFl);tFl=setTimeout(()=>el.style.opacity=0,900)}
function renderStat(){const p=play(),s=p.steps[M.sel],b=$("#sedit");
  b.classList.toggle("on",!!M.edit);b.setAttribute("aria-pressed",M.edit);
  $("#sstat").className="sstat"+(M.edit&&s?" ed":"");
  $("#sstat").innerHTML=M.playing?`${iconMarkup("play")} Reproduzindo...`:M.edit?(s?`${iconMarkup("edit")} <b>Modo edição ligado</b>: o que você mover no mapa é salvo no <b>passo ${M.sel+1}</b>. <span class="ok">${iconMarkup("check")} salvo</span>`:`${iconMarkup("edit")} Modo edição ligado: clique num passo da lista para escolher qual editar.`):p.steps.length?`${iconMarkup("lock")} Modo edição desligado: mover as bolinhas não altera nenhum passo. Para criar o próximo, mova e clique em <b>Novo passo</b>. Para corrigir um passo, selecione e ligue o modo edição.`:"Posicione as bolinhas e clique em <b>Novo passo</b> para salvar o primeiro momento da jogada.";}
$("#sadd").onclick=()=>{if(M.playing)return;const p=play(),at=M.sel>=0?M.sel+1:p.steps.length;p.steps.splice(at,0,{label:"Passo "+(p.steps.length+1),pos:clone(p.live.pos),lines:clone(p.live.lines)});M.sel=at;save();renderPlays();toast(`Passo ${at+1} salvo com a posição atual`)};
$("#sedit").onclick=()=>{M.edit=!M.edit;renderStat();if(M.edit&&M.sel<0)toast("Agora clique no passo que quer editar")};
$("#steps").addEventListener("input",e=>{const i=e.target.dataset.lab;if(i==null)return;play().steps[+i].label=e.target.value;save(false)});
$("#steps").onclick=e=>{const d=e.target.closest("[data-sdel]");const p=play();
  if(d){const i=+d.dataset.sdel;if(!confirm(`Apagar o passo ${i+1}?`))return;p.steps.splice(i,1);if(M.sel===i)M.sel=-1;else if(M.sel>i)M.sel--;save();renderPlays();return}
  const li=e.target.closest("li[data-i]");if(!li||M.playing)return;const i=+li.dataset.i;if(i!==M.sel)goStep(i)};
function goStep(i){const p=play();if(i<0||i>=p.steps.length)return;M.sel=i;const s=p.steps[i];renderPlays(true);return animateTo(s.pos,s.lines)}
$("#sprev").onclick=()=>!M.playing&&goStep(M.sel-1);
$("#snext").onclick=()=>!M.playing&&goStep(M.sel+1);
$("#spd").oninput=()=>$("#spdv").textContent=$("#spd").value+"s";
function animateTo(target,lines){
  return new Promise(res=>{
    const p=play(),from=clone(p.live.pos),dur=+$("#spd").value*1000,t0=performance.now();
    p.live.lines=clone(lines||[]);drawLines(p.live.lines);
    const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    (function f(now){const k=ease(Math.min(1,(now-t0)/dur)),cur={};
      for(const t of TOKS){const a=from[t]||target[t],b=target[t]||a;cur[t]=[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]}
      placeTokens(cur);
      if(k<1)requestAnimationFrame(f);else{p.live.pos=clone(target);save(false);syncStep();res()}})(t0);
  });
}
$("#splay").onclick=async()=>{
  const p=play();if(M.playing){M.playing=false;return}
  if(!p.steps.length)return toast("Salve pelo menos 2 passos para reproduzir");
  M.playing=true;$("#splay").innerHTML=iconMarkup("stop")+" Parar";renderStat();
  p.live.pos=clone(p.steps[0].pos);M.sel=0;renderPlays(true);
  for(let i=1;i<p.steps.length&&M.playing;i++){await new Promise(r=>setTimeout(r,450));if(!M.playing)break;M.sel=i;renderPlays(true);placeTokens(p.steps[i-1].pos);p.live.pos=clone(p.steps[i-1].pos);await animateTo(p.steps[i].pos,p.steps[i].lines)}
  M.playing=false;$("#splay").innerHTML=iconMarkup("play")+" Reproduzir";renderStat();
};

/* ===== Início ===== */
function renderAll(){renderList();renderEditor();renderGrid()}
load();plays();renderAll();renderKnow();$("#useimg").checked=S.useImg!==false;setMapImg();renderPlays();
