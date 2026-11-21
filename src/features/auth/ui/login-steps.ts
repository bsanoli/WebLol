// Primeiros passos do acesso: Riot ID, conexão com o banco e entrada sem usuário.
import { dbGet, fb, ONLINE } from "@/shared/firestore"
import { dispId, isAdminId, safeName } from "@/shared/lib/account-id"
import { slotOf } from "@/shared/lib/admin-crypto"
import { $, toast } from "@/shared/lib/dom"
import { loadAdminKey } from "../model/membership"
import { openRoute, routeRoots, writeRoute } from "../model/router"
import { session } from "../model/session"
import { BKEY, GKEY, KEY, lsSet, preview, SKEY, TKEY, UKEY } from "../model/identity"
import { closeModal, merr, modal, mstatus, showLoginFieldError } from "./login-dialog"
import { stepAdminPw, stepPw } from "./login-password"
import { enterTeam } from "./team-step"
import { updateStatus } from "./status"

const NO_CONNECTION = "Não consegui conectar ao banco do time. Verifique a internet."

export function stepId() {
  modal(`<h3>Entre com seu Riot ID</h3><p>Use o nome e a tag do League of Legends. Você cria uma senha no primeiro acesso.</p>

   <div class="rid rid-fields"><div><label for="rname">Nome no LoL</label><input data-slot="input" id="rname" placeholder="Ex.: brunoltz" maxlength="16" autocomplete="username" spellcheck="false"></div><div><label for="rtag">Tag depois do #</label><input data-slot="input" id="rtag" placeholder="Ex.: LTZ" maxlength="5" autocomplete="off" spellcheck="false"></div></div>
   <div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="outline" id="guest" aria-describedby="guest-note">Entrar sem usuário</button><button data-slot="button" data-variant="default" id="ok">Continuar</button></div>
   <p id="guest-note" class="login-guest-note">As alterações feitas sem usuário somem ao recarregar.</p>`)
  $("#guest").onclick = useGuest
  const nameInput = $<HTMLInputElement>("#rname")
  const tagInput = $<HTMLInputElement>("#rtag")
  if (session.pendingId) {
    const [name = "", tag = ""] = dispId(session.pendingId).split("#")
    nameInput.value = name
    tagInput.value = tag
  }
  const go = () => {
    const name = nameInput.value.trim()
    const tag = tagInput.value.replace(/[#\s]/g, "").toUpperCase()
    if (name.length < 3) return showLoginFieldError(nameInput, "Digite pelo menos 3 caracteres.")
    if (!/^[A-Za-z0-9]{2,5}$/.test(tag)) return showLoginFieldError(tagInput, "Digite 2 a 5 letras ou números.")
    session.pendingId = `${name}#${tag}`
    void afterId()
  }
  // se a pessoa digitar ou colar "nome#TAG" no primeiro campo, separa sozinho
  nameInput.addEventListener("input", () => {
    if (!nameInput.value.includes("#")) return
    const [name = "", ...rest] = nameInput.value.split("#")
    nameInput.value = name.trim()
    tagInput.value = (rest.join("") + tagInput.value).replace(/\s/g, "").slice(0, 5)
    tagInput.focus()
  })
  tagInput.addEventListener("input", () => {
    const position = tagInput.selectionStart ?? 0
    tagInput.value = tagInput.value.replace(/[#\s]/g, "").toUpperCase()
    tagInput.setSelectionRange(position, position)
  })
  nameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault()
      tagInput.focus()
    }
  })
  tagInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault()
      go()
    }
    if (event.key === "Backspace" && !tagInput.value) nameInput.focus()
  })
  $("#ok").onclick = go
}

async function afterId() {
  mstatus("Conectando ao banco do time…")
  if (!ONLINE) return merr("O banco online ainda não foi configurado neste app.")
  try {
    await fb()
  } catch {
    return merr(NO_CONNECTION)
  }
  const id = session.pendingId ?? ""
  if (isAdminId(id)) {
    let problem: string
    try {
      problem = await loadAdminKey()
    } catch {
      problem = "net"
    }
    if (problem === "net") return merr(NO_CONNECTION)
    if (problem)
      return merr("A chave do admin no banco não é a original. Por segurança o login de admin foi bloqueado.")
    if (!slotOf(session.admin, id))
      return merr(
        "Este Riot ID ainda não foi liberado como admin. Peça ao Bruno para adicionar você na aba Administração.",
      )
    return stepAdminPw()
  }
  let account: unknown
  try {
    account = await dbGet("contas", safeName(id))
  } catch {
    return merr(NO_CONNECTION)
  }
  stepPw(!!account)
}

export async function finishLogin(isAdmin: boolean) {
  localStorage.removeItem(GKEY)
  lsSet(UKEY, { id: dispId(session.pendingId ?? ""), admin: isAdmin, created: Date.now() })
  await enterTeam()
  if (session.team) toast(`Bem-vindo, ${dispId(session.pendingId ?? "")}!`)
}

/** Botão "Entrar ou criar conta" do cabeçalho: abre o login na Área do time. */
export function startSignup() {
  if (preview())
    return toast("Você está vendo como quem não tem conta. Volte para a visão de admin no menu da conta.", 5000)
  localStorage.removeItem(GKEY)
  writeRoute(routeRoots.camp)
  openRoute()
  stepId()
}

/** Área do time sem usuário: dá para montar comps, mas nada é salvo (apaga ao recarregar). */
function useGuest() {
  lsSet(GKEY, true)
  for (const key of [KEY, BKEY, SKEY]) localStorage.removeItem(key)
  lsSet(TKEY, "__guest__")
  closeModal()
  session.reloadCamp()
  updateStatus()
  toast("As alterações feitas sem usuário somem ao recarregar.", 5000)
}
