// @ts-nocheck -- O editor legado ainda depende de estado dinâmico vindo do armazenamento local.
import { askChoice, askName, confirmAction, showDialog } from "@/shared/ui/dialog-controls"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { lolAsset, lolChampion, lolImage } from "@/entities/champion"
import { clearTeamControls, mountChampionMenu, mountCompositionMenu, mountDraftChampionMenu, mountLaneNote, mountMapEmpty, mountMapImageSwitch, mountTeamSelect, mountSectionTabs, mountToolGroup } from "./team-controls"
import { initializeTheme } from "@/shared/config/theme"
import { initializeMotionNav, revealContent } from "@/shared/lib/motion"

import { CH } from "../model/champion-catalog"
import WS from "../api/worlds-champion-stats.json"
import { KEY, uid, blank, loadTeamState } from "../model/local-state"
import { DRAFT_SIDE, PICKNAME, compositionPreview, draftHTML, draftOf, sideDot } from "./draft"
import { mountKnowledge } from "@/widgets/team-knowledge"
import { mountTacticalMap } from "@/widgets/tactical-map"

initializeTheme()
initializeMotionNav("header nav")

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
      localStorage.setItem(KEY, JSON.stringify({
        comps, plays, view: S.view,
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
  const matches=S.comps.filter(c=>!q||c.name.toLowerCase().includes(q)||Object.values(c.lanes).flat().some(n=>n.toLowerCase().includes(q)));
  const selected=cur();
  $("#draft-comp").innerHTML=[selected,...matches.filter(c=>c!==selected)]
    .map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  const list=$("#clist");
  clearTeamControls(list);
  list.innerHTML=matches
   .map(c=>{const firsts=compositionPreview(c);
     return `<div class="composition-item"><button class="ci${c.id===S.cur?" on":""}" aria-pressed="${c.id===S.cur}" data-id="${c.id}"><b>${sideDot(c)}${esc(c.name)}</b>
      <span class="mini">${firsts.map(img).join("")||'<small style="color:var(--mut)">vazia</small>'}</span></button><span class="composition-menu" data-team-control></span></div>`}).join("")||'<div style="color:var(--mut);padding:10px;font-size:12px">Nenhuma comp.</div>';
  list.querySelectorAll(".composition-menu").forEach((host,index)=>{
    const {id,name}=matches[index];
    mountCompositionMenu(host,name,()=>{
      duplicateComp(id);
      $("#clist .ci.on")?.focus({preventScroll:true});
    },async()=>{
      if(await deleteComp(id)) ($("#clist .ci.on")||$("#clist .ci")||$("#new")).focus({preventScroll:true});
    });
  });
}
function selectComp(id){S.cur=id;save(false);renderAll();publishTeamRoute("comps")}
$("#clist").onclick=e=>{const it=e.target.closest(".ci");if(it)selectComp(it.dataset.id)};
$("#draft-comp").onchange=e=>selectComp(e.target.value);
$("#csearch").oninput=renderList;
$("#new").onclick=()=>{const c=blank("Comp "+(S.comps.length+1));S.comps.unshift(c);S.cur=c.id;active="top";save();renderAll();publishTeamRoute("comps");setTimeout(()=>{$("#cname").focus();$("#cname").select()},0)};
function duplicateComp(id){const c=JSON.parse(JSON.stringify(S.comps.find(c=>c.id===id)));c.id=uid();c.name+=" (cópia)";c.updated=Date.now();S.comps.unshift(c);S.cur=c.id;save();renderAll();publishTeamRoute("comps")};
async function deleteComp(id){const c=S.comps.find(c=>c.id===id);if(!c || !await confirmAction(`Excluir a comp "${c.name}"?`, "Excluir composição"))return false;S.comps=S.comps.filter(x=>x.id!==c.id);if(!S.comps.length)S.comps.push(blank());if(!S.comps.some(x=>x.id===S.cur))S.cur=S.comps[0].id;save();renderAll();publishTeamRoute("comps");return true};

/* ===== Editor ===== */
function optionHTML(n,l,i){
  return `<div class="chip ${i===0?"primary":"alternative"}" draggable="true" data-n="${esc(n)}" data-from="${l}">
    <button class="champ-priority" data-priority="${esc(n)}" data-lane="${l}" aria-label="Priorizar ${esc(n)} em ${LN[l].n}" title="${i+1}ª opção · tornar principal">${img(n)}${i===0?`<span><small>Principal</small><b>${esc(n)}</b></span>`:""}</button>
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

// Destaca o "Anotações da composição" recolhido quando há algo escrito
function hasCompNotes(c,dv){const d=draftOf(c);return !!((c.notes||"").trim()||(dv&&(d.note[d.side]||"").trim()))}
const markCompNotes=()=>$("#composition-notes")?.classList.toggle("has-notes",hasCompNotes(cur(),S.view==="draft"));
function renderEditor(){
  const previousComposition = $("#editor").dataset.motionComposition;
  const c=cur(),dv=S.view==="draft";
  const notesOpen=$("#composition-notes")?.open;
  $("#v-comps").classList.toggle("draft-view",dv);
  $("#draft-comp").hidden=true;
  const notes=`<details id="composition-notes" ${notesOpen?"open":""} class="${hasCompNotes(c,dv)?"has-notes":""}"><summary>Anotações da composição<span class="notes-flag" aria-label="tem anotação" title="Esta comp tem anotação">${iconMarkup("edit")}</span></summary><label class="control-label" for="notes">Plano geral</label><textarea id="notes" placeholder="Plano de jogo, condição de vitória…">${esc(c.notes)}</textarea>${dv?`<label class="control-label" for="dnote">Plano do draft · ${DRAFT_SIDE[draftOf(c).side]}</label><textarea id="dnote">${esc(draftOf(c).note[draftOf(c).side])}</textarea><ul id="notes-lanes" class="draft-lane-notes" aria-label="Observações por posição" hidden></ul>`:""}</details>`;
  const editor = $("#editor");
  $("#cname").value = c.name;
  mountSectionTabs($(".editor-controls .vtog"), "Modo da composição", S.view || "lanes", [
    { value: "lanes", label: "Opções por posição", panel: "composition-panel" },
    { value: "draft", label: "Ordem do draft", panel: "composition-panel" },
  ], value => {
    S.view = value;
    save(false);
    renderEditor();
    renderList();
    publishTeamRoute("comps");
  }, "navigation");
  const catalog=$("#champ-picker"),gridScroll=$("#grid").scrollTop;
  if (editor.contains(catalog)) $("#comps").append(catalog);
  clearTeamControls(editor);
  editor.replaceChildren();
  editor.insertAdjacentHTML("beforeend", `
  <div id="composition-panel" role="tabpanel" aria-labelledby="tab-${dv ? "draft" : "lanes"}">
  ${notes}<button data-slot="button" data-variant="default" type="button" class="jump-picker" data-picker>${iconMarkup("plus")} Adicionar campeão</button>
  ${dv?draftHTML(c, { active, compositions: S.comps, LN, img, esc, pickArt }):LANES.map(l=>`<div class="lane${active===l.k?" act":""}${l.k==="ban"?" ban-strip":""}" data-l="${l.k}" style="--lc:var(${l.c})">
  ${l.k==="ban"?"":pickArt(c.lanes[l.k][0])}
  <button class="ln lane-label" data-draft-target="${l.k}" aria-pressed="${active===l.k}">${laneIconMarkup(l.k)}${l.n}</button>
  <div class="chips">${c.lanes[l.k].map((n,i)=>optionHTML(n,l.k,i)).join("")||'<span class="empty">Adicionar campeão</span>'}</div>
<span class="lane-note" data-team-control data-note-lane="${l.k}"></span></div>`).join("")}
  <p class="help">${dv?"Clique no retrato para torná-lo principal, arraste para reordenar e use o botão direito para excluir.":"Clique no retrato para priorizar. Arraste para reordenar ou use o menu ⋯ de cada campeão."}</p></div>`);
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
      touch();save();
    });
  });
  editor.querySelectorAll("select[data-pick-position]").forEach(mountTeamSelect);
  renderDraftLaneNotes(c);
  placePicker();
  $("#grid").scrollTop=gridScroll;
  renderTarget();
  editor.dataset.motionComposition = c.id;
  if (previousComposition !== c.id) revealContent(editor);
}
const touch=()=>{cur().updated=Date.now()};
$("#v-comps").addEventListener("input",e=>{
  const c=cur();
  if(e.target.id==="cname"){c.name=e.target.value;touch();save();renderList()}
  else if(e.target.id==="notes"){c.notes=e.target.value;touch();save();markCompNotes()}
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

  const sb=e.target.closest("[data-side]");if(sb){draftOf(cur()).side=sb.dataset.side;touch();save();renderEditor();renderList();$(`[data-side="${sb.dataset.side}"]`).focus({preventScroll:true});return}
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
      <span class="nm">${esc(ch.n)}</span></button>`}).join("")||'<div style="color:var(--mut)">Nenhum campeão encontrado.</div>';
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
$("#editor").addEventListener("click",e=>{
  const tab=e.target.closest("[data-comp-tab]");
  if(tab){if(tab.dataset.compTab!==S.cur)selectComp(tab.dataset.compTab);return}
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
    renderPlays();save();renderAll();publishTeamRoute($("nav [aria-pressed=true]")?.dataset.v || "comps");toast(`${clean.length} comp(s) importada(s)`);
  }catch{toast("Arquivo inválido. Use um .json exportado por esta página.")}
  finally { e.target.value=""; }
};

/* ===== Abas ===== */
const teamPages = {comps:"composicoes", map:"mapa", know:"conhecimento", cap:"gestao"};
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
  if(view==="cap")renderCaptain();
}

