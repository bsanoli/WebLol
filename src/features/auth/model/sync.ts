// Sincronização com o time: lê a versão oficial, junta com a cópia local, envia alterações para aprovação
// (jogador) e publica a nova versão (capitão ou admin). Coleções e campos do Firestore não mudam.
import {
  applyChanges,
  type Change,
  itemName,
  KN,
  type SharedData,
  type SharedItem,
  withOwnMatchups,
} from "@/shared/lib/team-changes"
import { dbGet, dbSet, fb, ONLINE } from "@/shared/firestore"
import { STORAGE_KEYS } from "@/shared/config"
import { normId } from "@/shared/lib/account-id"
import { toast } from "@/shared/lib/dom"
import { openRoute, routeRoots, writeRoute } from "./router"
import { parseOfficial } from "./external-data"
import { flushImages, pendingPrintReason, splitByPendingPrints } from "./images"
import { BKEY, canPublish, KEY, lsGet, lsSet, local, meKey, preview, SKEY, teamPath, user, pending } from "./identity"
import { loadMembership } from "./membership"
import { session, type LogEntry, type Official } from "./session"
import { uiHooks } from "./ui-hooks"

/** Alteração com a origem anotada, como entra num envio ou na publicação. */
export type SentChange = Change & { sid: string; from: string }
type OfficialRead = { off: Official; err?: undefined } | { off?: undefined; err: "noteam" | "bad" | "net" }
type CampState = Record<string, unknown> & {
  comps?: SharedItem[]
  tactics?: SharedItem[]
  matchups?: SharedItem[]
  plays?: SharedItem[]
  cur?: string
  curPlay?: string
}

const emptyOfficial = (): Official => ({
  version: 0,
  at: 0,
  data: { comps: [], plays: [], tactics: [], matchups: [] },
  log: [],
})

export async function readOfficial(): Promise<OfficialRead> {
  if (!session.team) return { err: "noteam" }
  const doc = await dbGet(teamPath("dados"), "oficial")
  if (!doc) return { off: emptyOfficial() }
  const off = parseOfficial(doc.json)
  return off ? { off } : { err: "bad" }
}

/** Grava a versão oficial na cópia local, mantendo o estado "ao vivo" das jogadas. */
function writeLocal(data: SharedData, official: Official) {
  const state = (local() || {}) as CampState
  const live = new Map((state.plays || []).map(play => [play.id, play.live]))
  state.comps = data.comps
  state.tactics = data.tactics || []
  state.matchups = data.matchups || []
  state.plays = data.plays.map(play => (live.has(play.id) ? { ...play, live: live.get(play.id) } : play))
  if (!state.comps.some(comp => comp.id === state.cur)) state.cur = state.comps[0]?.id
  if (!state.plays.some(play => play.id === state.curPlay)) state.curPlay = state.plays[0]?.id
  lsSet(KEY, state)
  lsSet(BKEY, { version: official.version, data: official.data })
}

export async function sync(options: { reload?: boolean } = {}) {
  if (!ONLINE) return uiHooks.setSync("Banco online não configurado", "warn")
  if (!user() || user()?.solo || !session.team) {
    uiHooks.updateStatus()
    return
  }
  let result: OfficialRead
  try {
    await fb()
    result = await readOfficial()
  } catch {
    result = { err: "net" }
  }
  session.net = !result.err
  if (result.err) {
    const messages = {
      net: "Sem conexão com o banco do time",
      bad: "Versão oficial do time ilegível",
      noteam: "Sem time",
    }
    uiHooks.setSync(messages[result.err], "bad")
    uiHooks.updateStatus(true)
    return
  }
  void flushImages()
  const official = result.off
  session.off = official
  const base = lsGet<{ version: number; data: SharedData }>(BKEY)
  const notes: string[] = []
  let shouldReload = false
  if (!base) {
    writeLocal(official.data, official)
    shouldReload = true
  } else if (base.version !== official.version) {
    const me = normId(user()?.id || "")
    const rejected = new Set(
      official.log
        .filter((entry: LogEntry) => entry.status === "rejected" && normId(entry.from) === me)
        .map(entry => entry.h),
    )
    const mine = pending().filter(change => {
      if (change.h && rejected.has(change.h)) {
        notes.push(`${KN[change.kind]} "${itemName(change)}" foi recusada pelo capitão`)
        return false
      }
      return true
    })
    writeLocal(withOwnMatchups(applyChanges(official.data, mine)), official)
    shouldReload = true
  }
  if (shouldReload && options.reload !== false) session.reloadCamp()
  for (const note of notes) toast(note, 5000)
  uiHooks.updateStatus()
}

