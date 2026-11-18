// @ts-nocheck -- Integração legada com o DOM e dados locais.
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { iconMarkup } from "@/shared/ui/icon"
import { TOKS, blankPlay, initialFrame, preset } from "../model/play"
import { readWards } from "../model/wards"
import { readWaves } from "../model/battlefield"
import { mountBattlefield } from "./battlefield-layer"
import { mountMapCamera } from "./map-camera"
import { mountMapCompositions } from "./map-compositions"
import { mountMapContextMenu } from "./map-context-menu"
import { mountMapCursorColor } from "./map-cursor-color"
import { hasArrowhead, mountMapDrawing } from "./map-drawing"
import { renderMapFallback } from "./map-fallback"
import { mapQuickTools, mountMapDisclosures, mountMapSidebar, mountMapTools, mountMapVision, waveToolSide } from "./map-tools"
import { mountChampionLayer } from "./champion-layer"
import { animatePieces } from "./frame-animation"
import { mountMapHistory } from "./map-history"
import { mountFaelightLayer } from "./faelight-layer"
import { mountWardLayer } from "./ward-layer"
import { mountMapPanel, mountStepPages } from "./map-panel"

export function mountTacticalMap({ getState, save, publishTeamRoute, toast, uid, img, esc, compositionPreview, mountTeamSelect, mountMapEmpty, mountMapSwitch, mountToolGroup, mountSectionTabs, clearTeamControls }) {
const $ = selector => document.querySelector(selector);
const clearMap = $("#map-clear-all");
const clearWaves = $("#map-clear-waves");
const clearStrokes = $("#map-clear-strokes");
const resetMap = $("#map-reset");
const initialPositions = initialFrame().pos;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let M={tool:"move",sel:-1,playing:false};
function plays(){if(!Array.isArray(getState().plays)||!getState().plays.length){getState().plays=[blankPlay(uid, "Jogada 1")];getState().curPlay=getState().plays[0].id}if(!getState().plays.some(p=>p.id===getState().curPlay))getState().curPlay=getState().plays[0].id;return getState().plays}
const play=()=>plays().find(p=>p.id===getState().curPlay);
const clone=o=>JSON.parse(JSON.stringify(o));
const snapshotFrame=({pos,lines,wards,waves,destroyedTowers})=>clone({pos,lines:lines??[],wards:readWards(wards),waves:readWaves(waves),destroyedTowers:Array.isArray(destroyedTowers)?destroyedTowers:[]});
const canChangeFrame=()=>!M.playing&&!M.transition;
const getPerspective = mountMapVision(() => {
  renderStat();
  battlefield.renderSight(visibleFrame());
});
const canEdit=canChangeFrame;
const visibleFrame=()=>M.frame??play().live;

renderMapFallback($("#schem"));
function setMapImg() {
  const image = $("#mapimg");
  const syncMapImage = () => {
    image.toggleAttribute("data-map-visible", getState().useImg !== false && image.complete && image.naturalWidth > 0);
    wardLayer.render();
    battlefield.render();
    battlefield.renderTowers();
  };
  if (getState().useImg !== false) {
    const source = "assets/lol/map/summoners-rift-realista.jpeg";
    image.onload = syncMapImage;
    image.onerror = syncMapImage;
    if (image.getAttribute("src") !== source) image.src = source;
  }
  syncMapImage();
}
function renderMapImageSwitch(){
  mountMapSwitch($("#map-image-control"),"Usar mapa realista",getState().useImg!==false,checked=>{
    getState().useImg=checked;
    save(false);
    setMapImg();
    renderMapImageSwitch();
  });
}

const map = $("#map");
const viewport = $("#map-viewport");
mountMapCursorColor($("#mapw"));
const camera = mountMapCamera(viewport, map, () => drawing.render(), () => canChangeFrame() ? M.tool : "hand", () => {
  wardLayer.closeEditor();
  contextMenu.close();
});
const pt = camera.point;
const champions = mountChampionLayer({
  map, read: () => visibleFrame().pos, write: pos => writeFrame({ pos }),
  preview: pos => battlefield.renderSight({ ...visibleFrame(), pos }),
  canMove: () => canChangeFrame() && M.tool === "move", point: pt, portrait: img,
  champion: (side, role) => getState().comps.find(comp => comp.id === (side === "b" ? play().cb : play().cr))?.lanes?.[role]?.[0],
});
const renderTokens = champions.render, placeTokens = champions.place;
const compositions = mountMapCompositions({
  read: () => getState().comps.map(comp => ({ id: comp.id, name: comp.name, champions: compositionPreview(comp) })),
  selected: side => side === "b" ? play().cb : play().cr,
  choose: (side, id) => {
    if (!canEdit()) return;
    play()[side === "b" ? "cb" : "cr"] = id;
    save(false);
    renderTokens();
  },
  portrait: img,
});
const drawing = mountMapDrawing({
  map, read: () => visibleFrame().lines ?? [], write: lines => commit({ lines }),
  canEdit, getTool: () => M.tool, point: pt, scale: camera.scale, update: updateClearMap,
});
const wardLayer = mountWardLayer({
  read: () => visibleFrame().wards, write: wards => commit({ wards }),
  getTool: () => M.tool, isPlaying: () => !canEdit(), pointFromEvent: pt, mountTeamSelect, onPlaced,
});
const battlefield = mountBattlefield({
  read: visibleFrame, write: commit, canEdit, getTool: () => M.tool, getPerspective,
  point: pt, wardScene: wardLayer.scene, uid, onPlaced,
});
const historyActions = [
  { label: "Desfazer", icon: "undo", button: $("#undo"), startsHistory: true },
  { label: "Refazer", icon: "redo", button: $("#redo") },
];
const contextMenu = mountMapContextMenu(map, viewport, event => {
  if (!canEdit()) return;
  return wardLayer.contextAction(event) ?? battlefield.contextAction(event, "wave") ??
    battlefield.contextAction(event, "tower") ?? (event instanceof MouseEvent ? drawing.contextAction(event) : undefined);
}, () => canEdit() ? [
  ...mapQuickTools.map(tool => ({
    label: tool.label, icon: tool.icon, selected: M.tool === tool.value,
    run: () => { if (M.tool !== tool.value) selectTool(tool.value, false) },
  })),
  ...historyActions.map(({ button, ...action }) => ({
    ...action, disabled: button.disabled, run: () => button.click(),
  })),
] : []);
const previewFaelights = mountFaelightLayer({
  getState, save: () => save(false), mountMapSwitch, onAvailabilityChange: refreshMap,
});
const zoomFields = ["#map-stroke-width", "#map-stroke-style"];
zoomFields.forEach(selector => mountTeamSelect($(selector)));
function renderTowerSwitch() {
  mountMapSwitch($("#map-tower-range-control"), "Alcance das torres", battlefield.showTowers, checked => {
    battlefield.toggleTowers(checked);
    renderTowerSwitch();
  });
}
renderTowerSwitch();
mountMapDisclosures();
mountMapSidebar($("#v-map"));
mountMapPanel(mountSectionTabs);
const syncStepPages = mountStepPages();

const renderToolControls = mountMapTools({
  map, canEdit, canMove: canChangeFrame, currentTool: () => M.tool, chooseColor: drawing.setColor, mountToolGroup,
  chooseTool: tool => selectTool(tool, true),
});
function selectTool(tool, focusCursor) {
  M.tool = tool;
  drawing.reset();
  wardLayer.clearSelection();
  contextMenu.close();
  drawMapTools(focusCursor);
  refreshMap();
  drawing.render();
}
function onPlaced() {
  selectTool("move", false);
  viewport.focus({ preventScroll: true });
}
function drawMapTools(focusCursor = false) {
  const tool = renderToolControls();
  champions.setInteractive(tool === "move");
  wardLayer.setTool(tool, focusCursor);
  previewFaelights.preview(tool === "ward");
  battlefield.setWavePreview(Boolean(waveToolSide(tool)), focusCursor);
}
function refreshMap() {
  contextMenu.close();
  placeTokens();
  wardLayer.render();
  battlefield.renderTowers();
  battlefield.render();
  updateClearMap();
}
function commit(changes) {
  if (canEdit()) writeFrame(changes);
}
function writeFrame(changes) {
  if (!canChangeFrame()) return;
  history.record();
  Object.assign(play().live, changes);
  save(false);
  syncStep();
  refreshMap();
  drawing.render();
}
function updateClearMap() {
  const { pos, lines, wards, waves, destroyedTowers } = play().live;
  const hasWaves = readWaves(waves).length > 0;
  const hasAnnotations = lines?.length || readWards(wards).length || hasWaves;
  $("#clr").disabled = !canEdit() || !lines?.some(hasArrowhead);
  clearStrokes.disabled = !canEdit() || !lines?.some(line => !hasArrowhead(line));
  clearWaves.disabled = !canEdit() || !hasWaves;
  clearMap.disabled = !canEdit() || !hasAnnotations;
  resetMap.disabled = !canChangeFrame() || (!hasAnnotations && !destroyedTowers?.length &&
    TOKS.every(id => initialPositions[id].every((axis, index) => axis === pos[id]?.[index])));
}
$("#clr").onclick=()=>{if(!$("#clr").disabled)commit({lines:play().live.lines.filter(line=>!hasArrowhead(line))})};
clearStrokes.onclick=()=>{if(!clearStrokes.disabled)commit({lines:play().live.lines.filter(hasArrowhead)})};
clearWaves.onclick=()=>{if(!clearWaves.disabled)commit({waves:[]})};
clearMap.onclick=()=>{if(!clearMap.disabled){drawing.reset();wardLayer.clearSelection();commit({lines:[],wards:[],waves:[]})}};
resetMap.onclick=()=>{
  if (resetMap.disabled) return;
  drawing.reset();
  wardLayer.clearSelection();
  writeFrame(initialFrame());
};
document.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{
  if(!canEdit())return;
  history.record();
  animateTo({ ...snapshotFrame(play().live), pos: preset(b.dataset.pre) });
});
const history = mountMapHistory({
  canEdit: canChangeFrame,
  capture: () => ({ pid: getState().curPlay, live: clone(play().live), step: M.edit ? play().steps[M.sel] : undefined }),
  restore: ({ pid, live, step }) => {
    const p = plays().find(candidate => candidate.id === pid);
    if (!p) return;
    const stepIndex = step ? p.steps.indexOf(step) : -1;
    const previous = { pid, live: stepIndex >= 0 ? snapshotFrame(step) : p.live, step };
    p.live = live;
    if (getState().curPlay !== pid) { getState().curPlay = pid; M.sel = -1; }
    if (stepIndex >= 0) {
      M.sel = stepIndex;
      Object.assign(step, snapshotFrame(live));
    }
    drawing.reset();
    wardLayer.clearSelection();
    save(false);
    renderPlays();
    return previous;
  },
});

