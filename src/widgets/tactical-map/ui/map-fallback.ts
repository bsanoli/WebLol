import { sw } from "@/entities/tactical-play"

// O desenho serve de fundo enquanto as imagens do mapa carregam.
export function renderMapFallback(svg: SVGSVGElement) {
  const T=[[7,30],[8,54],[7,74],[39,61],[32,68],[24,76],[70,93],[46,92],[26,93],[11,89]];
  const tw=(t: number[],c: string)=>`<rect x="${t[0]-1.3}" y="${t[1]-1.3}" width="2.6" height="2.6" rx=".5" fill="${c}" stroke="#000" stroke-width=".3"/>`;
  const buffs=[[24,47,"#4fa3ff"],[52,75,"#ff6a4d"]];
  svg.innerHTML=`<rect width="100" height="100" fill="#1b2a1e"/>
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
}