export async function refreshTeam() {
  uiHooks.setSync("Sincronizando com o time…", "")
  try {
    await loadMembership()
  } catch {
    // sem rede: o `sync` abaixo mostra o aviso
  }
  await sync()
  if (session.currentScreen === "admin") void uiHooks.renderAdmin()
  if (session.net && session.off) toast("Sincronizado")
}

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/** Jogador: envia as alterações ainda não enviadas para o capitão aprovar. */
export async function sendChanges() {
  if (preview())
    return toast(
      "Você está vendo como outra pessoa: nada foi enviado. Volte para a visão de admin no menu da conta.",
      5000,
    )
  const account = user()
  const base = lsGet<{ version: number }>(BKEY)
  if (!session.team || !base || !account) return toast("Sem conexão com o banco do time")
  const sent = lsGet<string[]>(SKEY, []) ?? []
  const changes = pending().filter(change => !change.h || !sent.includes(change.h))
  if (!changes.length) return
  await flushImages()
  // Uma tática com print que não chegou ao time só vai depois dele: senão os outros veriam um buraco.
  const { ready, held } = splitByPendingPrints(changes)
  if (held.length)
    toast(
      `${held.length} alteração(ões) ficou(aram de fora: o print ainda não chegou ao time (${held.map(itemName).join(", ")}). ${pendingPrintReason() || 'Use "Tentar de novo" no print e envie outra vez.'}`,
      7000,
    )
  if (!ready.length) return uiHooks.updateStatus()
  const submission = { id: newId(), from: account.id, at: Date.now(), baseVersion: base.version, changes: ready }
  try {
    await dbSet(teamPath("envios"), submission.id, {
      from: meKey(),
      at: submission.at,
      json: JSON.stringify(submission),
    })
    lsSet(SKEY, [...sent, ...ready.map(change => change.h)].slice(-500))
    toast(`${ready.length} alteração(ões) enviada(s) para o capitão aprovar`)
  } catch (error) {
    toast(`Não consegui enviar para o banco do time: ${(error as Error).message}`)
  }
  uiHooks.updateStatus()
}

const logEntry = (v: number, at: number, change: SentChange, status: LogEntry["status"]): LogEntry => ({
  v,
  at,
  sid: change.sid,
  from: change.from,
  kind: change.kind,
  op: change.op,
  id: change.id,
  name: itemName(change),
  h: change.h ?? "",
  status,
})

/** Capitão ou admin: grava a nova versão oficial com as alterações aprovadas e recusadas. */
/** Um envio de cliente antigo não traz `matchups`; sem mudança de confronto aprovada, mantém os do oficial. */
function keepMatchups(next: SharedData, current: SharedData, approved: Change[]): SharedData {
  if (approved.some(change => change.kind === "matchup") || next.matchups?.length) return next
  return { ...next, matchups: current.matchups ?? [] }
}

export async function publish(approved: SentChange[], rejected: SentChange[], label: string) {
  if (!session.team || !canPublish()) {
    writeRoute(routeRoots.admin)
    openRoute()
    return toast(user()?.admin ? "Desbloqueie o admin primeiro" : "Só o capitão publica a versão oficial do time")
  }
  await flushImages()
  const held = splitByPendingPrints(approved).held
  if (held.length)
    return toast(
      `Não publiquei: o print de ${held.map(itemName).join(", ")} ainda não chegou ao time. ${pendingPrintReason() || 'Use "Tentar de novo" no print e publique outra vez.'}`,
      9000,
    )
  let result: OfficialRead
  try {
    result = await readOfficial()
  } catch {
    result = { err: "net" }
  }
  if (result.err) return toast(`Erro lendo a versão oficial: ${result.err === "net" ? "sem conexão" : result.err}`)
  const current = result.off
  const version = current.version + 1
  const at = Date.now()
  const log = [
    ...current.log,
    ...approved.map(change => logEntry(version, at, change, "approved")),
    ...rejected.map(change => logEntry(version, at, change, "rejected")),
  ]
  const official: Official = {
    version,
    at,
    label,
    by: user()?.id,
    data: withOwnMatchups(keepMatchups(applyChanges(current.data, approved), current.data, approved)),
    log,
  }
  try {
    await dbSet(teamPath("dados"), "oficial", { json: JSON.stringify(official), at })
  } catch (error) {
    return toast(`Não consegui publicar: ${(error as Error).message}`)
  }
  await sync()
  void uiHooks.renderAdmin()
  toast(`Versão oficial v${official.version} do ${session.team.name} publicada`)
}

export function listenToCampChanges() {
  addEventListener("storage", event => {
    if (event.key === STORAGE_KEYS.teamAreaState) uiHooks.updateStatus()
  })
}
