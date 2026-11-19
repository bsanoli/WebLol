// @ts-nocheck -- O editor legado ainda depende de estado dinâmico vindo do armazenamento local.
import { askChoice, askName, confirmAction, showDialog } from "@/shared/ui/dialog-controls"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { lolAsset, lolChampion, lolImage } from "@/entities/champion"
import { ensureTeamPlays } from "@/entities/tactical-play"
import { clearTeamControls, mountChampionMenu, mountCompositionMenu, mountDraftChampionMenu, mountLaneNote, mountPickSwapMenu, mountMapEmpty, mountMapSwitch, mountTeamSelect, mountSectionTabs, mountToolGroup } from "./team-controls"
import { initializeTheme } from "@/shared/config/theme"
import { revealContent } from "@/shared/lib/motion"

import { CH } from "../model/champion-catalog"
import { createCompositionCopy } from "../model/composition"
import WS from "../api/worlds-champion-stats.json"
import { KEY, uid, blank, loadTeamState } from "../model/local-state"
import { DRAFT_SIDE, PICKNAME, compositionPreview, draftHTML, draftOf, sideDot } from "./draft"
import { mountTeamNavigation } from "./team-navigation"
import { tacticGridHTML, tacticsHTML } from "./tactics"
import { createSavedTactic, ensureTactics, hasTactic, isSavedTactic, itemsForView, setTacticView, tacticShownIn, setTacticTeam, setTacticOpgg, tacticOpggOf, normalizeOpggLink, readTactic, readTacticImages, writeTactic } from "../model/tactics"
import { compressImage } from "../lib/compress-image"
import { capturePickFeedback } from "./pick-feedback"

initializeTheme()

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
let S;
const getState = () => S;
const plays = () => ensureTeamPlays(S, uid);
const savedStatus = $("#saved");
const localSave = $("#local-save");

function setSaveStatus(message, failed = false) {
  if (savedStatus.textContent !== message) savedStatus.textContent = message;
  localSave.toggleAttribute("data-save-error", failed);
  const description = $("#local-save-description");
  const help = failed
    ? "O navegador não conseguiu gravar as edições. Use Exportar para guardar uma cópia."
    : "As edições são salvas automaticamente neste navegador.";
  if (description.textContent !== help) description.textContent = help;
}

function save(){
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    setSaveStatus("Salvo neste navegador");
  } catch {
    setSaveStatus("Falha ao salvar", true);
  }
}

const cur=()=>S.comps.find(c=>c.id===S.cur);
document.addEventListener("click", event => {
  if (!localSave.contains(event.target) && !event.target.closest?.('[role="alertdialog"]')) {
    localSave.open = false;
  }
});
localSave.addEventListener("keydown", event => {
  if (event.key !== "Escape" || !localSave.open) return;
  localSave.open = false;
  localSave.querySelector("summary").focus();
});

$("#clear-local").onclick=async()=>{
  let rawBase, base;
  try {
    rawBase = localStorage.getItem("lol-base");
    base = JSON.parse(rawBase);
    if (rawBase !== null && (!Array.isArray(base?.data?.comps) || !Array.isArray(base?.data?.plays))) {
      throw new Error("Base inválida");
    }
  } catch {
    toast("Não foi possível ler a versão salva do time.");
    return;
  }

  const destination = base ? `a versão sincronizada do time (v${base.version})` : "os dados iniciais do site";
  const choice = await askChoice(
    "Restaurar dados locais?",
    `As composições e jogadas deste navegador serão substituídas por ${destination}. Envios para aprovação continuam na fila.`,
    [
      { value: "backup", label: "Baixar cópia" },
      { value: "restore", label: "Restaurar", destructive: true },
    ],
  );
  if (choice === "backup") {
    downloadTeamBackup();
    return;
  }
  if (choice !== "restore") return;

  try {
    if (localStorage.getItem("lol-base") !== rawBase) {
      toast("A versão do time mudou. Abra a restauração novamente.");
      return;
    }
    if (base) {
      const { comps, plays } = base.data;
      const tactics = Array.isArray(base.data.tactics) ? base.data.tactics : [];
      localStorage.setItem(KEY, JSON.stringify({
        comps, plays, tactics, view: S.view,
        cur: comps.find(comp => comp.id === S.cur)?.id ?? comps[0]?.id,
        curPlay: plays.find(play => play.id === S.curPlay)?.id ?? plays[0]?.id,
      }));
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    toast("Não foi possível restaurar os dados locais.");
    return;
  }
  window.location.reload();
};
let active="top";

function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2200)}

