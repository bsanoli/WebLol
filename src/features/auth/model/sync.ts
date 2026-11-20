// Sincronização com o time: lê a versão oficial, junta com a cópia local, envia alterações para aprovação
// (jogador) e publica a nova versão (capitão ou admin). Coleções e campos do Firestore não mudam.
import { applyChanges, type Change, itemName, KN, type SharedData, type SharedItem } from "@/shared/lib/team-changes"
import { dbGet, dbSet, fb, ONLINE } from "@/shared/api/firestore"
import { STORAGE_KEYS } from "@/shared/config/storage-keys"
import { normId } from "@/shared/lib/account-id"
import { toast } from "@/shared/lib/dom"
import { renderAdmin } from "../ui/admin"
import { setSync, updateStatus } from "../ui/status"
import { openRoute, routeRoots, writeRoute } from "./router"
import { flushImages } from "./images"
import { BKEY, canPublish, KEY, lsGet, lsSet, local, meKey, preview, SKEY, teamPath, user, pending } from "./identity"
import { loadMembership } from "./membership"
import { session, type LogEntry, type Official } from "./session"

/** Alteração com a origem anotada, como entra num envio ou na publicação. */
export type SentChange = Change & { sid: string; from: string }
type OfficialRead = { off: Official; err?: undefined } | { off?: undefined; err: "noteam" | "bad" | "net" }
type CampState = Record<string, unknown> & {
  comps?: SharedItem[]
  tactics?: SharedItem[]
  plays?: SharedItem[]
  cur?: string
  curPlay?: string
}

const emptyOfficial = (): Official => ({
  version: 0,
  at: 0,
  data: { comps: [], plays: [], tactics: [] },
  log: [],
})

export async function readOfficial(): Promise<OfficialRead> {
  if (!session.team) return { err: "noteam" }
  const doc = await dbGet(teamPath("dados"), "oficial")
  if (!doc) return { off: emptyOfficial() }
  try {
    return { off: JSON.parse(String(doc.json)) as Official }
  } catch {
    return { err: "bad" }
  }
}

/** Grava a versão oficial na cópia local, mantendo o estado "ao vivo" das jogadas. */
function writeLocal(data: SharedData, official: Official) {
  const state = (local() || {}) as CampState
  const live = new Map((state.plays || []).map(play => [play.id, play.live]))
  state.comps = data.comps
  state.tactics = data.tactics || []
  state.plays = data.plays.map(play => (live.has(play.id) ? { ...play, live: live.get(play.id) } : play))
  if (!state.comps.some(comp => comp.id === state.cur)) state.cur = state.comps[0]?.id
  if (!state.plays.some(play => play.id === state.curPlay)) state.curPlay = state.plays[0]?.id
  lsSet(KEY, state)
  lsSet(BKEY, { version: official.version, data: official.data })
}

export async function sync(options: { reload?: boolean } = {}) {
  if (!ONLINE) return setSync("Banco online não configurado", "warn")
  if (!user() || user()?.solo || !session.team) {
    updateStatus()
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
    setSync(messages[result.err], "bad")
    updateStatus(true)
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
    writeLocal(applyChanges(official.data, mine), official)
    shouldReload = true
  }
  if (shouldReload && options.reload !== false) session.reloadCamp()
  for (const note of notes) toast(note, 5000)
  updateStatus()
}

export async function refreshTeam() {
  setSync("Sincronizando com o time…", "")
  try {
    await loadMembership()
  } catch {
    // sem rede: o `sync` abaixo mostra o aviso
  }
  await sync()
  if (session.currentScreen === "admin") void renderAdmin()
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
  const submission = { id: newId(), from: account.id, at: Date.now(), baseVersion: base.version, changes }
  try {
    await dbSet(teamPath("envios"), submission.id, {
      from: meKey(),
      at: submission.at,
      json: JSON.stringify(submission),
    })
    lsSet(SKEY, [...sent, ...changes.map(change => change.h)].slice(-500))
    toast(`${changes.length} alteração(ões) enviada(s) para o capitão aprovar`)
  } catch (error) {
    toast(`Não consegui enviar para o banco do time: ${(error as Error).message}`)
  }
  updateStatus()
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
export async function publish(approved: SentChange[], rejected: SentChange[], label: string) {
  if (!session.team || !canPublish()) {
    writeRoute(routeRoots.admin)
    openRoute()
    return toast(user()?.admin ? "Desbloqueie o admin primeiro" : "Só o capitão publica a versão oficial do time")
  }
  await flushImages()
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
    data: applyChanges(current.data, approved),
    log,
  }
  try {
    await dbSet(teamPath("dados"), "oficial", { json: JSON.stringify(official), at })
  } catch (error) {
    return toast(`Não consegui publicar: ${(error as Error).message}`)
  }
  await sync()
  void renderAdmin()
  toast(`Versão oficial v${official.version} do ${session.team.name} publicada`)
}

export function listenToCampChanges() {
  addEventListener("storage", event => {
    if (event.key === STORAGE_KEYS.teamAreaState) updateStatus()
  })
}
