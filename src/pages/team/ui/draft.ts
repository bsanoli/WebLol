// @ts-nocheck -- Integração legada com o DOM e dados locais.
import { iconMarkup } from "@/shared/ui/icon"

const DORDER=[
 ["Fase de bans 1",["B:ban","R:ban","B:ban","R:ban","B:ban","R:ban"]],
 ["Fase de picks 1",["B:pick","R:pick","R:pick","B:pick","B:pick","R:pick"]],
 ["Fase de bans 2",["R:ban","B:ban","R:ban","B:ban"]],
 ["Fase de picks 2",["R:pick","B:pick","B:pick","R:pick"]]];
const PLANES=["top","jg","mid","adc","sup"];
// Lanes na ordem de pick da comp, do lado escolhido (para mostrar os campeões nessa ordem)
// Bolinha azul/vermelha com o lado da comp
export const sideDot=c=>{const side=draftOf(c).side;return `<span class="side-dot ${side}" role="img" aria-label="${DRAFT_SIDE[side]}" title="${DRAFT_SIDE[side]}"></span>`};
export function pickOrderLanes(c){const d=draftOf(c);return d.order[d.side]}
export function draftOf(c){
  if(!c.draft)c.draft={};const d=c.draft;
  if(!d.side)d.side="blue";if(!d.note)d.note={blue:"",red:""};if(!d.order)d.order={};
  for(const s of["blue","red"]){const o=(d.order[s]||[]).filter(l=>PLANES.includes(l));
    d.order[s]=[...new Set([...o,...["mid","jg","sup","adc","top"]])].slice(0,5)}
  return d;
}
const PICKTIP={B1:"First pick",B2:"dupla",B3:"dupla",R1:"dupla",R2:"dupla",R3:"fecha fase 1",R4:"abre fase 2",B4:"dupla",B5:"dupla",R5:"Last pick"};
// Nome de cada pick pela ordem do draft (no lugar de B1, R1...)
export const PICKNAME={B1:"First Pick",B2:"Dupla B2/B3",B3:"Dupla B2/B3",B4:"Dupla B4/B5",B5:"Dupla B4/B5",R1:"Dupla R1/R2",R2:"Dupla R1/R2",R3:"Solo R3",R4:"Solo R4",R5:"Last Pick"};
export const DRAFT_SIDE = {blue:"Lado azul", red:"Lado vermelho"} as const;
export function draftHTML(c, { active, compositions, LN, img, esc, pickArt }){
  const d=draftOf(c),us=d.side==="blue"?"B":"R";
  // picks e bans têm numeração própria (1º a 10º pick, 1º a 10º ban)
  const seq=[],cnt={B:{pick:0,ban:0},R:{pick:0,ban:0}},kc={pick:0,ban:0};
  DORDER.forEach(([ph,slots],pi)=>slots.forEach(s=>{const[t,k]=s.split(":");const i=cnt[t][k]++;seq.push({t,k,i,code:t+(k==="ban"?"B":"")+(i+1),ph:pi,n:++kc[k]})}));
  const find=(t,k,i)=>seq.find(s=>s.t===t&&s.k===k&&s.i===i);
  // No draft: clique esquerdo torna principal, arrastar reordena e o botão direito abre "Excluir".
  const mini=(n,l,j)=>`<div class="chip dchip ${j===0?"primary":"alternative"}" data-team-control draggable="true" data-n="${esc(n)}" data-from="${l}"><button class="champ-priority" data-priority="${esc(n)}" data-lane="${l}" aria-label="${j===0?"Principal":"Tornar principal"}: ${esc(n)} em ${LN[l].n}" title="${esc(n)} · ${j+1}ª opção · clique para tornar principal, botão direito para excluir">${img(n)}</button></div>`;
  // faixa da sequência
  let h=`<div class="draft-toolbar draft-toolbar-top"><div class="dside" role="group" aria-label="Lado da equipe"><span>Nossa equipe</span>
    ${Object.entries(DRAFT_SIDE).map(([key,label])=>`<button data-slot="button" data-variant="outline" data-size="sm" data-side="${key}" aria-pressed="${d.side===key}" class="${d.side===key?`on ${key[0]}`:""}">${label}</button>`).join("")}</div></div>`;
  const head=h;h="";
  const team=t=>{
    const mine=t===us,side=t==="B"?"b":"r";
    const banSq=i=>{const s=find(t,"ban",i),n=mine?c.lanes.ban[i]:null;
      return `<div class="bsq${n?" has":""}${mine?" mine":""}${mine&&active==="ban"?" act":""}" ${mine?`data-l="ban" data-bi="${i}"`:""} title="${s.n}º ban">
        ${n?`<span class="dm" draggable="true" data-n="${esc(n)}" data-from="ban">${img(n)}<button class="x" data-rm="${esc(n)}" aria-label="Remover ${esc(n)}">${iconMarkup("close")}</button></span>`:`<span class="bn">${s.n}</span>`}</div>`};
    const pick=i=>{const s=find(t,"pick",i),tip=PICKTIP[s.code]||"";
      const meta=`<span class="pkh"><b title="${s.code} · ${s.n}º pick">${PICKNAME[s.code]}</b></span>`;
      if(!mine)return `<div class="pk ${side} them">${meta}<div class="pkn">${iconMarkup("champion")} A definir</div></div>`;
      const l=d.order[d.side][i],L=LN[l],ch=c.lanes[l],m=ch[0];
      const editing=active===l;
      return `<div class="pk ${side} mine${editing?" act":""}" data-l="${l}" style="--lc:var(${L.c})">
        ${pickArt(m)}
        <button type="button" class="pk-target" data-draft-target="${l}" aria-pressed="${editing}" aria-label="${PICKNAME[s.code]} · ${L.n}${m?" · "+esc(m):" · Escolher campeão"}">
          ${meta}${m?img(m):iconMarkup("champion-add")}
          <span class="pkn${m?"":" pk-empty"}">${m?esc(m):"Escolher campeão"}</span>
        </button>
        <div class="pkf"><span class="lane-label"><select data-team-select="lane" data-pick-position="${i}" aria-label="Posição do pick ${t}${i+1}">${PLANES.map(x=>`<option value="${x}"${x===l?" selected":""}>${LN[x].n}</option>`).join("")}</select></span>
        ${m?mini(m,l,0):""}
        ${ch.length>1?`<div class="alts draft-alternatives" role="group" aria-label="Alternativas de ${L.n}"><span class="draft-alternatives-label" aria-hidden="true">Alternativas</span>${ch.slice(1).map((n,j)=>mini(n,l,j+1)).join("")}</div>`:""}
        </div></div>`};
    return `<section class="tm ${side}${mine?" mine":""}" aria-labelledby="draft-side-${side}">
      <div class="draft-bans">
        ${mine?`<button type="button" class="draft-ban-target" data-draft-target="ban" aria-pressed="${active==="ban"}">Bans ${active==="ban"?'<span class="draft-editing">Editando</span>':""}</button>`:'<div class="draft-phase">Bans</div>'}
        <div class="bans" role="group" aria-label="Bans da primeira e da segunda fase">${[0,1,2].map(banSq).join("")}<span class="bgap"></span>${[3,4].map(banSq).join("")}</div>
      </div>
      <div class="draft-phase">Picks · Fase 1</div>
      ${[0,1,2].map(pick).join("")}
      <div class="draft-phase">Picks · Fase 2</div>
      ${[3,4].map(pick).join("")}</section>`;
  };
  // Clicar no nome de um lado coloca o time nesse lado.
  const sideName=t=>{const side=t==="B"?"b":"r",key=t==="B"?"blue":"red",mine=t===us;return `<h3 class="tmh" id="draft-side-${side}"><button type="button" class="side-pick${mine?" on":""}" data-side="${key}" aria-pressed="${mine}" title="${mine?"Nosso time está neste lado":"Clique para colocar nosso time neste lado"}">${DRAFT_SIDE[key]}<span>${mine?"Nossa equipe":"Adversário"}</span></button></h3>`};
  const tabs=compositions.map(x=>{const firsts=pickOrderLanes(x).map(l=>x.lanes[l][0]).filter(Boolean);
    return `<button type="button" class="dz-tab${x.id===c.id?" on":""}" data-comp-tab="${esc(x.id)}" aria-pressed="${x.id===c.id}" title="${esc(x.name)}"><b>${sideDot(x)}${esc(x.name)}</b><span class="mini">${firsts.map(img).join("")||'<small>vazia</small>'}</span></button>`}).join("");
  h+=`<div class="dz">${team("B")}
    <div class="dz-center">
      <div class="dz-names">${sideName("B")}${sideName("R")}</div>
      <div class="dz-tabs" role="group" aria-label="Composições do time">${tabs}<button type="button" class="dz-tab dz-new" data-comp-new aria-label="Nova composição" title="Nova composição">${iconMarkup("plus")}</button></div>
      ${head}
      <div class="dz-slot"></div>
    </div>
    ${team("R")}</div>`;
  const extra=c.lanes.ban.slice(5);
  if(extra.length)h+=`<div class="lbl">Bans alternativos</div><div class="alts" data-l="ban">${extra.map((n,j)=>mini(n,"ban",j+5)).join("")}</div>`;
  return h;
}