/* ===== Lista de comps ===== */
function renderList(){
  const q=$("#csearch").value.toLowerCase();
  const matches=itemsForView(S.comps,"lane").filter(c=>!q||c.name.toLowerCase().includes(q)||Object.values(c.lanes).flat().some(n=>n.toLowerCase().includes(q)));
  const selected=cur();
  $("#draft-comp").innerHTML=[selected,...matches.filter(c=>c!==selected)]
    .map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  const list=$("#clist");
  clearTeamControls(list);
  list.innerHTML=matches
   .map(c=>{const firsts=compositionPreview(c);
     return `<div class="composition-item"><button class="ci${c.id===S.cur?" on":""}" aria-pressed="${c.id===S.cur}" data-id="${c.id}" title="${esc(c.name)}"><b>${isSavedTactic(c)?iconMarkup("book"):sideDot(c)}${esc(c.name)}</b>
      <span class="mini">${firsts.map(img).join("")||'<small style="color:var(--mut)">vazia</small>'}</span></button><span class="composition-menu" data-team-control></span></div>`}).join("")||'<p class="composition-empty" role="status">Nenhuma composição encontrada. Tente outro nome ou campeão.</p>';
  list.querySelectorAll(".composition-menu").forEach((host,index)=>{
    const {id,name}=matches[index];
    mountCompositionMenu(host,name,()=>{
      duplicateComposition(id);
      $("#clist .ci.on")?.focus({preventScroll:true});
    },async()=>{
      if(await deleteComp(id)) ($("#clist .ci.on")||$("#clist .ci")||$("#new")).focus({preventScroll:true});
    });
  });
}
function selectComp(id){S.cur=id;if(!isSavedTactic(S.comps.find(c=>c.id===id)))S.lastComp=id;save(false);renderAll();publishTeamRoute("comps")}
$("#clist").onclick = event => {
  const item = event.target.closest(".ci");
  if (!item || item.dataset.id === S.cur) return;
  selectComp(item.dataset.id);
  $("#clist .ci[aria-pressed=true]")?.focus({ preventScroll: true });
};
$("#draft-comp").onchange=e=>selectComp(e.target.value);
$("#csearch").oninput=renderList;
$("#new").onclick=()=>{const c=blank("Comp "+(S.comps.length+1));S.comps.unshift(c);S.cur=c.id;active="top";save();renderAll();publishTeamRoute("comps");setTimeout(()=>{$("#cname").focus();$("#cname").select()},0)};
function duplicateComposition(id: string) {
  const source = S.comps.find(comp => comp.id === id);
  if (!source) return;

  const copy = createCompositionCopy(source, uid(), Date.now());
  S.comps.unshift(copy);
  S.cur = copy.id;
  save();
  renderAll();
  publishTeamRoute("comps");
}
async function deleteComp(id){const c=S.comps.find(c=>c.id===id);if(!c || !await confirmAction(`Excluir a comp "${c.name}"?`, "Excluir composição"))return false;S.comps=S.comps.filter(x=>x.id!==c.id);if(!S.comps.length)S.comps.push(blank());if(!S.comps.some(x=>x.id===S.cur))S.cur=S.comps[0].id;save();renderAll();publishTeamRoute("comps");return true};

/* ===== Editor ===== */
function optionHTML(n,l,i){
  return `<div class="chip ${i===0?"primary":"alternative"}" draggable="true" data-n="${esc(n)}" data-from="${l}">
    <button class="champ-priority" data-champion-slot="${i}" data-champion-name="${esc(n)}" data-priority="${esc(n)}" data-lane="${l}" aria-label="Priorizar ${esc(n)} em ${LN[l].n}" title="${i+1}ª opção · tornar principal">${img(n)}${i===0?`<span><small>Principal</small><b>${esc(n)}</b></span>`:""}</button>
    <span class="option-menu" data-team-control data-option-index="${i}"></span>
  </div>`;
}
// Arte em alta (1215×717) direto do Data Dragon; se não carregar, usa a cópia local menor.
function pickArt(name){
  const local=name?champArt(name)?.splash:"";
  if(!local)return "";
  const id=local.match(/splash\/(.+)\.webp$/)?.[1];
  if(!id)return lolImage(local,"pick-splash");
  return `<img alt="" class="pick-splash" loading="lazy" src="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg" onerror="this.onerror=()=>this.remove();this.src='assets/${local}'">`;
}

function renderDraftLaneNotes(c){
  const list=$("#notes-lanes");
  if(!list)return;
  list.innerHTML=LANES.filter(lane=>c.laneNotes[lane.k]?.trim())
    .map(lane=>`<li><b>${lane.n}</b> ${esc(c.laneNotes[lane.k])}</li>`).join("");
  list.hidden=!list.childElementCount;
}

