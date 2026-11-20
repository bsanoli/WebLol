// Escolha de time depois do login (criar, pedir para entrar, usar sem time) e saída da conta.
import { dbDel, dbList, dbSet, currentFirebase } from "@/shared/api/firestore"
import { idbDel } from "@/shared/api/local-keys"
import { $, esc, toast } from "@/shared/lib/dom"
import { confirmAction } from "@/shared/ui/dialog-controls"
import { clearTeamData, guardTeam, loadMembership } from "../model/membership"
import { migrateToTeams } from "../model/migrate"
import { openRoute, routeRoots, writeRoute } from "../model/router"
import { session, type Team } from "../model/session"
import { sync } from "../model/sync"
import {
  GKEY,
  isAdminViewer,
  isSignedInAs,
  lsGet,
  lsSet,
  meKey,
  preview,
  realUser,
  UKEY,
  user,
} from "../model/identity"
import { renderAdmin } from "./admin"
import { closeModal, merr, modal, mstatus } from "./login-dialog"
import { stepId } from "./login-steps"
import { updateStatus } from "./status"
import { createTeamRecords } from "../model/team-create"

/** Login e escolha de time só aparecem na Área do time. */
export function askOnCamp() {
  if (session.currentScreen !== "camp" || session.dismissLogin) return
  const account = user()
  if (!account) {
    if (!lsGet(GKEY) && !preview()) stepId()
    return
  }
  if (currentFirebase() && isSignedInAs(account.id) && !session.team && !account.solo && !preview()) void stepTeam()
}

/** Depois do login: entra no time, ou mostra a tela de time. */
export async function enterTeam() {
  if (user()?.admin && isAdminViewer()) {
    try {
      if (await migrateToTeams()) toast("Time Fraldinha montado com todos os usuários e as comps salvas", 5000)
    } catch (error) {
      toast(`Não consegui montar o time Fraldinha: ${(error as Error).message}`, 6000)
    }
  }
  try {
    await loadMembership()
  } catch {
    session.team = null
  }
  updateStatus()
  if (session.team) {
    closeModal()
    await sync()
    if (session.currentScreen === "admin") void renderAdmin()
    return
  }
  if (user()?.solo) {
    closeModal()
    return
  }
  if (session.currentScreen === "camp" && !preview()) void stepTeam()
  else closeModal()
}

function renderPendingStep(accountId: string) {
  const membership = session.memb
  modal(`<span class="eyebrow">${esc(accountId)}</span><h3>Aguardando o capitão</h3><p>Você pediu para entrar no time <b>${esc(membership?.teamName || membership?.team || "")}</b>. Assim que o capitão aceitar, as comps do time aparecem aqui.</p><div class="err"></div>
     <div class="row"><button data-slot="button" data-variant="outline" id="cancel">Cancelar pedido</button><button data-slot="button" data-variant="outline" id="solo">Usar sem time</button><button data-slot="button" data-variant="default" id="check">Verificar de novo</button></div>`)
  $("#cancel").onclick = async () => {
    try {
      await dbDel("membros", meKey())
      session.memb = null
      await stepTeam()
    } catch (error) {
      merr(`Erro: ${(error as Error).message}`)
    }
  }
  $("#check").onclick = async () => {
    mstatus("Verificando…")
    await enterTeam()
    if (!session.team) mstatus("O pedido continua aguardando a aprovação do capitão.")
  }
  $("#solo").onclick = useSolo
}

/** Tela de time: sem time ou com pedido pendente. */
export async function stepTeam() {
  const account = user()
  if (!account) return stepId()
  if (session.memb?.status === "pendente") return renderPendingStep(account.id)
  let teams: Team[] = []
  try {
    teams = (await dbList("times")) as unknown as Team[]
  } catch {
    // sem rede: mostra só a opção de criar
  }
  const options = [...teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      team =>
        `<option value="${esc(team.id)}">${esc(team.name)} (capitão ${esc(team.captainId || team.captain)})</option>`,
    )
    .join("")
  modal(`<span class="eyebrow">${esc(account.id)}</span><h3>Você ainda não está em um time</h3><p>Crie um time (você vira o capitão) ou peça para entrar em um time. Sem time, você pode montar comps, mas elas não são salvas.</p>
   <label for="tname">Criar um time</label><div class="rid"><input data-slot="input" id="tname" placeholder="Nome do time" maxlength="24" autocomplete="off"><button data-slot="button" data-variant="default" id="create">Criar time</button></div>
   ${
     teams.length
       ? `<label for="tjoin">Pedir para entrar em um time</label><div class="rid"><select id="tjoin" data-slot="select">${options}</select><button data-slot="button" data-variant="outline" id="join">Pedir para entrar</button></div>`
       : ""
   }
   <div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="outline" id="solo">Usar sem time</button></div>`)
  $("#solo").onclick = useSolo
  $("#create").onclick = async () => {
    const name = $<HTMLInputElement>("#tname").value.trim()
    if (name.length < 2) return merr("Digite o nome do time.")
    if (teams.some(team => team.name.toLowerCase() === name.toLowerCase()))
      return merr("Já existe um time com esse nome.")
    $<HTMLButtonElement>("#create").disabled = true
    mstatus("Criando o time…")
    try {
      await createTeamRecords(name, account.id)
      lsSet(UKEY, { ...realUser(), solo: false })
      await enterTeam()
      toast(`Time ${name} criado. Você é o capitão.`, 5000)
    } catch (error) {
      merr(`Erro: ${(error as Error).message}`)
      $<HTMLButtonElement>("#create").disabled = false
    }
  }
  const join = document.querySelector<HTMLButtonElement>("#join")
  if (join)
    join.onclick = async () => {
      const team = $<HTMLSelectElement>("#tjoin").value
      join.disabled = true
      try {
        await dbSet("membros", meKey(), { team, status: "pendente", riotId: account.id, at: Date.now() })
        lsSet(UKEY, { ...realUser(), solo: false })
        await enterTeam()
      } catch (error) {
        merr(`Erro: ${(error as Error).message}`)
        join.disabled = false
      }
    }
  $("#tname").addEventListener("keydown", event => {
    if ((event as KeyboardEvent).key === "Enter") $("#create").click()
  })
}

/** Sem time: pode montar comps, mas nada é salvo (a cópia local é apagada ao recarregar). */
function useSolo() {
  lsSet(UKEY, { ...realUser(), solo: true })
  guardTeam()
  closeModal()
  updateStatus()
  toast("Usando sem time: as comps feitas não são salvas.", 5000)
}

/** Botão "Sair" do menu da conta. */
export async function logout() {
  if (!user()) return stepId()
  if (!(await confirmAction("Sair deste usuário neste aparelho? As comps do time continuam salvas no banco do time.")))
    return
  localStorage.removeItem(UKEY)
  clearTeamData()
  await idbDel("adminKeys")
  session.keys = null
  try {
    const firebase = currentFirebase()
    if (firebase) await firebase.au.signOut(firebase.auth)
  } catch {
    // já estava desconectado
  }
  session.reloadCamp()
  updateStatus()
  session.pendingId = null
  if (session.currentScreen === "admin") {
    writeRoute(routeRoots.camp)
    openRoute()
  }
  if (session.currentScreen === "camp" && !session.dismissLogin) stepId()
}