// jogadas
function renderPlays(highlightStep = false){
  const p=play();
  $("#psel").innerHTML=plays().map(x=>`<option value="${x.id}"${x.id===p.id?" selected":""} data-description="${x.steps.length} ${x.steps.length===1?"passo":"passos"}">${esc(x.name)}</option>`).join("");
  mountTeamSelect($("#psel"));
  compositions.render();
  const steps=$("#steps");
  clearTeamControls(steps);
  steps.innerHTML = p.steps.map((step, index) => {
    const number = index + 1;
    const current = index === M.sel;
    const name = esc(step.label || `Passo ${number}`);
    return `<li data-i="${index}"${current ? ' class="on"' : ""}${current && highlightStep ? " data-step-highlight" : ""}>
      <button type="button" class="map-step-select" data-slot="button" data-variant="ghost" data-size="icon-sm" data-step-select="${index}" aria-label="Selecionar passo ${number}"${current ? ' aria-current="step"' : ""}>${number}</button>
      <input ${canEdit() ? "" : "readonly"} data-slot="input" data-lab="${index}" value="${name}" aria-label="Nome do passo ${number}" title="Renomear passo">
      <button ${canEdit() ? "" : "disabled"} data-slot="button" data-variant="destructive" data-size="icon-sm" data-sdel="${index}" aria-label="Apagar passo ${number}">${iconMarkup("close")}</button>
    </li>`;
  }).join("") || '<li class="none" data-team-control></li>';
  if(!p.steps.length)mountMapEmpty(steps.firstElementChild);
  syncStepPages(p.steps.length, M.sel);
  renderStat();
  drawMapTools();
  renderTokens();
  previewFaelights.refresh();
  refreshMap();
  drawing.render();
}
$("#psel").onchange=()=>{stopPlayback();getState().curPlay=$("#psel").value;M.sel=-1;wardLayer.clearSelection();drawing.reset();save(false);renderPlays();publishTeamRoute("map")};
$("#pnew").onclick=async()=>{const n=await askName("Nova jogada","Jogada "+(plays().length+1));if(n===undefined)return;const p=blankPlay(uid, n||undefined);getState().plays.push(p);getState().curPlay=p.id;M.sel=-1;save();renderPlays();publishTeamRoute("map")};
$("#pren").onclick=async()=>{const p=play(),n=await askName("Renomear jogada",p.name);if(!n)return;p.name=n;save();renderPlays()};
$("#pdel").onclick=async()=>{const p=play();if(!await confirmAction(`Excluir a jogada "${p.name}"?`, "Excluir jogada"))return;getState().plays=getState().plays.filter(x=>x.id!==p.id);plays();M.sel=-1;save();renderPlays();publishTeamRoute("map")};

