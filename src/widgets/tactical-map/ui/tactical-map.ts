// @ts-nocheck -- Integração legada com o DOM e dados locais.
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { LOL_DATA, lolAsset } from "@/entities/champion"
import { iconMarkup } from "@/shared/ui/icon"
import { RN, TOKS, blankPlay, preset, sw } from "../model/play"

export function mountTacticalMap({ getState, save, publishTeamRoute, toast, uid, img, esc, mountTeamSelect, mountMapEmpty, mountMapImageSwitch, mountToolGroup, clearTeamControls }) {
const $ = selector => document.querySelector(selector);
let M={tool:"move",color:"#ffd34d",sel:-1,playing:false};
function plays(){if(!Array.isArray(getState().plays)||!getState().plays.length){getState().plays=[blankPlay(uid, "Jogada 1")];getState().curPlay=getState().plays[0].id}if(!getState().plays.some(p=>p.id===getState().curPlay))getState().curPlay=getState().plays[0].id;return getState().plays}
const play=()=>plays().find(p=>p.id===getState().curPlay);
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
function setMapImg(){const im=$("#mapimg");if(getState().useImg===false){im.style.display="none";return}
  im.onload=()=>{if(getState().useImg!==false)im.style.display="block"};im.onerror=()=>{im.style.display="none"};
  if(im.getAttribute("src")!==lolAsset(LOL_DATA.map))im.src=lolAsset(LOL_DATA.map);
  else if(im.complete&&im.naturalWidth)im.style.display="block"}
function renderMapImageSwitch(){
  mountMapImageSwitch($("#map-image-control"),getState().useImg!==false,checked=>{
    getState().useImg=checked;
    save(false);
    setMapImg();
    renderMapImageSwitch();
  });
}

// bolinhas
$("#map").insertAdjacentHTML("beforeend",TOKS.map(t=>`<button type="button" class="tok ${t[0]}" data-t="${t}"></button>`).join(""));
function compChamp(cid,role){const c=getState().comps.find(x=>x.id===cid);return c&&c.lanes[role]&&c.lanes[role][0]}
function renderTokens(){
  const p=play();
  document.querySelectorAll(".tok").forEach(el=>{const t=el.dataset.t,[side,role]=t.split("_");
    const ch=compChamp(side==="b"?p.cb:p.cr,role);
    el.innerHTML=(ch?img(ch):`<span>${RN[role]}</span>`)+(ch?`<span class="rl">${RN[role]} · ${esc(ch)}</span>`:"");
    el.title=(side==="b"?"Azul ":"Vermelho ")+RN[role]+(ch?" - "+ch:"");
    el.setAttribute("aria-label", el.title);
  });
  placeTokens(p.live.pos);
}
function placeTokens(pos){document.querySelectorAll(".tok").forEach(el=>{const v=pos[el.dataset.t];if(v){el.style.left=v[0]+"%";el.style.top=v[1]+"%"}})}
$("#map").addEventListener("keydown", event => {
  const token = event.target.closest(".tok");
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (!token || !direction || M.playing || event.ctrlKey || event.altKey || event.metaKey) return;
  event.preventDefault();
  const current = play().live.pos[token.dataset.t];
  const next = current.map((value, axis) => Math.max(0, Math.min(100, value + direction[axis] * (event.shiftKey ? 5 : 1))));
  if (current.every((value, axis) => value === next[axis])) return;
  pushUndo();
  play().live.pos[token.dataset.t] = next;
  placeTokens(play().live.pos);
  save(false);
  syncStep();
});
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
const mapTools = [
  { value: "move", label: "Mover", icon: "move" },
  { value: "draw", label: "Desenhar seta", icon: "draw" },
  { value: "erase", label: "Apagar seta", icon: "erase" },
];
function drawMapTools() {
  mountToolGroup($("#map-modes"), M.tool, mapTools, value => {
    M.tool = value;
    $("#map").classList.toggle("draw", value === "draw");
    $("#map").classList.toggle("erase", value === "erase");
    hover = -1;
    drawLines(play().live.lines);
    drawMapTools();
  });
}
drawMapTools();
$("#clr").onclick=()=>{if(!play().live.lines.length)return;pushUndo();play().live.lines=[];save(false);drawLines([]);syncStep()};
document.querySelectorAll("[data-pre]").forEach(b=>b.onclick=()=>{if(M.playing)return;pushUndo();animateTo(preset(b.dataset.pre),play().live.lines)});
// desfazer / refazer
let preSnap=null,moved=false,hover=-1;const UNDO=[],REDO=[];
function snapLive(){return{pid:getState().curPlay,live:clone(play().live)}}
function pushUndo(s){UNDO.push(s||snapLive());if(UNDO.length>100)UNDO.shift();REDO.length=0;undoBtns()}
function undoBtns(){$("#undo").disabled=!UNDO.length;$("#redo").disabled=!REDO.length}
function restore(from,to){if(M.playing||!from.length)return;const s=from.pop(),p=plays().find(x=>x.id===s.pid);if(!p){undoBtns();return}
  to.push({pid:p.id,live:clone(p.live)});p.live=clone(s.live);
  if(p.id!==getState().curPlay){getState().curPlay=p.id;M.sel=-1}
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
  $("#psel").innerHTML=plays().map(x=>`<option value="${x.id}"${x.id===p.id?" selected":""} data-description="${x.steps.length} ${x.steps.length===1?"passo":"passos"}">${esc(x.name)}</option>`).join("");
  const opts=`<option value="">Só a função (TOP, JG...)</option>`+getState().comps.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  $("#cb").innerHTML=opts;$("#cr").innerHTML=opts;$("#cb").value=p.cb||"";$("#cr").value=p.cr||"";
  ["#psel","#cb","#cr"].forEach(selector=>mountTeamSelect($(selector)));
  const steps=$("#steps");
  clearTeamControls(steps);
  steps.innerHTML=p.steps.map((s,i)=>`<li data-i="${i}" class="${i===M.sel?"on":""}"${i===M.sel?` aria-current="step"${highlightStep?" data-step-highlight":""}`:""}><input data-slot="input" data-lab="${i}" value="${esc(s.label||"Passo "+(i+1))}" aria-label="Nome do passo ${i+1}" title="Clique para renomear"><button data-slot="button" data-variant="destructive" data-size="icon-sm" data-sdel="${i}" aria-label="Apagar passo ${i+1}">${iconMarkup("close")}</button></li>`).join("")||'<li class="none" data-team-control></li>';
  if(!p.steps.length)mountMapEmpty(steps.firstElementChild);
  renderStat();
  renderTokens();drawLines(p.live.lines);
}
$("#psel").onchange=()=>{getState().curPlay=$("#psel").value;M.sel=-1;save(false);renderPlays();publishTeamRoute("map")};
$("#pnew").onclick=async()=>{const n=await askName("Nova jogada","Jogada "+(plays().length+1));if(n===undefined)return;const p=blankPlay(uid, n||undefined);getState().plays.push(p);getState().curPlay=p.id;M.sel=-1;save();renderPlays();publishTeamRoute("map")};
$("#pren").onclick=async()=>{const p=play(),n=await askName("Renomear jogada",p.name);if(!n)return;p.name=n;save();renderPlays()};
$("#pdel").onclick=async()=>{const p=play();if(!await confirmAction(`Excluir a jogada "${p.name}"?`, "Excluir jogada"))return;getState().plays=getState().plays.filter(x=>x.id!==p.id);plays();M.sel=-1;save();renderPlays();publishTeamRoute("map")};
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
$("#steps").onclick=async e=>{const d=e.target.closest("[data-sdel]");const p=play();
  if(d){const i=+d.dataset.sdel;if(!await confirmAction(`Apagar o passo ${i+1}?`, "Apagar passo"))return;p.steps.splice(i,1);if(M.sel===i)M.sel=-1;else if(M.sel>i)M.sel--;save();renderPlays();return}
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

return { plays, renderPlays, renderMapImageSwitch, setMapImg, selectPlay(id) {
  if (getState().curPlay === id) return;
  M.playing = false;
  M.sel = -1;
  getState().curPlay = id;
} };
}