// Destaca "Anotações da composição" quando o painel tem algo escrito.
function hasCompNotes(c,dv){
  if(c.notes?.trim()) return true;
  if(!dv) return false;
  const d=draftOf(c);
  return !!d.note[d.side]?.trim() || LANES.some(lane=>c.laneNotes[lane.k]?.trim());
}
const markCompNotes=()=>$("#composition-notes")?.classList.toggle("has-notes",hasCompNotes(cur(),S.view==="draft"));
// Fora da aba Táticas, uma tática salva só fica aberta se estiver aplicada àquela aba;
// senão volta para a última comp usada (ou a primeira comp da lista).
function keepCompositionForView(){
  if(S.view==="tactics")return;
  const c=cur();
  if(!isSavedTactic(c)||tacticShownIn(c,S.view==="draft"?"draft":"lane"))return;
  const next=S.comps.find(x=>x.id===S.lastComp&&!isSavedTactic(x))||S.comps.find(x=>!isSavedTactic(x));
  if(next){S.cur=next.id;save();}
}
function renderEditor(){
  keepCompositionForView();
  const previousComposition = $("#editor").dataset.motionComposition;
  const c=cur(),dv=S.view==="draft",tv=S.view==="tactics";
  const view = tv ? "tactics" : dv ? "draft" : "lanes";
  const previousView = $("#editor").dataset.motionView;
  const notesOpen=$("#composition-notes")?.open;
  $("#v-comps").classList.toggle("draft-view",dv);
  $("#v-comps").classList.toggle("tactics-view",tv);
  $("#draft-comp").hidden=true;
  const notes=`<details id="composition-notes" ${notesOpen?"open":""} class="${hasCompNotes(c,dv)?"has-notes":""}"><summary>Anotações da composição<span class="notes-flag" aria-label="tem anotação" title="Esta comp tem anotação">${iconMarkup("edit")}</span></summary><label class="control-label" for="notes">Plano geral</label><textarea id="notes" placeholder="Plano de jogo, condição de vitória…">${esc(c.notes)}</textarea>${dv?`<label class="control-label" for="dnote">Plano do draft · ${DRAFT_SIDE[draftOf(c).side]}</label><textarea id="dnote">${esc(draftOf(c).note[draftOf(c).side])}</textarea><ul id="notes-lanes" class="draft-lane-notes" aria-label="Observações por posição" hidden></ul>`:""}</details>`;
  const editor = $("#editor");
  const showPickFeedback = previousComposition === c.id && previousView === view
    ? capturePickFeedback(editor) : undefined;
  const nameInput = $("#cname");
  nameInput.value = c.name;
  nameInput.title = c.name;
  mountSectionTabs($(".editor-controls .vtog"), "Modo da composição", S.view || "lanes", [
    { value: "lanes", label: "Opções por posição", panel: "composition-panel" },
    { value: "draft", label: "Ordem do draft", panel: "composition-panel" },
    { value: "tactics", label: "Táticas", panel: "composition-panel" },
  ], value => {
    S.view = value;
    save(false);
    renderEditor();
    renderList();
    publishTeamRoute("comps");
  }, "navigation");
  const catalog=$("#champ-picker"),gridScroll=$("#grid").scrollTop,tabsScroll=editor.querySelector(".dz-tabs, .tx-tabs")?.scrollTop||0;
  if (editor.contains(catalog)) $("#comps").append(catalog);
  clearTeamControls(editor);
  editor.replaceChildren();
  if (tv) {
    const txScroll = tabsScroll;
    editor.insertAdjacentHTML("beforeend", `<div id="composition-panel" role="tabpanel" aria-labelledby="tab-tactics">${tacticsHTML(c, {
      compositions: S.comps, general: !!S.tacticsGeneral, text: readTactic(S, S.tacticsGeneral ? null : c.id),
      images: readTacticImages(S, S.tacticsGeneral ? null : c.id),
      hasTactic: id => hasTactic(S, id), panel: tacticPanel(), active, query: tacticQuery, champions: CH, LN, img, esc,
    })}</div>`);
    if (!S.tacticsGeneral && tacticPanel() === "draft") editor.querySelectorAll("[data-swap-lane]").forEach(host => {
      const lane = host.dataset.swapLane, list = c.lanes[lane];
      mountPickSwapMenu(host, LN[lane].n, list[0] || "", list.slice(1).map(name => ({ name, portrait: img(name) })), name => {
        const champions = cur().lanes[lane], index = champions.indexOf(name);
        if (index < 1) return;
        champions.splice(index, 1);
        champions.unshift(name);
        touch(); save(); renderEditor(); renderList();
        toast(`${name} agora é o principal em ${LN[lane].n}`);
      });
    });
    loadPrintThumbnails(editor);
    const txTabs = editor.querySelector(".tx-tabs");
    if (txTabs) txTabs.scrollTop = txScroll;
    editor.dataset.motionComposition = c.id;
    editor.dataset.motionView = view;
    if (previousView !== view) revealContent(editor, true);
    return;
  }
  editor.insertAdjacentHTML("beforeend", `
  <div id="composition-panel" role="tabpanel" aria-labelledby="tab-${dv ? "draft" : "lanes"}">
  ${notes}<button data-slot="button" data-variant="default" type="button" class="jump-picker" data-picker>${iconMarkup("plus")} Adicionar campeão</button>
  ${dv?draftHTML(c, { active, compositions: itemsForView(S.comps,"draft"), LN, img, esc, pickArt }):LANES.map(l=>`<div class="lane${active===l.k?" act":""}${l.k==="ban"?" ban-strip":""}" data-l="${l.k}" style="--lc:var(${l.c})">
  ${l.k==="ban"?"":pickArt(c.lanes[l.k][0])}
  <button class="ln lane-label" data-draft-target="${l.k}" aria-pressed="${active===l.k}">${laneIconMarkup(l.k)}${l.n}</button>
  <div class="chips" data-champion-group="${l.k}">${c.lanes[l.k].map((n,i)=>optionHTML(n,l.k,i)).join("")||'<span class="empty">Adicionar campeão</span>'}</div>
<span class="lane-note" data-team-control data-note-lane="${l.k}"></span></div>`).join("")}
  <p class="help">${dv?"Selecione o retrato para torná-lo principal. Para remover, abra o menu do retrato com o botão direito ou Shift+F10.":"Selecione o retrato para priorizar. Arraste ou use o menu ⋯ para reordenar."}</p></div>`);
  editor.querySelectorAll(".option-menu").forEach(host=>{
    const {n,from}=host.closest(".chip").dataset;
    mountChampionMenu(host,n,Number(host.dataset.optionIndex),c.lanes[from].length,
      direction=>reorderChampion(n,from,direction),()=>removeChampion(n,from));
  });
  editor.querySelectorAll(".dchip").forEach(host=>{
    const {n,from}=host.dataset;
    mountDraftChampionMenu(host,n,()=>removeChampion(n,from));
  });
  editor.querySelectorAll(".lane-note").forEach(host=>{
    const lane=LN[host.dataset.noteLane];
    mountLaneNote(host,`Observação de ${lane.n}`,c.laneNotes[lane.k]||"",value=>{
      c.laneNotes[lane.k]=value;
      renderDraftLaneNotes(c);
      markCompNotes();
      touch();save();
    });
  });
  editor.querySelectorAll("select[data-pick-position]").forEach(mountTeamSelect);
  renderDraftLaneNotes(c);
  placePicker();
  $("#grid").scrollTop=gridScroll;
  const tabs=editor.querySelector(".dz-tabs");if(tabs)tabs.scrollTop=tabsScroll;
  renderTarget();
  editor.dataset.motionComposition = c.id;
  editor.dataset.motionView = view;
  if (previousComposition !== c.id) revealContent(editor);
  else if (previousView !== view) revealContent(editor, true);
  else showPickFeedback?.();
}
const touch=()=>{cur().updated=Date.now()};
$("#v-comps").addEventListener("input",e=>{
  const c=cur();
  if(e.target.id==="cname"){
    c.name=e.target.value;
    e.target.title=c.name;
    touch();save();renderList();
  }
  else if(e.target.id==="notes"){c.notes=e.target.value;touch();save();markCompNotes()}
  else if(e.target.id==="tactics-text"){
    const general=!!S.tacticsGeneral;
    writeTactic(S,general?null:c.id,c.name,e.target.value,Date.now());save();
    const tab=$(general?"#editor [data-tactic-general]":`#editor [data-tactic-comp="${CSS.escape(c.id)}"]`);
    const has=!!e.target.value.trim(),mark=tab?.querySelector(".tx-has");
    if(has&&!mark)tab?.querySelector("b")?.insertAdjacentHTML("beforeend",`<span class="tx-has" title="Tem anotação de tática">${iconMarkup("edit")}</span>`);
    else if(!has)mark?.remove();
  }
  else if(e.target.id==="dnote"){const d=draftOf(c);d.note[d.side]=e.target.value;touch();save();markCompNotes()}
});
$("#editor").addEventListener("change",e=>{
  if(!e.target.matches("select[data-pick-position]"))return;
  const d=draftOf(cur()),order=d.order[d.side],i=Number(e.target.dataset.pickPosition);
  const lane=e.target.value,j=order.indexOf(lane);
  [order[i],order[j]]=[lane,order[i]];
  active=lane;touch();save();renderEditor();renderList();
  requestAnimationFrame(()=>$(`[data-pick-position="${i}"] + .team-select button`)?.focus({preventScroll:true}));
});
function reorderChampion(name,lane,direction){
  const champions=cur().lanes[lane],index=champions.indexOf(name);
  if(direction===undefined){
    champions.splice(index,1);
    champions.unshift(name);
  }else{
    const next=index+direction;
    [champions[index],champions[next]]=[champions[next],champions[index]];
  }
  active=lane;touch();save();renderEditor();renderList();renderGrid();
  if(S.view==="draft"){
    $(`[data-draft-target="${lane}"]`)?.focus({preventScroll:true});
  }else{
    const button=[...document.querySelectorAll("[data-priority]")].find(b=>b.dataset.priority===name&&b.dataset.lane===lane);
    button?.focus({preventScroll:true});
  }
}
function removeChampion(name,lane){
  const c=cur();
  c.lanes[lane]=c.lanes[lane].filter(champion=>champion!==name);
  touch();save();renderEditor();renderList();renderGrid();
  $(`[data-draft-target="${lane}"]`)?.focus({preventScroll:true});
}
$("#editor").addEventListener("click",e=>{
  if(e.target.closest("[data-picker]")){ openPicker(); return }
  const priority=e.target.closest("[data-priority]");
  if(priority){reorderChampion(priority.dataset.priority,priority.dataset.lane);return}
  const rm=e.target.closest("[data-rm]");
  if(rm){removeChampion(rm.dataset.rm,rm.closest("[data-l]").dataset.l);return}

  const sideButton=e.target.closest("button[data-side]");
  if(sideButton){
    const side=sideButton.dataset.side;
    const group=sideButton.closest(".dside") ? ".dside" : ".dz-names";
    draftOf(cur()).side=side;
    touch();save();renderEditor();renderList();
    $(`${group} button[data-side="${side}"]`)?.focus({preventScroll:true});
    return;
  }
  const target=e.target.closest("[data-draft-target]");
  if(target){
    active=target.dataset.draftTarget;
    renderEditor();
    $(`[data-draft-target="${active}"]`).focus({preventScroll:true});
    return;
  }
  if(e.target.closest("details,[data-team-control]")||["INPUT","TEXTAREA","SELECT","OPTION"].includes(e.target.tagName))return;
  const ln=e.target.closest("[data-l]");if(ln&&ln.dataset.l!==active){active=ln.dataset.l;renderEditor()}
});
// arrastar e soltar
let drag=null;
document.addEventListener("dragstart",e=>{const ch=e.target.closest(".chip,.ch,.dm,.tx-prio-champ");if(!ch)return;drag={n:ch.dataset.n,from:ch.dataset.from||null};e.dataTransfer.setData("text/plain",ch.dataset.n);e.dataTransfer.effectAllowed="move"});
$("#editor").addEventListener("dragover",e=>{const ln=e.target.closest("[data-l]");if(!ln||!drag)return;e.preventDefault();document.querySelectorAll(".drop").forEach(x=>x!==ln&&x.classList.remove("drop"));ln.classList.add("drop")});
$("#editor").addEventListener("dragleave",e=>{const ln=e.target.closest("[data-l]");if(ln&&!ln.contains(e.relatedTarget))ln.classList.remove("drop")});
$("#editor").addEventListener("drop",e=>{
  const ln=e.target.closest("[data-l]");if(!ln||!drag)return;e.preventDefault();
  const to=ln.dataset.l,c=cur(),n=drag.n;
  if(drag.from)c.lanes[drag.from]=c.lanes[drag.from].filter(x=>x!==n);
  const arr=c.lanes[to].filter(x=>x!==n);
  const over=e.target.closest(".chip,.dm,.tx-prio-champ");let idx=ln.dataset.bi!=null?Math.min(+ln.dataset.bi,arr.length):arr.length;
  if(over&&over.dataset.n!==n&&ln.dataset.bi==null){idx=arr.indexOf(over.dataset.n);const r=over.getBoundingClientRect();if(e.clientX>r.left+r.width/2)idx++}
  arr.splice(idx,0,n);c.lanes[to]=arr;drag=null;active=to;touch();save();renderEditor();renderList();renderGrid();
});
document.addEventListener("dragend",()=>{drag=null;document.querySelectorAll(".drop").forEach(x=>x.classList.remove("drop"))});

