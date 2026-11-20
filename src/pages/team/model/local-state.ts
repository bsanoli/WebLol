export const KEY="lol-comps-time-v1";
export const uid=()=>Math.random().toString(36).slice(2,10);

export type DraftSide = "blue" | "red"
export type DraftLane = "top" | "jg" | "mid" | "adc" | "sup"
export type CompositionDraft = {
  side: DraftSide
  order: Record<DraftSide, DraftLane[]>
  /** Plano do draft de cada lado; vai para o bloco de notas da comp na primeira edição. */
  note: Record<DraftSide, string>
  /** Id da composição adversária colocada do outro lado do draft. */
  rival?: string
}

export type Composition = {
  id: string
  name: string
  lanes: Record<"top" | "jg" | "mid" | "adc" | "sup" | "ban", string[]>
  laneNotes: Record<string, string>
  notes: string
  updated: number
  /** De quem é a comp: da nossa equipe (padrão) ou da equipe adversária. */
  team?: "mine" | "enemy"
  /** Link do OP.GG do time adversário. */
  opgg?: string
  draft?: CompositionDraft
  /** Confrontos da comp nossa contra adversárias, cada um com tática própria. */
  matchups?: { id: string; enemy: string; updated: number }[]
}

export const DRAFT_LANES: DraftLane[] = ["top", "jg", "mid", "adc", "sup"]
const DEFAULT_ORDER: DraftLane[] = ["mid", "jg", "sup", "adc", "top"]

/** Normaliza o draft guardado (lado, ordem dos picks e planos) e o devolve, criando se faltar. */
export function draftOf(c: Composition): CompositionDraft {
  if (!c.draft || typeof c.draft !== "object") c.draft = {} as CompositionDraft
  const d = c.draft
  if (d.side !== "red") d.side = "blue"
  if (!d.note || typeof d.note !== "object") d.note = { blue: "", red: "" }
  if (!d.order || typeof d.order !== "object") d.order = {} as CompositionDraft["order"]
  for (const side of ["blue", "red"] as const) {
    const saved = (Array.isArray(d.order[side]) ? d.order[side] : []).filter(lane => DRAFT_LANES.includes(lane))
    d.order[side] = [...new Set([...saved, ...DEFAULT_ORDER])].slice(0, 5)
  }
  if (typeof d.rival !== "string" || !d.rival) delete d.rival
  return d
}

/** Primeiro campeão de cada lane, para a prévia da comp nas listas. */
export const compositionPreview = (c: Composition) => DRAFT_LANES.map(lane => c.lanes[lane]?.[0]).filter(Boolean)

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
    c.notes="Comp de exemplo. Entre com seu usuário e escolha um time para ver e editar as comps do seu time.";
    S={comps:[c],cur:c.id};
  }
  if(!S.comps.length){const c=blank();S.comps.push(c);S.cur=c.id}
  if(!S.comps.some(c=>c.id===S.cur))S.cur=S.comps[0].id;
  return S;
}
