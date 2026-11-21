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

function imageLocal(id: string, data?: string) {
  try {
    if (data) localStorage.setItem(STORAGE_PREFIXES.screenshotCache + id, data)
    else return localStorage.getItem(STORAGE_PREFIXES.screenshotCache + id)
  } catch {
    return null
  }
}

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
    imageLocal(id, data)
    if (!canShareImages()) {
      setPendingImages([...pendingImages(), id])
      return { id, shared: false }
    }
    try {
      await uploadImage(id, data)
      return { id, shared: true }
    } catch (error) {
      setPendingImages([...pendingImages(), id])
      return { id, shared: false, error: (error as Error).message }
    }
  },
  async load(id) {
    const cached = imageCache.get(id)
    if (cached) return cached
    let data = imageLocal(id)
    if (!data && session.team) {
      try {
        data = ((await dbGet(teamPath("imagens"), id))?.data as string | undefined) || null
      } catch {
        data = null
      }
    }
    if (data) imageCache.set(id, data)
    return data ?? null
  },
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
