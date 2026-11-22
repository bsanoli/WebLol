// Prints e desenhos das táticas: o app principal guarda cada um à parte (window.weblolImages, em
// times/{time}/imagens); aberta sozinha, a página guarda só neste navegador.
import { hostImages } from "@/shared/host-bridge"
import { STORAGE_PREFIXES } from "@/shared/config"
import { uid } from "../model/local-state"

export type SavedImage = { id: string; shared: boolean; by?: string; error?: string }

export type PrintStore = {
  save(data: string): Promise<SavedImage>
  load(id: string, fresh?: boolean): Promise<string | null>
  /** Só no app principal: o print ainda está apenas neste navegador. */
  isPending?(id: string): boolean
  /** Só no app principal: tenta enviar de novo os prints pendentes. */
  retry?(): Promise<number>
}

const LOCAL_PREFIX = STORAGE_PREFIXES.screenshotCache

const localImages: PrintStore = {
  async save(data) {
    const id = `local-${uid()}`
    try {
      localStorage.setItem(LOCAL_PREFIX + id, data)
    } catch {
      /* sem espaço: a imagem vale só nesta sessão */
    }
    return { id, shared: false }
  },
  async load(id) {
    try {
      return localStorage.getItem(LOCAL_PREFIX + id)
    } catch {
      return null
    }
  },
}

export const printStore = (): PrintStore => {
  const host = hostImages()
  if (!host) return localImages
  return {
    save: data => host.save(data),
    load: (id, fresh) => host.load(id, fresh),
    isPending: id => host.isPending?.(id) ?? false,
    retry: () => host.flush?.() ?? Promise.resolve(0),
  }
}
