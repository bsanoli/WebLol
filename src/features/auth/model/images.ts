// Prints das táticas. Cada print fica num documento próprio em times/{time}/imagens/{id}, fora dos dados
// do time (limite de 1 MB). Sem time (ou se o envio falhar) o print fica neste navegador numa fila e é
// reenviado com o mesmo id ao sincronizar, enviar ou publicar, para que todo o time consiga vê-lo.
import type { HostImages } from "@/shared/host-bridge"
import { dbGet, dbSet } from "@/shared/firestore"
import { STORAGE_KEYS, STORAGE_PREFIXES } from "@/shared/config"
import { toast } from "@/shared/lib/dom"
import { lsGet, lsSet, meId, teamPath, user } from "./identity"
import { session } from "./session"

const imageCache = new Map<string, string>()
/** Prints que o time ainda não tinha na última consulta: evita ir ao banco a cada vez que o print aparece na tela. */
const missingUntil = new Map<string, number>()
const MISSING_TTL = 15_000
const LOAD_TIMEOUT = 8_000

function imageLocal(id: string): string | null
function imageLocal(id: string, data: string): boolean
function imageLocal(id: string, data?: string) {
  try {
    if (data) {
      localStorage.setItem(STORAGE_PREFIXES.screenshotCache + id, data)
      return true
    }
    return localStorage.getItem(STORAGE_PREFIXES.screenshotCache + id)
  } catch {
    return data ? false : null
  }
}

const withTimeout = <T>(work: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("tempo esgotado")), ms)
    work.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })

const pendingImages = () => {
  const list = lsGet<unknown>(STORAGE_KEYS.pendingScreenshots, [])
  return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : []
}
const setPendingImages = (ids: string[]) => lsSet(STORAGE_KEYS.pendingScreenshots, [...new Set(ids)].slice(-300))
const canShareImages = () => !!(session.team && user() && !user()?.solo)
const uploadImage = (id: string, data: string) => dbSet(teamPath("imagens"), id, { data, at: Date.now(), by: meId() })

let flushing: Promise<number> | null = null

/** Contrato com os iframes: `window.weblolImages` (ver `host-bridge.ts`). */
export const hostImages: HostImages = {
  async save(data) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    imageCache.set(id, data)
    const by = user()?.id
    const stored = imageLocal(id, data)
    if (!canShareImages()) {
      setPendingImages([...pendingImages(), id])
      return { id, shared: false, by, ...(stored ? {} : { error: "sem espaço neste navegador" }) }
    }
    try {
      await uploadImage(id, data)
      return { id, shared: true, by }
    } catch (error) {
      setPendingImages([...pendingImages(), id])
      return { id, shared: false, by, error: (error as Error).message }
    }
  },
  async load(id, fresh) {
    const cached = imageCache.get(id)
    if (cached) return cached
    let data = imageLocal(id)
    if (fresh) missingUntil.delete(id)
    if (!data && session.team && (missingUntil.get(id) ?? 0) < Date.now()) {
      try {
        data = ((await withTimeout(dbGet(teamPath("imagens"), id), LOAD_TIMEOUT))?.data as string | undefined) || null
      } catch {
        data = null
      }
      if (!data) missingUntil.set(id, Date.now() + MISSING_TTL)
    }
    if (data) {
      imageCache.set(id, data)
      missingUntil.delete(id)
    }
    return data ?? null
  },
  /** Este print ainda está só neste navegador (o envio ao time falhou ou não havia time). */
  isPending: id => pendingImages().includes(id),
  /** Reenvia os prints que ficaram só neste navegador. Devolve quantos continuam pendentes. */
  flush() {
    if (flushing) return flushing
    flushing = (async () => {
      const ids = pendingImages()
      if (!ids.length || !canShareImages()) return ids.length
      const left: string[] = []
      for (const id of ids) {
        const data = imageCache.get(id) || imageLocal(id)
        if (!data) continue // apagado deste navegador: não há o que enviar
        try {
          await uploadImage(id, data)
          missingUntil.delete(id)
        } catch (error) {
          const code = (error as { code?: string } | null)?.code
          if (code === "permission-denied" && (await dbGet(teamPath("imagens"), id).catch(() => null))) continue
          left.push(id)
        }
      }
      setPendingImages([...left, ...pendingImages().filter(id => !ids.includes(id))])
      return pendingImages().length
    })().finally(() => {
      flushing = null
    })
    return flushing
  },
}

export async function flushImages() {
  const left = await hostImages.flush?.().catch(() => pendingImages().length)
  if (left) toast(`${left} print(s) ainda não chegaram ao time. Tente sincronizar de novo.`, 5000)
}

/** Ids de prints (imagem, cena e prévia) usados por uma tática. */
function printIdsOf(value: unknown, ids = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) printIdsOf(item, ids)
    return ids
  }
  if (!value || typeof value !== "object") return ids
  const node = value as {
    type?: unknown
    attrs?: Record<string, unknown>
    content?: unknown
    doc?: unknown
    images?: unknown
  }
  if (node.type === "tacticPrint") {
    for (const key of ["src", "sketch", "preview"]) {
      const id = node.attrs?.[key]
      if (typeof id === "string" && id) ids.add(id)
    }
  }
  if (Array.isArray(node.images)) for (const id of node.images) if (typeof id === "string" && id) ids.add(id)
  printIdsOf(node.content, ids)
  printIdsOf(node.doc, ids)
  return ids
}

/** Separa o que pode seguir do que aponta para um print que ainda não chegou ao time. */
export function splitByPendingPrints<T extends { after?: unknown }>(changes: T[]) {
  const waiting = new Set(pendingImages())
  if (!waiting.size) return { ready: changes, held: [] as T[] }
  const ready: T[] = []
  const held: T[] = []
  for (const change of changes) {
    const blocked = [...printIdsOf(change.after)].some(id => waiting.has(id))
    ;(blocked ? held : ready).push(change)
  }
  return { ready, held }
}
