// Partida do painel: liga o endereço, reconecta a conta salva e confere o time a cada minuto.
import { currentFirebase, fb, ONLINE } from "@/shared/firestore"
import { idbGet } from "@/shared/local-keys"
import { $, toast } from "@/shared/lib/dom"
import { closeModal } from "../ui/login-dialog"
import { stepId } from "../ui/login-steps"
import { renderAdmin } from "../ui/admin"
import { setSync, updateStatus } from "../ui/status"
import { enterTeam, logout } from "../ui/team-step"
import { GKEY, isSignedInAs, KEY, lsGet, preview, UKEY, user } from "./identity"
import { clearTeamData, loadAdminKey, loadMembership } from "./membership"
import { openRoute, startRouter, writeRoute, routeRoots } from "./router"
import { session } from "./session"
import { bindUiHooks } from "./ui-hooks"
import { listenToCampChanges, readOfficial, sync } from "./sync"

const MINUTE = 60_000

/** Login antigo (sem senha) ou sessão expirada: pede para entrar de novo com a senha. */
function askToSignInAgain(accountId: string) {
  session.pendingId = accountId
  localStorage.removeItem(UKEY)
  clearTeamData()
  session.keys = null
  session.reloadCamp()
  updateStatus()
  if (session.currentScreen === "admin") {
    writeRoute(routeRoots.camp)
    openRoute()
  }
  if (session.currentScreen === "camp" && !session.dismissLogin) {
    stepId()
    toast("Agora cada jogador entra com Riot ID e senha. Crie a sua senha para continuar.", 7000)
  }
}

async function reconnect() {
  const account = user()
  if (!account || !ONLINE) return
  setSync("Conectando ao time…", "")
  try {
    await fb()
  } catch {
    // sem rede: o time local continua valendo
  }
  if (!currentFirebase()) return
  if (!isSignedInAs(account.id)) return askToSignInAgain(account.id)
  if (account.admin)
    try {
      await loadAdminKey()
    } catch {
      // sem rede: a Administração pede de novo
    }
  await enterTeam()
}

async function checkPendingMembership() {
  try {
    await loadMembership()
  } catch {
    return
  }
  if (!session.team) return
  toast(`Você foi aceito no time ${session.team.name}!`, 6000)
  if (session.dismissLogin) closeModal()
  await sync()
}

async function checkOfficialVersion() {
  let result: Awaited<ReturnType<typeof readOfficial>>
  try {
    result = await readOfficial()
  } catch {
    return
  }
  const known = session.off
  if (!result.off || (session.net && known && result.off.version === known.version)) return
  const isNewVersion = result.off.version !== known?.version
  await sync()
  if (session.net && isNewVersion && session.off) toast(`Nova versão oficial v${session.off.version} carregada`)
}

async function pollTeam() {
  if (!ONLINE || !user() || !currentFirebase()?.auth.currentUser) return
  if (session.team) return checkOfficialVersion()
  if (session.memb?.status === "pendente") await checkPendingMembership()
}

/** Chamada uma vez pelo `app` depois que o HTML do painel existe. */
export async function startPanel() {
  bindUiHooks({ renderAdmin: () => void renderAdmin(), setSync, updateStatus })
  startRouter()
  listenToCampChanges()
  $("#logout").onclick = () => void logout()
  if (user()?.solo || (!user() && (lsGet(GKEY) || preview() === "guest"))) localStorage.removeItem(KEY) // sem time ou sem usuário: nada fica salvo entre uma visita e outra
  session.keys = user()?.admin ? await idbGet("adminKeys") : null
  updateStatus()
  openRoute()
  await reconnect()
  setInterval(() => void pollTeam(), MINUTE)
}
