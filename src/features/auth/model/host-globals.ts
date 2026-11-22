// O que os iframes (Área do time, Builds, Worlds) leem da janela pai. Os nomes são o contrato de
// `shared/host-bridge/host-bridge.ts`; só estes seis ficam no `window`.
import type { HostGlobals } from "@/shared/host-bridge"
import { canManageTeam, hasCaptainAccess, renderCaptainPanel, TEAM_NAME } from "../ui/captain-panel"
import { IS_ONLINE } from "@/shared/firestore"
import { itemName } from "@/shared/lib/team-changes"
import { hostImages } from "./images"
import { pending, user } from "./identity"
import { session } from "./session"

/** Rascunho da Área do time para o botão de salvamento do iframe. */
function weblolDraft() {
  const synced = !!user() && !user()?.solo && !!session.team && IS_ONLINE && !!session.net && !!session.off
  const changes = synced ? pending().map(change => ({ kind: change.kind, op: change.op, name: itemName(change) })) : []
  return { synced, version: synced ? (session.off?.version ?? null) : null, changes }
}

export function exposeHostGlobals() {
  const globals: HostGlobals = {
    captainAccess: hasCaptainAccess,
    canManageTeam,
    TEAM_NAME,
    renderCaptainPanel,
    weblolImages: hostImages,
    weblolDraft,
  }
  Object.assign(window, globals)
}
