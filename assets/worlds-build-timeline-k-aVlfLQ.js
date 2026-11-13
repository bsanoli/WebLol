import{a as e,c as t,i as n,l as r,n as i,o as a,r as o,s,t as c,u as l}from"./soloq-EGdKV9e4.js";var u=[],d=new Intl.NumberFormat(`pt-BR`,{maximumFractionDigits:1}),f=new Intl.NumberFormat(`pt-BR`,{maximumFractionDigits:0}),p={QUARTERFINALS:`Quartas`,SEMIFINALS:`Semifinal`,FINAL:`Final`,FINALS:`Final`};function m(e,t){if(e.stage===`soloq`)return`${t.player} · ${e.round} · ${new Date(e.date+`T12:00:00`).toLocaleDateString(`pt-BR`,{day:`2-digit`,month:`2-digit`})}`;let n=p[e.round]??`Rodada ${e.round.replace(/\D/g,``)}`;return`${e.stage===`playin`?`Play-in · `:``}${n} · Jogo ${e.number}`}var h=e=>o(e)||c.has(e);function g(e,n,r){return u.flatMap(t=>t.players.filter(t=>!s(t)&&t.champion===e&&(!n||t.role===n)).map(e=>{let n=e.side;return{game:t,player:e,opponent:i(t.players,e),won:t.winner===n}})).filter(e=>!r||e.opponent&&t(e.opponent.champion)===r).sort((e,t)=>t.game.date.localeCompare(e.game.date)||t.game.id-e.game.id)}function _(e){let t=new Set,n=[];for(let[r,i]of e.itemEventsByMinute)for(let e of i)e>0&&o(e)&&!t.has(e)&&(t.add(e),n.push([r,e]));return n}function v(e){for(let[t,n]of e.itemEventsByMinute){let e=n.find(e=>c.has(e));if(e)return[t,e]}}function y(t){let i=t.length,a=(t,a)=>{let o=a.filter(e=>!!e);if(!o.length)return``;let s=o.reduce((e,[t])=>e+t,0)/o.length,c=new Map;for(let[,e]of o)c.set(e,(c.get(e)??0)+1);let[l,u]=[...c].sort((e,t)=>t[1]-e[1])[0],p=`${u} de ${o.length} jogos`;return`<li class="build-timeline-stat">
      <span class="build-timeline-stat-label">${t}</span>
      <span class="build-timeline-stat-item">${n(l,p)}<span>${r(e(l))}
        <small>${f.format(u/o.length*100)}% · ${p}</small></span></span>
      <strong class="build-timeline-stat-minute" aria-label="Minuto médio ${d.format(s)}">${d.format(s)}'</strong>
      ${o.length<i?`<small class="build-timeline-stat-note">chegou em ${o.length} de ${i}</small>`:``}
    </li>`},o=t.map(e=>_(e.player));return`<ul class="build-timeline-stats" aria-label="Minuto médio de cada item">
    ${a(`Botas`,t.map(e=>v(e.player)))}
    ${[0,1,2].map(e=>a(`${e+1}º item`,o.map(t=>t[e]))).join(``)}
  </ul>`}function b(e){return`<ol class="build-timeline-events" aria-label="Compras por minuto">${e.itemEventsByMinute.map(([e,t])=>{let r=t.some(e=>e>0&&h(e)),i=t.map(t=>{let r=t<0,i=Math.abs(t),a=r?`sold`:h(i)?`major`:`minor`,o=r?`vendeu aos ${e} min`:`${e} min`;return`<span class="build-timeline-item" data-kind="${a}">${n(i,o)}</span>`}).join(``);return`<li class="build-timeline-minute"${r?` data-major`:``}><span class="build-timeline-time">${e}'</span>${i}</li>`}).join(``)}</ol>`}function x({game:e,player:t,opponent:n,won:i}){let[o,s,c]=t.kda;return`<li class="build-timeline-game">
    <div class="build-timeline-who">
      <span class="build-timeline-player" aria-label="${r(`${t.champion} contra ${n?.champion??`adversário desconhecido`}`)}">
        ${l(t.champion)}<span class="build-timeline-vs" aria-hidden="true">vs</span>
        ${n?`${l(n.champion)}<strong>${r(n.champion)}</strong>`:`<span class="na">—</span>`}</span>
      <span class="build-timeline-meta">
        <strong class="${i?`build-sample-wins`:`build-sample-losses`}">${i?`V`:`D`}</strong>
        <span>${o}/${s}/${c}</span>
        <span>${r(m(e,t))}</span>
        <a href="${r(e.buildsSource)}" target="_blank" rel="noopener" aria-label="Ver jogo no ${a.sourceName}">${a.sourceName}</a>
      </span>
    </div>
    ${b(t)}
  </li>`}function S(e,t,n=``){let r=g(e,t,n);return r.length?`<header class="build-timeline-header">
      <h4>Compras jogo a jogo</h4>
      <div class="build-skill-options build-timeline-view" role="group" aria-label="Quais compras mostrar">
        <button type="button" data-slot="button" data-variant="outline" data-size="sm" data-timeline-view="core" aria-pressed="true">Itens completos e botas</button>
        <button type="button" data-slot="button" data-variant="outline" data-size="sm" data-timeline-view="all" aria-pressed="false">Todas as compras</button>
      </div>
    </header>
    ${y(r)}
    <p class="build-data-sample">Minuto médio da primeira compra de cada item completo, em ${r.length===1?`1 jogo`:`${r.length} jogos`}. Compras na mesma ida à base aparecem no mesmo minuto. ${a.sourceNote}</p>
    <ol class="build-timeline-games" data-view="core">${r.map(x).join(``)}</ol>`:`<p class="na">Sem compras registradas.</p>`}export{S as buildTimeline};