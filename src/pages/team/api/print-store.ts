// Prints e desenhos das táticas: o app principal guarda cada um à parte (window.weblolImages, em
// times/{time}/imagens); aberta sozinha, a página guarda só neste navegador.
import { uid } from "../model/local-state"

export type SavedImage = { id: string; shared: boolean; error?: string }

export type PrintStore = {
  save(data: string): Promise<SavedImage>
  load(id: string): Promise<string | null>
}

const LOCAL_PREFIX = "lol-img-"

const localImages: PrintStore = {
  async save(data) {
    const id = "local-" + uid()
    try { localStorage.setItem(LOCAL_PREFIX + id, data) } catch { /* sem espaço: a imagem vale só nesta sessão */ }
    return { id, shared: false }
  },
  async load(id) {
    try { return localStorage.getItem(LOCAL_PREFIX + id) } catch { return null }
  },
}

function isPrintStore(value: unknown): value is PrintStore {
  const store = value as PrintStore | undefined
  return !!store && typeof store.save === "function" && typeof store.load === "function"
}

export function printStore(): PrintStore {
  try {
    const shared = (window.parent as Window & { weblolImages?: unknown }).weblolImages
    return isPrintStore(shared) ? shared : localImages
  } catch {
    return localImages
  }
}
