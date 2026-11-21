// Diferenças entre a Área do time local e a versão oficial: o que entra num envio e como aparece na lista.
// Os itens seguem o formato salvo (`team`, `draft.rival`, `lanes.*`): é o que o Firestore guarda.
// Os bans vêm em `bans` (formato atual) ou em `lanes.ban` (formato antigo, ADR 0007); os dois contam como o mesmo dado.
export type ItemKind = "comp" | "play" | "tactic" | "matchup"
export type ChangeOp = "add" | "edit" | "del"
export type SharedItem = {
  id: string
  name?: string
  lanes?: Record<string, string[]>
  bans?: string[]
  notes?: string
  team?: string
  tacticTeam?: string
  /** Confronto: comp nossa, comp adversária e o lado da nossa (as duas comps são opcionais). */
  ours?: string
  enemy?: string
  side?: string
  draft?: { rival?: string; [key: string]: unknown }
  steps?: unknown[]
  cb?: unknown
  cr?: unknown
  text?: string
  images?: unknown[]
  doc?: unknown
  live?: unknown
  updated?: unknown
  [key: string]: unknown
}
export type SharedData = { comps: SharedItem[]; plays: SharedItem[]; tactics: SharedItem[]; matchups: SharedItem[] }
export type Change = { kind: ItemKind; op: ChangeOp; id: string; before?: SharedItem; after?: SharedItem; h?: string }

const KINDS: ItemKind[] = ["comp", "play", "tactic", "matchup"]
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, char => ESCAPES[char] ?? char)

export const KN: Record<ItemKind, string> = { comp: "Comp", play: "Jogada", tactic: "Tática", matchup: "Confronto" }
export const OPN: Record<ChangeOp, string> = { add: "nova", edit: "alterada", del: "apagada" }

/** Só o que o time compartilha: composições, jogadas, táticas e confrontos. */
export const shared = (state?: Partial<SharedData> | null): SharedData => ({
  comps: clone(state?.comps || []),
  plays: clone(state?.plays || []),
  tactics: clone(state?.tactics || []),
  matchups: clone(state?.matchups || []),
})

/**
 * Leva os confrontos que viviam dentro da comp nossa (`matchups` e `draft.rival`) e o lado dela (`draft.side`) para a
 * lista `matchups` do time, mantendo os ids (a tática `mx-<id>` continua valendo). Lê os dois formatos e é idempotente:
 * o que já está na lista não é copiado de novo, e os ids criados a partir de `draft.rival` são os mesmos em qualquer navegador.
 */
export function withOwnMatchups(data?: Partial<SharedData> | null): SharedData {
  const out = shared(data)
  const enemyIds = new Set(
    out.comps.filter(comp => comp.team === "enemy" || comp.tacticTeam === "enemy").map(c => c.id),
  )
  const known = new Set(out.matchups.map(item => item.id))
  const add = (item: SharedItem) => {
    if (known.has(item.id)) return
    known.add(item.id)
    out.matchups.push(item)
  }
  for (const comp of out.comps) {
    const draft = comp.draft
    const side = draft?.side === "red" ? "red" : "blue"
    const embedded = Array.isArray(comp.matchups) ? (comp.matchups as SharedItem[]) : []
    const isOurs = !enemyIds.has(comp.id)
    if (isOurs) {
      for (const item of embedded)
        if (item && typeof item.id === "string" && typeof item.enemy === "string" && enemyIds.has(item.enemy))
          add({ id: item.id, ours: comp.id, enemy: item.enemy, side, updated: item.updated ?? comp.updated ?? 0 })
      const rival = draft?.rival
      if (
        typeof rival === "string" &&
        enemyIds.has(rival) &&
        !out.matchups.some(m => m.ours === comp.id && m.enemy === rival)
      )
        add({ id: `${comp.id}-${rival}`, ours: comp.id, enemy: rival, side, updated: comp.updated ?? 0 })
    }
    delete comp.matchups
    if (draft) {
      delete draft.side
      delete draft.rival
    }
  }
  return out
}

/** Posições da composição com os bans como `ban`, venham de `lanes.ban` ou de `bans`. */
function savedPositions(item: SharedItem) {
  const lanes = item.lanes || {}
  return item.bans && !("ban" in lanes) ? { ...lanes, ban: item.bans } : lanes
}

/** Leva os bans de `bans` para `lanes.ban`, para comparar composições gravadas nos dois formatos. */
function withBansInLanes(item: SharedItem): SharedItem {
  if (!item.bans) return item
  const { bans: _bans, ...rest } = item
  return { ...rest, lanes: savedPositions(item) }
}

// Campos que mudam sozinhos (jogada ao vivo, data de edição) não contam como alteração.
const normItem = (kind: ItemKind, item: SharedItem) => {
  const copy = { ...(kind === "comp" ? withBansInLanes(item) : item) }
  if (kind === "play") delete copy.live
  else delete copy.updated
  return JSON.stringify(copy)
}

