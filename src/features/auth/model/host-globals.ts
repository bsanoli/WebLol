// O que os iframes (Área do time, Builds, Worlds) leem da janela pai. Os nomes são o contrato de
// `shared/api/host-bridge.ts`; só estes cinco ficam no `window`.
import type { HostGlobals } from "@/shared/host-bridge"
import { canManageTeam, captainAccess, renderCaptainPanel, TEAM_NAME } from "../ui/captain-panel"
import { hostImages } from "./images"

export function exposeHostGlobals() {
  const globals: HostGlobals = {
    captainAccess,
    canManageTeam,
    // biome-ignore lint/style/useNamingConvention: nome fixado pelo contrato com os iframes
    TEAM_NAME,
    renderCaptainPanel,
    weblolImages: hostImages,
  }
  Object.assign(window, globals)
}
