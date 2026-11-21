// Contrato tipado entre o app principal (`features/auth`, na janela pai) e as telas que rodam em iframe.
// Os nomes das globais são os do app principal e só mudam junto com a migração dele (Onda 4b e 4c).
// Quem roda em iframe fala com a janela pai só por aqui, e sempre com valor de reserva: aberta direto
// (sem pai), a tela continua funcionando.

/** Destino pedido pela tela do iframe ao app principal (evento `weblol:navigate` no `frameElement`). */
export type HostNavigation = {
  path: string
  replace?: boolean
  focusSource?: boolean
  onCopy?: () => void
}

type HostImageSave = { id: string; shared: boolean; by?: string; error?: string }

/** Prints e desenhos das táticas: o app principal guarda no navegador e, com time, no Firestore. */
export type HostImages = {
  save(data: string): Promise<HostImageSave>
  load(id: string, fresh?: boolean): Promise<string | null>
  flush?(): Promise<number>
  isPending?(id: string): boolean
}

/** O que o app principal expõe na janela pai. */
export type HostGlobals = {
  captainAccess?: () => boolean
  canManageTeam?: () => boolean
  TEAM_NAME?: () => string
  renderCaptainPanel?: (panel: HTMLElement) => void | Promise<void>
  weblolImages?: HostImages
}

/** O que o app principal chama na janela do iframe. */
export type FrameHandlers = {
  applyWebLolRoute?: (route: string[], params?: URLSearchParams) => Promise<boolean | void> | boolean | void
  weblolTeamChanged?: () => void
}

/** Janela pai, ou `null` quando a tela roda sozinha ou o acesso é bloqueado. */
function hostWindow(): (Window & HostGlobals) | null {
  try {
    return window.parent !== window ? (window.parent as Window & HostGlobals) : null
  } catch {
    return null
  }
}

/** Lê algo do app principal e devolve `fallback` se ele não existir ou falhar. */
export function fromHost<T>(read: (host: Window & HostGlobals) => T | undefined | null, fallback: T): T {
  try {
    const host = hostWindow()
    return (host && read(host)) ?? fallback
  } catch {
    return fallback
  }
}

export const hostElement = (id: string): HTMLElement | null => fromHost(host => host.document.getElementById(id), null)

export const hostImages = (): HostImages | null => {
  const images = fromHost(host => host.weblolImages, null)
  return images && typeof images.save === "function" && typeof images.load === "function" ? images : null
}

export const hostHasCaptainAccess = () => !!fromHost(host => host.captainAccess?.(), false)
export const hostCanManageTeam = () => !!fromHost(host => host.canManageTeam?.(), false)
export const hostTeamName = () => fromHost(host => host.TEAM_NAME?.(), "")

/** Pede ao app principal para abrir um destino (rota, cópia de link). Fora de um iframe, não faz nada. */
export function navigateHost(detail: HostNavigation) {
  window.frameElement?.dispatchEvent(new CustomEvent<HostNavigation>("weblol:navigate", { detail }))
}

/** A tela está dentro de um iframe do app principal (e não aberta sozinha). */
export const isEmbedded = () => window.frameElement !== null

/** Avisos sem dados que a tela manda ao app principal. */
type HostSignal = "weblol:route-ready" | "weblol:analytics-clear"

export function signalHost(name: HostSignal) {
  window.frameElement?.dispatchEvent(new CustomEvent(name))
}

/** Entrega ao app principal os dados do painel de análise, que ele desenha na tela. */
export function sendHostAnalytics<T extends object>(detail: T) {
  window.frameElement?.dispatchEvent(new CustomEvent<T>("weblol:analytics", { detail }))
}

/** Funções que o app principal chama nesta janela. */
export function exposeFrameHandlers(handlers: FrameHandlers) {
  Object.assign(window, handlers)
}
