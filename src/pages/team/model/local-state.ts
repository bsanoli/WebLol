export const KEY="lol-comps-time-v1";
export const uid=()=>Math.random().toString(36).slice(2,10);
type Composition = {
  id: string
  name: string
  lanes: Record<"top" | "jg" | "mid" | "adc" | "sup" | "ban", string[]>
  laneNotes: Record<string, string>
  notes: string
  updated: number
}

export function blank(name = "Nova comp"): Composition {
  return {
    id: uid(),
    name: name || "Nova comp",
    lanes: { top: [], jg: [], mid: [], adc: [], sup: [], ban: [] },
    laneNotes: {},
    notes: "",
    updated: Date.now(),
  }
}

export function loadTeamState(){
  let S: { comps: Composition[]; cur: string } | null;
  try{S=JSON.parse(localStorage.getItem(KEY) ?? "null")}catch{S=null}
  if(!S||!Array.isArray(S.comps)){
    // Comp de exemplo (genérica) para quem ainda não tem as comps de um time
    const c=blank("Comp de exemplo: luta em time");
    c.lanes.top=["Ornn","Sion"];c.lanes.jg=["Sejuani","Vi"];c.lanes.mid=["Orianna","Azir"];
    c.lanes.adc=["Jinx","Aphelios"];c.lanes.sup=["Braum","Rell"];
    c.laneNotes={top:"Linha de frente",mid:"Controle e dano em área",adc:"Dano contínuo protegido"};
    c.notes="Comp de exemplo. Entre com seu usuário e escolha um time para ver e editar as comps do seu time.";
    S={comps:[c],cur:c.id};
  }
  if(!S.comps.length){const c=blank();S.comps.push(c);S.cur=c.id}
  if(!S.comps.some(c=>c.id===S.cur))S.cur=S.comps[0].id;
  return S;
}
