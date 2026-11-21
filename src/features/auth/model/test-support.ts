// Doubles dos testes do slice: armazenamento do navegador em memória e estado da sessão limpo.
import { vi } from "vitest"
import { session } from "./session"

/** Troca o `localStorage` por um Map; devolve o Map para o teste conferir o que foi gravado. */
export function stubStorage(initial: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]))
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  })
  return store
}

/** Volta `session` ao estado de quem acabou de abrir o app. */
export function resetSession() {
  Object.assign(session, {
    admin: null,
    keys: null,
    off: null,
    team: null,
    memb: null,
    pendingId: null,
    teamsCache: null,
    net: false,
    dismissLogin: undefined,
    currentScreen: undefined,
    currentFrame: undefined,
    reloadCamp: () => {},
  })
}