/* ===== Visão de draft (ordem de picks e bans) ===== */
/* ===== Grade de campeões ===== */
let role="all";
const ROLEBTN=[{k:"all",n:"Todos"},...LANES.filter(l=>l.k!=="ban")];
$("#roles").innerHTML=ROLEBTN.map(({k,n})=>`<button data-slot="button" data-variant="ghost" data-size="sm" data-r="${k}" aria-pressed="${k==="all"}" class="${k==="all"?"on":""}"><span class="lane-label">${laneIconMarkup(k)}${n}</span></button>`).join("");
$("#roles").onclick=e=>{const b=e.target.closest("button");if(!b)return;role=b.dataset.r;document.querySelectorAll("#roles button").forEach(x=>{x.classList.toggle("on",x===b);x.setAttribute("aria-pressed",String(x===b))});resetGrid()};
const resetGrid=()=>{renderGrid();$("#grid").scrollTop=0};$("#search").oninput=resetGrid;$("#sort").onchange=resetGrid;
function renderTarget(){
  const c=cur();
  $("#grid").querySelectorAll(".ch").forEach(button => button.setAttribute("aria-pressed", c.lanes[active].includes(button.dataset.n)));
  // A lane de destino fica ao lado de "Ordenar por"; o quadro de destino acima saiu.
  const draft=S.view==="draft",d=draftOf(c),us=d.side[0].toUpperCase();
  const label=pos=>draft&&pos.k!=="ban"?`${PICKNAME[us+(d.order[d.side].indexOf(pos.k)+1)]} · ${pos.n}`:pos.n;
  $("#target").replaceChildren();$("#target").hidden=true;
  const slot=$("#lane-target-slot");
  clearTeamControls(slot);
  slot.innerHTML=`<select id="pick-target" data-team-select="lane" aria-labelledby="lane-target-label">${LANES.map(pos=>`<option value="${pos.k}" ${pos.k===active?"selected":""}>${label(pos)}</option>`).join("")}</select>`;
  mountTeamSelect($("#pick-target"));
}
$("#lane-target-slot").addEventListener("change",e=>{if(e.target.id!=="pick-target")return;active=e.target.value;renderEditor();requestAnimationFrame(()=>$("#pick-target-trigger")?.focus({preventScroll:true}))});
function renderGrid(){
  const q=$("#search").value.toLowerCase().replace(/[^a-z]/g,""),c=cur(),srt=$("#sort").value;
  const where={};for(const l of LANES)for(const n of c.lanes[l.k])(where[n]=where[n]||[]).push(l);
  let L=CH.filter(ch=>(!q||ch.n.toLowerCase().replace(/[^a-z]/g,"").includes(q))&&(role==="all"||ch.r.includes(role)));
  if(srt==="ws")L.sort((a,b)=>((WS.c[b.n]||[0])[0]-(WS.c[a.n]||[0])[0])||a.n.localeCompare(b.n));
  else if(srt==="wsb")L.sort((a,b)=>((WS.c[b.n]||[0,0,0])[2]-(WS.c[a.n]||[0,0,0])[2])||a.n.localeCompare(b.n));
  else L.sort((a,b)=>a.n.localeCompare(b.n));
  $("#grid").innerHTML=L.map(ch=>{const w=WS.c[ch.n],wh=where[ch.n];
    return `<button class="ch${wh?" in":""}" aria-pressed="${c.lanes[active].includes(ch.n)}" draggable="true" data-n="${esc(ch.n)}" aria-label="${esc(ch.n)}">${img(ch.n)}
      ${wh?`<span class="tag" style="--lc:var(${wh[0].c})">${wh.map(l=>l.n.slice(0,3).toUpperCase()).join("/")}</span>`:""}
      ${srt!=="az"&&w?`<span class="ws">${srt==="ws"?w[0]:w[2]}</span>`:""}
      <span class="nm">${esc(ch.n)}</span></button>`}).join("")||'<p class="composition-empty" role="status">Nenhum campeão encontrado.</p>';
  $("#gfoot").textContent="";
}
$("#grid").onclick=e=>{
  const ch=e.target.closest(".ch");if(!ch)return;const n=ch.dataset.n,c=cur(),a=c.lanes[active];
  if(a.includes(n))c.lanes[active]=a.filter(x=>x!==n);else a.push(n);
  touch();save();renderEditor();renderList();renderGrid();
  [...$("#grid").querySelectorAll(".ch")].find(button=>button.dataset.n===n)?.focus({preventScroll:true});
};