function publishTeamRoute(view, {includeItem = true, copy = false} = {}) {
  $("#route-note").hidden=true;
  let path="/time/"+teamPages[view];
  if(view==="know")path+="/"+(guides[S.kTab]||guides.obj);
  if(includeItem && view==="comps")path+="/"+encodeURIComponent(S.cur)+"?modo="+(S.view==="draft"?"draft":"lane");
  if(includeItem && view==="map")path+="/"+encodeURIComponent(S.curPlay);
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:navigate",{detail:{path, copy}}));
}

/* ===== Gestão do time (todo o time vê; só o capitão e admins agem; os dados vêm do app principal) ===== */
const host = window.parent as any;
const captainTab = $('header nav [data-v="cap"]');
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
  captainTab.hidden = !ok;
  if (ok && wantCaptain) { wantCaptain = false; showTeamView("cap"); return; }
  if ($("#v-cap").classList.contains("on")) {
    if (ok) renderCaptain();
    else { showTeamView("comps"); publishTeamRoute("comps", {includeItem:false}); }
  }
};
captainTab.hidden = !hasCaptainAccess();

window.applyWebLolRoute = ([page, item], params) => {
  let view=Object.keys(teamPages).find(key=>teamPages[key]===page)||"comps";
  wantCaptain=false;
  if(view==="cap"&&!hasCaptainAccess()){view="comps";wantCaptain=true}
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
    if(selected) selectPlay(selected.id);
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

/* ===== Início ===== */
const getState = () => S;
const renderKnow = mountKnowledge({ getState, save, publishTeamRoute, mountSectionTabs });
const { plays, renderPlays, renderMapImageSwitch, setMapImg, selectPlay } = mountTacticalMap({
  getState, save, publishTeamRoute, toast, uid, img, esc,
  mountTeamSelect, mountMapEmpty, mountMapImageSwitch, mountToolGroup, clearTeamControls,
});
function renderAll(){renderList();renderEditor();renderGrid()}
mountTeamSelect($("#sort"));
S = loadTeamState();plays();renderAll();renderKnow();renderMapImageSwitch();setMapImg();renderPlays();