/** Hash curto e estável (cyrb53) que identifica uma alteração. */
export function hsh(text: string) {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export function diff(local: Partial<SharedData>, base: Partial<SharedData>): Change[] {
  const changes: Change[] = []
  for (const kind of KINDS) {
    const key = `${kind}s` as keyof SharedData
    const localItems = local[key] || []
    const baseItems = base[key] || []
    const baseById = new Map(baseItems.map(item => [item.id, item]))
    const localById = new Map(localItems.map(item => [item.id, item]))
    for (const item of localItems) {
      const before = baseById.get(item.id)
      if (!before) changes.push({ kind, op: "add", id: item.id, after: item })
      else if (normItem(kind, item) !== normItem(kind, before))
        changes.push({ kind, op: "edit", id: item.id, before, after: item })
    }
    for (const before of baseItems)
      if (!localById.has(before.id)) changes.push({ kind, op: "del", id: before.id, before })
  }
  for (const change of changes)
    change.h = hsh(change.op + change.id + (change.after ? normItem(change.kind, change.after) : ""))
  return changes
}

export function applyChanges(data: Partial<SharedData>, changes: Change[]): SharedData {
  const out = shared(data)
  for (const change of changes) {
    const list = out[`${change.kind}s` as keyof SharedData]
    const index = list.findIndex(item => item.id === change.id)
    if (change.op === "del") {
      if (index >= 0) list.splice(index, 1)
    } else if (change.after) {
      if (index >= 0) list[index] = clone(change.after)
      else list.unshift(clone(change.after))
    }
  }
  return out
}

export const itemName = (change: Change) =>
  (change.after || change.before)?.name || (change.kind === "matchup" ? "Confronto" : "(sem nome)")

function describeNew(change: Change) {
  const { after } = change
  if (!after) return ""
  if (change.kind === "comp") {
    const lanes = Object.entries(savedPositions(after))
      .map(([lane, champions]) =>
        champions.length ? `<b>${lane.toUpperCase()}</b> ${escapeHtml(champions.join(", "))}` : "",
      )
      .filter(Boolean)
      .join(" · ")
    return `Campeões: ${lanes || "nenhum"}`
  }
  if (change.kind === "play") return `${after.steps?.length || 0} passos`
  if (change.kind === "matchup") return "Confronto entre uma comp nossa e uma adversária"
  return "Texto da tática"
}

function describeComp(a: SharedItem, b: SharedItem, out: string[]) {
  const lanesNow = savedPositions(a)
  const lanesBefore = savedPositions(b)
  for (const lane of Object.keys({ ...lanesNow, ...lanesBefore })) {
    const now = lanesNow[lane] || []
    const before = lanesBefore[lane] || []
    const added = now.filter(x => !before.includes(x))
    const removed = before.filter(x => !now.includes(x))
    if (added.length || removed.length)
      out.push(
        `<b>${lane.toUpperCase()}</b>: ${added.length ? `+ ${escapeHtml(added.join(", "))}` : ""}${added.length && removed.length ? " · " : ""}${removed.length ? `− ${escapeHtml(removed.join(", "))}` : ""}`,
      )
    else if (now.join() !== before.join())
      out.push(`<b>${lane.toUpperCase()}</b>: ordem de prioridade mudou (${escapeHtml(now.join(" > "))})`)
  }
  if ((a.notes || "") !== (b.notes || "")) out.push("Anotações alteradas")
  const side = (item: SharedItem) => item.team || (item.tacticTeam === "enemy" ? "enemy" : "mine")
  const sideName: Record<string, string> = { mine: "nossa", enemy: "adversária" }
  if (side(a) !== side(b)) out.push(`Lado alterado: ${sideName[side(b)]} → ${sideName[side(a)]}`)
  const { rival: rivalNow, ...draftNow } = a.draft || {}
  const { rival: rivalBefore, ...draftBefore } = b.draft || {}
  if ((rivalNow || "") !== (rivalBefore || "")) out.push("Adversária do draft alterada")
  if (JSON.stringify(draftNow) !== JSON.stringify(draftBefore)) out.push("Ordem do draft alterada")
}

function describeMatchup(a: SharedItem, b: SharedItem, out: string[]) {
  if ((a.ours || "") !== (b.ours || "")) out.push("Comp nossa do confronto trocada")
  if ((a.enemy || "") !== (b.enemy || "")) out.push("Adversária do confronto trocada")
  if ((a.side || "blue") !== (b.side || "blue"))
    out.push(`Lados trocados: nossa no ${a.side === "red" ? "vermelho" : "azul"}`)
}

function describeTactic(a: SharedItem, b: SharedItem, out: string[]) {
  if ((a.text || "") !== (b.text || "")) out.push("Texto da tática alterado")
  if (JSON.stringify(a.images || []) !== JSON.stringify(b.images || [])) out.push("Prints ou desenhos alterados")
  else if ((a.text || "") === (b.text || "") && JSON.stringify(a.doc || null) !== JSON.stringify(b.doc || null))
    out.push("Formatação da tática alterada")
}

/** Resumo legível do que mudou, em HTML já escapado. */
export function describe(change: Change) {
  if (change.op !== "edit") return describeNew(change)
  const { after: a, before: b } = change
  if (!a || !b) return ""
  const out: string[] = []
  if (a.name !== b.name) out.push(`Nome: <b>${escapeHtml(b.name)}</b> → <b>${escapeHtml(a.name)}</b>`)
  if (change.kind === "comp") describeComp(a, b, out)
  else if (change.kind === "tactic") describeTactic(a, b, out)
  else if (change.kind === "matchup") describeMatchup(a, b, out)
  else {
    if ((a.steps || []).length !== (b.steps || []).length)
      out.push(`Passos: ${(b.steps || []).length} → ${(a.steps || []).length}`)
    else out.push("Posições/passos alterados")
    if (a.cb !== b.cb || a.cr !== b.cr) out.push("Comps das bolinhas alteradas")
  }
  return out.join("<br>")
}