// passos: o passo selecionado salva sozinho tudo o que muda no mapa
function syncStep(){const p=play();if(!M.edit||!canChangeFrame()||M.sel<0||!p.steps[M.sel])return;Object.assign(p.steps[M.sel],snapshotFrame(p.live));save(false);flashStep()}
let tFl;function flashStep(){const el=$("#sstat .ok");if(!el)return;el.style.opacity=1;clearTimeout(tFl);tFl=setTimeout(()=>el.style.opacity=0,900)}
function renderStat(){
  updateClearMap();
  history.update();
  const editingAllowed = canEdit();
  $("#splay").disabled = Boolean(M.transition && !M.playing);
  const preview = getPerspective() !== "all";
  $("#map-preview-notice").hidden = !preview;
  document.querySelectorAll("#sadd,#sedit,[data-pre],#pnew,#pren,#pdel").forEach(button => { button.disabled = !editingAllowed; });
  compositions.setDisabled(!editingAllowed);
  $("#steps").querySelectorAll("[data-lab]").forEach(field => { field.readOnly = !editingAllowed; });
  $("#steps").querySelectorAll("[data-sdel]").forEach(button => { button.disabled = !editingAllowed; });
  const { steps } = play();
  const editingStep = M.edit && steps[M.sel];
  const button = $("#sedit");
  const status = $("#sstat");
  button.classList.toggle("on", !!M.edit);
  button.setAttribute("aria-pressed", M.edit);
  status.classList.toggle("ed", !!editingStep);

  let icon = "";
  let message = steps.length ? "" : "Salve o mapa em <b>Novo passo</b>.";
  if(M.playing){
    icon = "play";
    message = "Reproduzindo...";
  } else if(M.edit){
    icon = "edit";
    message = editingStep
      ? `Editando o <b>passo ${M.sel + 1}</b>. <span class="ok">${iconMarkup("check")} salvo</span>`
      : "Selecione um passo para editar.";
  }
  status.innerHTML = `${icon ? iconMarkup(icon) : ""}<span>${message}</span>`;
  status.hidden = !message;
}
$("#sadd").onclick=()=>{if(!canEdit())return;const p=play(),at=M.sel>=0?M.sel+1:p.steps.length;p.steps.splice(at,0,{label:"Passo "+(p.steps.length+1),...snapshotFrame(p.live)});M.sel=at;save();renderPlays();toast(`Passo ${at+1} salvo com a posição atual`)};
$("#sedit").onclick=()=>{if(!canEdit())return;M.edit=!M.edit;renderStat();if(M.edit&&M.sel<0)toast("Agora clique no passo que quer editar")};
$("#steps").addEventListener("input",e=>{const i=e.target.dataset.lab;if(i==null||!canEdit())return;play().steps[+i].label=e.target.value;save(false)});
$("#steps").onclick=async e=>{const d=e.target.closest("[data-sdel]");const p=play();
  if(d){if(!canEdit())return;const i=+d.dataset.sdel;if(!await confirmAction(`Apagar o passo ${i+1}?`, "Apagar passo"))return;p.steps.splice(i,1);if(M.sel===i)M.sel=-1;else if(M.sel>i)M.sel--;save();renderPlays();return}
  const li=e.target.closest("li[data-i]");if(!li||M.playing||M.transition)return;
  const index = Number(li.dataset.i);
  if (index === M.sel) return;
  const active = e.target.closest("[data-step-select], [data-lab]");
  const field = active?.matches("[data-lab]");
  const caret = field && [active.selectionStart, active.selectionEnd];
  goStep(index);
  if (active) {
    const replacement = $(field ? `[data-lab="${index}"]` : `[data-step-select="${index}"]`);
    replacement?.focus({ preventScroll: true });
    if (caret) replacement?.setSelectionRange(...caret);
  }
};
function goStep(i){const p=play();if(i<0||i>=p.steps.length)return;M.sel=i;wardLayer.clearSelection();drawing.reset();renderPlays(true);return animateTo(snapshotFrame(p.steps[i]))}
$("#sprev").onclick=()=>!M.playing&&!M.transition&&goStep(M.sel-1);
$("#snext").onclick=()=>!M.playing&&!M.transition&&goStep(M.sel+1);
$("#spd").oninput=()=>$("#spdv").textContent=$("#spd").value+"s";
function animateTo(target) {
  const p = play(), from = snapshotFrame(p.live);
  const duration = Number($("#spd").value) * 1000;
  const transition = {};
  M.transition = transition;
  renderStat();
  drawMapTools();
  M.frame = { ...target, pos: from.pos, waves: from.waves };
  drawing.render();
  wardLayer.render();
  battlefield.renderTowers();

  const finish = () => {
    M.transition = null;
    M.frame = null;
    p.live = target;
    save(false);
    if (!M.playing) {
      renderStat();
      drawMapTools();
      refreshMap();
      drawing.render();
    } else refreshMap();
  };
  if (reducedMotion.matches) {
    finish();
    return M.playing ? new Promise(resolve => setTimeout(resolve, duration)) : Promise.resolve();
  }
  return animatePieces(from, target, duration, () => M.transition === transition && play() === p, pieces => {
    Object.assign(M.frame, pieces);
    placeTokens(pieces.pos);
    battlefield.render();
  }).then(completed => { if (completed) finish(); });
}
function stopPlayback() {
  if (M.playing && M.transition) M.sel--;
  M.playing = false;
  M.transition = null;
  M.frame = null;
  M.playback = null;
  $("#splay").innerHTML = iconMarkup("play") + " Reproduzir";
}
$("#splay").onclick = async () => {
  if (M.playing) { stopPlayback(); save(false); renderPlays(); return; }
  if (M.transition) return;
  const p = play();
  if (p.steps.length < 2) return toast("Salve pelo menos 2 passos para reproduzir");
  const playback = {};
  M.playback = playback;
  M.playing = true;
  drawing.reset();
  wardLayer.clearSelection();
  $("#splay").innerHTML = iconMarkup("stop") + " Parar";
  p.live = snapshotFrame(p.steps[0]);
  M.sel = 0;
  renderPlays(true);
  for (let i = 1; i < p.steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 450));
    if (M.playback !== playback) return;
    M.sel = i;
    renderPlays(true);
    await animateTo(snapshotFrame(p.steps[i]));
    if (M.playback !== playback) return;
  }
  stopPlayback();
  renderPlays();
};

return { plays, renderPlays, renderMapImageSwitch, setMapImg, selectPlay(id) {
  if (getState().curPlay === id) return;
  stopPlayback();
  M.sel = -1;
  drawing.reset();
  wardLayer.clearSelection();
  getState().curPlay = id;
} };
}
