// Gestão do time: todo o time vê; só o capitão e admins agem. Os dados vêm do app principal (a janela pai).
import { $ } from "./team-store"

type CaptainHost = {
  captainAccess?: () => boolean
  canManageTeam?: () => boolean
  TEAM_NAME?: () => string
  renderCaptainPanel?: (panel: HTMLElement) => void
}

const host = () => window.parent as unknown as CaptainHost | undefined

/** Chama uma função do app principal e devolve `fallback` se ela não existir ou falhar. */
function fromHost<T>(read: (host: CaptainHost) => T | undefined, fallback: T): T {
  try {
    const current = host()
    return (current && read(current)) ?? fallback
  } catch {
    return fallback
  }
}

export const hasCaptainAccess = () => !!fromHost(h => h.captainAccess?.(), false)

export function renderCaptain() {
  const name = fromHost(h => h.TEAM_NAME?.(), "")
  const manage = !!fromHost(h => h.canManageTeam?.(), false)
  if (name)
    $("#cap-sub").textContent = manage
      ? `${name}: aceite pedidos, gerencie os jogadores e veja o histórico das comps do time.`
      : `${name}: jogadores do time e histórico das comps.`
  host()?.renderCaptainPanel?.($("#cap"))
}
