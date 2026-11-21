// Aba Administração (admin e capitão): desbloqueio, leitura do banco, montagem e ações.
import { fb, ONLINE } from "@/shared/firestore"
import { $, esc } from "@/shared/lib/dom"
import { loadAdminData } from "../model/admin-data"
import { isCaptain, isFirebaseAdmin, pending, preview, user } from "../model/identity"
import { adminUnlock, loadAdminKey } from "../model/membership"
import { session, type Account } from "../model/session"
import { bindAdminActions, bindTeamActions } from "./admin-actions"
import { adminSectionHtml, teamSectionHtml } from "./admin-html"
import { decorateManagementTables } from "./table-slots"
import { enterTeam } from "./team-step"

const PANEL = (html: string) => `<div class="wl-panel card">${html}</div>`

function renderUnlockForm(region: HTMLElement) {
  region.innerHTML = PANEL(`<h2>Desbloquear Administração</h2><p>Use sua senha de administrador neste aparelho.</p>
      <div class="admin-form"><div data-slot="field"><label for="apw">Senha de administrador</label><input data-slot="input" type="password" id="apw" autocomplete="current-password"></div>
      <div data-slot="field" id="afw" hidden><label for="afpw">Senha do Firebase</label><input data-slot="input" type="password" id="afpw" autocomplete="current-password"></div>
      <div class="bad" id="aerr" role="alert"></div><button data-slot="button" data-variant="default" id="aok">Desbloquear</button></div>`)
  const go = async () => {
    try {
      session.keys = await adminUnlock($<HTMLInputElement>("#apw").value, $<HTMLInputElement>("#afpw").value)
      await enterTeam()
      void renderAdmin()
    } catch (error) {
      if ((error as Error).message === "fb") {
        $("#afw").hidden = false
        $("#aerr").textContent = "Digite também a senha do Firebase."
        $("#afpw").focus()
      } else {
        $("#aerr").textContent = "Senha incorreta. Confira e tente novamente."
        $("#apw").focus()
      }
    }
  }
  $("#aok").onclick = () => void go()
  for (const input of region.querySelectorAll("input"))
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") void go()
    })
}

/** Garante a chave do admin e o desbloqueio. Devolve `false` quando a tela já foi preenchida com um aviso. */
async function ensureAdminAccess(region: HTMLElement) {
  if (!session.admin) {
    try {
      await loadAdminKey()
    } catch {
      // sem rede: o aviso abaixo cobre
    }
  }
  if (!session.admin) {
    region.innerHTML = `<div class="wl-panel card admin-status-row"><span role="status">Não foi possível conectar ao banco do time.</span><button data-slot="button" data-variant="outline" id="refresh">Tentar novamente</button></div>`
    $("#refresh").onclick = () => void renderAdmin()
    return false
  }
  if (!session.keys || !isFirebaseAdmin()) {
    renderUnlockForm(region)
    return false
  }
  return true
}

function lockForPreview(region: HTMLElement) {
  region.insertAdjacentHTML(
    "afterbegin",
    `<div class="wl-panel card mut">Visualização como capitão: os botões ficam desativados. Volte para a visão de admin no menu da conta para agir.</div>`,
  )
  for (const control of region.querySelectorAll<HTMLButtonElement>("button,input,select")) control.disabled = true
}

export async function renderAdmin() {
  const region = $("#admin")
  const account: Account | null = user()
  if (!account || (!account.admin && !isCaptain())) return
  if (!ONLINE) {
    region.innerHTML = PANEL("O banco online ainda não foi configurado neste app.")
    return
  }
  try {
    await fb()
  } catch {
    // sem rede: a leitura abaixo mostra o erro
  }
  if (account.admin && !(await ensureAdminAccess(region))) return
  region.innerHTML = `<p class="mut" role="status">Carregando…</p>`
  let data: Awaited<ReturnType<typeof loadAdminData>>
  try {
    data = await loadAdminData(account.admin)
  } catch (error) {
    region.innerHTML = `<div data-slot="alert" role="alert" class="wl-panel card bad">Não consegui ler o banco: ${esc((error as Error).message)}</div>`
    return
  }
  const mine = pending()
  region.innerHTML = teamSectionHtml(data, mine) + (account.admin ? adminSectionHtml(data, account) : "")
  decorateManagementTables(region)
  if (preview()) return lockForPreview(region)
  const again = () => void renderAdmin()
  bindTeamActions(region, data, mine, account, again)
  if (account.admin) bindAdminActions(region, data, account, again)
}
