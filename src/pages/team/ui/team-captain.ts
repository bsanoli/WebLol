// Gestão do time: todo o time vê; só o capitão e admins agem. Os dados vêm do app principal (a janela pai).
import { fromHost, hostCanManageTeam, hostHasCaptainAccess, hostTeamName } from "@/shared/host-bridge"
import { $ } from "./team-store"

export const hasCaptainAccess = hostHasCaptainAccess

export function renderCaptain() {
  const name = hostTeamName()
  const manage = hostCanManageTeam()
  if (name)
    $("#cap-sub").textContent = manage
      ? `${name}: aceite pedidos, gerencie os jogadores e veja o histórico das comps do time.`
      : `${name}: jogadores do time e histórico das comps.`
  void fromHost(host => host.renderCaptainPanel?.($("#cap")), undefined)
}