let closePicker;
const picker = $("#champ-picker");
function openPicker() {
  if (closePicker) return;
  closePicker = showDialog({
    title: "Campeões", children: picker, id: "picker-dialog", className: "wl-picker-dialog wl-panel",
    initialFocus: () => $("#search"),
    onClose: () => {
      closePicker = undefined;
      $("#comps").append(picker);
      placePicker();
      document.querySelector("[data-picker]")?.focus({ preventScroll: true });
    },
  });
}
$("#close-picker").onclick = () => closePicker?.();
// Na ordem do draft em tela larga, o catálogo fica no centro, entre os dois lados.
function placePicker(){
  const catalog = picker;
  if (closePicker) return;
  const slot=document.querySelector("#editor .dz-slot");
  if(slot&&window.matchMedia("(min-width: 1100px)").matches){if(catalog.parentElement!==slot)slot.append(catalog)}
  else if(catalog.parentElement!==$("#comps"))$("#comps").append(catalog);
}
window.matchMedia("(min-width: 1100px)").addEventListener("change",()=>placePicker());
/* ===== Táticas salvas ===== */
let tacticQuery = "";
const tacticPanel = () => S.tacticsPanel === "lane" || S.tacticsPanel === "priority" ? "lane" : "draft";
// "Salvar tática" copia os picks e o texto da comp (ou o texto geral) para uma tática própria; "Nova tática" começa vazia.
async function createTactic(source, copyText = false) {
  const text = copyText ? readTactic(S, source ? source.id : null) : "";
  const images = copyText ? readTacticImages(S, source ? source.id : null) : [];
  const suggested = source ? `Tática · ${source.name}` : copyText ? "Tática geral" : "Nova tática";
  const name = (await askName("Nome da tática", suggested, "Nome da tática"))?.trim();
  if (!name) return;
  const item = createSavedTactic(source, uid(), name, Date.now());
  S.comps.unshift(item);
  if (text.trim() || images.length) writeTactic(S, item.id, item.name, text, Date.now(), images);
  S.tacticsGeneral = false;
  S.cur = item.id;
  active = tacticPanel() === "draft" ? draftOf(item).order[draftOf(item).side][0] : "top";
  save(); renderAll(); publishTeamRoute("comps");
  toast(copyText ? `Tática "${name}" salva` : `Tática "${name}" criada`);
  $("#editor .tx-tabs [aria-pressed=true]")?.focus({ preventScroll: true });
}
async function deleteTactic() {
  const item = cur();
  if (!isSavedTactic(item) || !await confirmAction(`Excluir a tática "${item.name}"?`, "Excluir tática")) return;
  writeTactic(S, item.id, item.name, "", Date.now(), []);
  S.comps = S.comps.filter(x => x.id !== item.id);
  if (!S.comps.some(x => !isSavedTactic(x))) S.comps.push(blank());
  S.cur = (S.comps.find(x => !isSavedTactic(x)) || S.comps[0]).id;
  save(); renderAll(); publishTeamRoute("comps");
  $("#editor [data-tactic-new]")?.focus({ preventScroll: true });
}
function toggleTacticChampion(name) {
  const c = cur(), list = c.lanes[active];
  if (!isSavedTactic(c)) return;
  if (list.includes(name)) c.lanes[active] = list.filter(x => x !== name);
  else if (active !== "ban" || list.length < 5) list.push(name);
  else { toast("Os 5 bans já estão preenchidos"); return; }
  touch(); save(); renderEditor(); renderList();
  $(`#editor [data-tactic-champ="${CSS.escape(name)}"]`)?.focus({ preventScroll: true });
}
// Botão direito no OP.GG troca o link; sem link, o clique esquerdo também pede.
async function editOpggLink() {
  const item=cur(),value=await askName("Link do OP.GG do time",tacticOpggOf(item),"Endereço (deixe vazio para remover)");
  if (value===undefined) return;
  const link=normalizeOpggLink(value);
  if (link===null) { toast("Link inválido. Cole o endereço completo do OP.GG."); return; }
  setTacticOpgg(item,link);touch();save();renderEditor();
  toast(link?"Link do OP.GG salvo":"Link do OP.GG removido");
  $("#editor [data-tactic-opgg]")?.focus({ preventScroll: true });
}
$("#editor").addEventListener("contextmenu", e => {
  if (!e.target.closest("[data-tactic-opgg]")) return;
  e.preventDefault();
  void editOpggLink();
});
/* ===== Prints das táticas ===== */
// O app principal guarda cada print à parte (window.weblolImages); aberto sozinho, fica só neste navegador.
const localImages = {
  async save(data) { const id = "local-" + uid(); try { localStorage.setItem("lol-img-" + id, data) } catch {} return { id, shared: false } },
  async load(id) { try { return localStorage.getItem("lol-img-" + id) } catch { return null } },
};
const printStore = () => { try { return (window.parent as any)?.weblolImages || localImages } catch { return localImages } };
const tacticKey = () => S.tacticsGeneral ? null : cur().id;
function loadPrintThumbnails(root) {
  root.querySelectorAll("img[data-print-src]").forEach(image => {
    void printStore().load(image.dataset.printSrc).then(data => {
      if (data) image.src = data;
      else image.closest(".tx-print")?.classList.add("missing");
    });
  });
}
async function addPrints(files) {
  const images = [...files].filter(file => file.type.startsWith("image/"));
  if (!images.length) return;
  const key = tacticKey(), name = cur().name, ids = [];
  let localOnly = false, failed = "";
  for (const file of images) {
    try {
      const result = await printStore().save(await compressImage(file));
      ids.push(result.id);
      if (!result.shared) localOnly = true;
      if (result.error) failed = result.error;
    } catch (error) { failed = error.message || "erro"; }
  }
  if (!ids.length) { toast(`Não consegui adicionar o print (${failed}).`); return; }
  writeTactic(S, key, name, readTactic(S, key), Date.now(), [...readTacticImages(S, key), ...ids]);
  save(); renderEditor();
  toast(failed ? "O print ficou só neste navegador: não consegui enviá-lo ao time." : localOnly ? "Print salvo neste navegador." : ids.length > 1 ? `${ids.length} prints adicionados` : "Print adicionado");
}
function removePrint(id) {
  const key = tacticKey();
  writeTactic(S, key, cur().name, readTactic(S, key), Date.now(), readTacticImages(S, key).filter(x => x !== id));
  save(); renderEditor();
  $("#tx-print-file")?.closest("label")?.focus?.({ preventScroll: true });
}
async function openPrint(id) {
  const data = await printStore().load(id);
  if (!data) { toast("Este print não está disponível neste navegador."); return; }
  const image = document.createElement("img");
  image.src = data; image.alt = "Print da tática"; image.className = "tx-print-full";
  showDialog({ title: "Print da tática", children: image, className: "wl-panel tx-print-dialog" });
}
$("#editor").addEventListener("change", e => { if (e.target.id === "tx-print-file") { void addPrints(e.target.files); e.target.value = ""; } });
$("#editor").addEventListener("paste", e => {
  if (e.target.id !== "tactics-text") return;
  const files = [...(e.clipboardData?.files || [])].filter(file => file.type.startsWith("image/"));
  if (!files.length) return;
  e.preventDefault();
  void addPrints(files);
});
$("#editor").addEventListener("dragover", e => { if (e.target.id === "tactics-text" && e.dataTransfer?.types.includes("Files")) e.preventDefault(); });
$("#editor").addEventListener("drop", e => {
  if (e.target.id !== "tactics-text" || !e.dataTransfer?.files.length) return;
  e.preventDefault();
  void addPrints(e.dataTransfer.files);
});
$("#editor").addEventListener("input", e => {
  if (e.target.id !== "tx-search") return;
  tacticQuery = e.target.value;
  const grid = $("#editor .tx-grid");
  if (grid) grid.innerHTML = tacticGridHTML(cur(), { champions: CH, query: tacticQuery, active, LN, img, esc });
});
$("#editor").addEventListener("click",e=>{
  const panelButton=e.target.closest("[data-tactic-panel]");
  if (panelButton) {
    if (S.tacticsPanel !== panelButton.dataset.tacticPanel) {
      S.tacticsPanel = panelButton.dataset.tacticPanel;
      save(); renderEditor();
      $(`#editor [data-tactic-panel="${S.tacticsPanel}"]`)?.focus({ preventScroll: true });
    }
    return;
  }
  const printOpen=e.target.closest("[data-print-open]");
  if (printOpen) { void openPrint(printOpen.dataset.printOpen); return; }
  const printRemove=e.target.closest("[data-print-remove]");
  if (printRemove) { removePrint(printRemove.dataset.printRemove); return; }
  const teamButton=e.target.closest("[data-tactic-team]");
  if (teamButton) {
    setTacticTeam(cur(),teamButton.dataset.tacticTeam);touch();save();renderEditor();
    $(`#editor [data-tactic-team="${teamButton.dataset.tacticTeam}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (e.target.closest("[data-tactic-opgg]")) {
    const link=tacticOpggOf(cur());
    if (link) window.open(link,"_blank","noopener");
    else void editOpggLink();
    return;
  }
  const viewToggle=e.target.closest("[data-tactic-view]");
  if (viewToggle) {
    const c=cur(),panel=viewToggle.dataset.tacticView,on=viewToggle.getAttribute("aria-checked")!=="true";
    setTacticView(c,panel,on);touch();save();renderEditor();renderList();
    $(`#editor [data-tactic-view="${panel}"]`)?.focus({ preventScroll: true });
    toast(on?`Tática aparece em ${panel==="lane"?"Opções por posição":"Ordem do draft"}`:`Tática saiu de ${panel==="lane"?"Opções por posição":"Ordem do draft"}`);
    return;
  }
  const champ=e.target.closest("[data-tactic-champ]");
  if (champ) { toggleTacticChampion(champ.dataset.tacticChamp); return; }
  if (e.target.closest("[data-tactic-new]")) { void createTactic(null); return; }
  if (e.target.closest("[data-tactic-save]")) { void createTactic(S.tacticsGeneral ? null : cur(), true); return; }
  if (e.target.closest("[data-tactic-delete]")) { void deleteTactic(); return; }
  const tacticTab=e.target.closest("[data-tactic-comp],[data-tactic-general]");
  if (tacticTab) {
    const general=tacticTab.hasAttribute("data-tactic-general"),id=tacticTab.dataset.tacticComp;
    if (general===!!S.tacticsGeneral && (general || id===S.cur)) return;
    S.tacticsGeneral=general;
    if (general) { save(); renderEditor(); }
    else if (id!==S.cur) selectComp(id);
    else { save(); renderEditor(); renderList(); }
    $("#editor .tx-tabs [aria-pressed=true]")?.focus({ preventScroll: true });
    return;
  }
  const tab=e.target.closest("[data-comp-tab]");
  if (tab) {
    if (tab.dataset.compTab !== S.cur) {
      selectComp(tab.dataset.compTab);
      $('#editor [data-comp-tab][aria-pressed=true]')?.focus({ preventScroll: true });
    }
    return;
  }
  if(e.target.closest("[data-comp-new]"))$("#new").click();
});
window.matchMedia("(min-width: 1100px)").addEventListener("change",e=>{if(e.matches)closePicker?.()});

/* ===== Exportar / Importar ===== */
function downloadTeamBackup(){
  const blob=new Blob([JSON.stringify({app:"lol-comps-time",version:1,exported:new Date().toISOString(),comps:S.comps,plays:S.plays},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`comps-time-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$("#exp").onclick = downloadTeamBackup;
$("#impb").onclick=()=>$("#imp").click();
$("#imp").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const d=JSON.parse(await f.text());const comps=d.comps||d;if(!Array.isArray(comps))throw 0;
    if (!comps.length) throw new Error("Arquivo sem composições");
    const choice = await askChoice("Importar composições", `O arquivo contém ${comps.length} composições. Escolha o que fazer com os dados atuais.`, [
      { value: "merge", label: "Juntar" },
      { value: "replace", label: "Substituir", destructive: true },
    ]);
    if (!choice) return;
    const replace = choice === "replace";
    const clean=comps.map(c=>{const b=blank(c.name);b.notes=c.notes||"";b.laneNotes=c.laneNotes||{};if(c.draft)b.draft=c.draft;b.updated=c.updated||Date.now();for(const l of LANES)b.lanes[l.k]=Array.isArray(c.lanes?.[l.k])?c.lanes[l.k].map(String):[];b.id=replace?(c.id||b.id):b.id;return b});
    S.comps=replace?clean:[...clean,...S.comps];S.cur=S.comps[0].id;
    if(Array.isArray(d.plays)){const ps=d.plays.filter(p=>p&&p.live&&Array.isArray(p.steps)).map(p=>({...p,id:replace?(p.id||uid()):uid()}));S.plays=replace?ps:[...plays(),...ps];plays()}
    if (currentTeamView === "map") tacticalMap.renderPlays();
    if (currentTeamView === "comps") renderAll();
    save();publishTeamRoute(currentTeamView);toast(`${clean.length} comp(s) importada(s)`);
  }catch{toast("Arquivo inválido. Use um .json exportado por esta página.")}
  finally { e.target.value=""; }
};

/* ===== Abas ===== */
const teamPages = {comps:"composicoes", map:"mapa", know:"conhecimento", cap:"gestao"};
const guides = {obj:"objetivos", wave:"wave"};
let currentTeamView = "comps";
let routeRequest = 0;
let tacticalMap;
let renderKnow;
let compositionsMounted = false;
const usesParentNavigation = window.frameElement?.id === "v-camp";
document.body.toggleAttribute("data-parent-navigation", usesParentNavigation);
const renderTeamNavigation = usesParentNavigation ? () => {} : mountTeamNavigation($("#team-navigation"), handleTeamNavigation);

function handleTeamNavigation(view) {
  void openTeamView(view).then(opened => {
    if (opened) publishTeamRoute(view, {includeItem:false});
  });
}

function showTeamView(view) {
  currentTeamView = view;
  $("#team-files").open = false;
  const filesSlot = view === "map" ? "#map-file-slot" : usesParentNavigation ? "#team-files-" + view : "#team-file-slot";
  $(filesSlot).append($("#team-files"));
  renderTeamNavigation(view, hasCaptainAccess());
  document.querySelectorAll(".view").forEach(section=>section.classList.toggle("on",section.id==="v-"+view));
  if (view === "comps") {
    if (!compositionsMounted) {
      mountTeamSelect($("#sort"));
      compositionsMounted = true;
    }
    renderAll();
  }
  if(view==="map")tacticalMap.renderPlays();
  if(view==="cap")renderCaptain();
}

function publishTeamRoute(view, {includeItem = true, onCopy = undefined} = {}) {
  $("#route-note").hidden=true;
  let path="/time/"+teamPages[view];
  if(view==="know")path+="/"+(guides[S.kTab]||guides.obj);
  if(includeItem && view==="comps")path+="/"+encodeURIComponent(S.cur)+"?modo="+(S.view==="draft"?"draft":S.view==="tactics"?"taticas":"lane");
  if(includeItem && view==="map")path+="/"+encodeURIComponent(S.curPlay);
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:navigate",{detail:{path, onCopy}}));
}

/* ===== Gestão do time (todo o time vê; só o capitão e admins agem; os dados vêm do app principal) ===== */
const host = window.parent as any;
let wantCaptain = false; // link para a gestão aberto antes de o time carregar
const hasCaptainAccess = () => { try { return !!host?.captainAccess?.(); } catch { return false; } };
function renderCaptain() {
  const name = (() => { try { return host.TEAM_NAME?.() || ""; } catch { return ""; } })();
  const manage = (() => { try { return !!host.canManageTeam?.(); } catch { return false; } })();
  if (name) $("#cap-sub").textContent = manage ? `${name}: aceite pedidos, gerencie os jogadores e veja o histórico das comps do time.` : `${name}: jogadores do time e histórico das comps.`;
  host?.renderCaptainPanel?.($("#cap"));
}
(window as any).weblolTeamChanged = () => {
  const ok = hasCaptainAccess();
  renderTeamNavigation(currentTeamView, ok);
  if (ok && wantCaptain) { wantCaptain = false; void openTeamView("cap"); return; }
  if ($("#v-cap").classList.contains("on")) {
    if (ok) renderCaptain();
    else { handleTeamNavigation("comps"); }
  }
};
window.applyWebLolRoute = ([page, item], params) => {
  const view=Object.keys(teamPages).find(key=>teamPages[key]===page)||"comps";
  return openTeamView(view, item, params);
};

async function openTeamView(view, item, params) {
  const request = ++routeRequest;
  wantCaptain=false;
  if(view==="cap"&&!hasCaptainAccess()){view="comps";wantCaptain=true}
  const note = $("#route-note");
  if ((view === "map" && !tacticalMap) || (view === "know" && !renderKnow)) {
    note.textContent = "Carregando esta seção…";
    note.hidden = false;
    try {
      if (view === "map") {
        const { mountTacticalMap } = await import("@/widgets/tactical-map");
        if (request !== routeRequest) return false;
        tacticalMap = mountTacticalMap({
          getState, save, publishTeamRoute, toast, uid, img, esc, compositionPreview,
          mountTeamSelect, mountMapEmpty, mountMapSwitch, mountToolGroup, mountSectionTabs, clearTeamControls,
        });
      } else {
        const { mountKnowledge } = await import("@/widgets/team-knowledge");
        if (request !== routeRequest) return false;
        renderKnow = mountKnowledge({ getState, save, publishTeamRoute, mountSectionTabs });
      }
    } catch {
      if (request === routeRequest) note.textContent = "Não foi possível carregar esta seção. Recarregue a página para tentar novamente.";
      return false;
    }
  }
  let missing="";
  const matches=entry=>encodeURIComponent(entry.id)===item;
  if(view==="comps"){
    if(item){
      const comp=S.comps.find(matches);
      if(comp){S.cur=comp.id;$("#csearch").value=""}
      else missing="A composição deste link não está disponível neste navegador. Conecte a pasta do time para carregar a versão oficial.";
    }
    const mode=params?.get("modo");
    if(mode==="draft"||mode==="lane"||mode==="taticas")S.view=mode==="draft"?"draft":mode==="taticas"?"tactics":"lanes";
  } else if(view==="map" && item){
    const selected=plays().find(matches);
    if(selected) tacticalMap.selectPlay(selected.id);
    if(!selected)missing="A jogada deste link não está disponível neste navegador. Conecte a pasta do time para carregar a versão oficial.";
  } else if(view==="know"){
    if(item)S.kTab=item==="wave"?"wave":"obj";
    renderKnow();
  }
  note.textContent=missing;
  note.hidden=!missing;
  showTeamView(view);
  return true;
}

function wireCopyButton(button: HTMLButtonElement, view: "comps" | "map") {
  const icon = button.querySelector("use");
  const original = icon.getAttribute("href");
  let request = 0;
  let resetTimer: number;
  const reset = () => {
    icon.setAttribute("href", original);
    button.removeAttribute("data-link-copied");
  };
  button.onclick = () => {
    const attempt = ++request;
    clearTimeout(resetTimer);
    reset();
    publishTeamRoute(view, { onCopy: () => {
      if (attempt !== request) return;
      icon.setAttribute("href", "assets/icons.svg#check");
      button.setAttribute("data-link-copied", "");
      resetTimer = window.setTimeout(reset, 1600);
    } });
  };
}
wireCopyButton($("#copy-comp"), "comps");
wireCopyButton($("#copy-play"), "map");

/* ===== Início ===== */
S = loadTeamState();
ensureTactics(S);
function renderAll(){keepCompositionForView();renderList();renderEditor();renderGrid()}
plays();
if (!usesParentNavigation) void openTeamView("comps");
