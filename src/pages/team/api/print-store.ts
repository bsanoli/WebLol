// Prints e desenhos das táticas: o app principal guarda cada um à parte (window.weblolImages, em
// times/{time}/imagens); aberta sozinha, a página guarda só neste navegador.
import { hostImages } from "@/shared/host-bridge"
import { STORAGE_PREFIXES } from "@/shared/config"
import { uid } from "../model/local-state"

type SavedImage = { id: string; shared: boolean; error?: string }

export type PrintStore = {
  save(data: string): Promise<SavedImage>
  load(id: string): Promise<string | null>
}

const LOCAL_PREFIX = STORAGE_PREFIXES.screenshotCache

const localImages: PrintStore = {
  async save(data) {
    const id = "local-" + uid()
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

export const printStore = (): PrintStore => hostImages() ?? localImages
