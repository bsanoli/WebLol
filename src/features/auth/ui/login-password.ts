// Passos de senha do acesso: jogador (entrar ou criar), admin e primeira senha de um admin novo.
import { dbSet, fb } from "@/shared/api/firestore"
import { adminEmail, dispId, playerEmail, safeName } from "@/shared/lib/account-id"
import { makeSlot, slotOf, slotRaw } from "@/shared/lib/admin-crypto"
import { $, esc } from "@/shared/lib/dom"
import { adminUnlock, setSlot } from "../model/membership"
import { meId } from "../model/identity"
import { session } from "../model/session"
import { merr, modal, mstatus, onEnter, showLoginFieldError } from "./login-dialog"
import { finishLogin, stepId } from "./login-steps"

const errorCode = (error: unknown) => {
  const value = error as { code?: string; message?: string }
  return value.code || value.message || ""
}

const playerErrorText = (code: string) =>
  /invalid-credential|wrong-password|user-not-found|email-already-in-use/.test(code)
    ? "Senha incorreta."
    : /too-many-requests/.test(code)
      ? "Muitas tentativas. Espere alguns minutos."
      : /weak-password/.test(code)
        ? "Senha fraca demais. Use pelo menos 6 caracteres."
        : `Erro: ${code}`

const BACK_AND_OK = (label: string) =>
  `<div class="row"><button data-slot="button" data-variant="outline" id="back">Voltar</button><button data-slot="button" data-variant="default" id="ok">${label}</button></div>`

/** Jogador: entra com a senha, ou cria a senha no primeiro acesso. */
export function stepPw(hasAccount: boolean) {
  const pendingId = session.pendingId ?? ""
  const id = dispId(pendingId)
  modal(
    hasAccount
      ? `<span class="eyebrow">${esc(id)}</span><h3>Digite sua senha</h3><p>Use a senha que você criou no primeiro acesso.</p>
   <label for="pw">Senha</label><input data-slot="input" type="password" id="pw" autocomplete="current-password"><div class="err"></div>
   ${BACK_AND_OK("Entrar")}`
      : `<span class="eyebrow">${esc(id)}</span><h3>Crie a sua senha</h3><p>É o seu primeiro acesso com este Riot ID. Crie uma senha para entrar de qualquer aparelho. Se esquecer a senha, peça ao admin para liberar de novo.</p>
   <label for="pw">Senha (mínimo 6 caracteres)</label><input data-slot="input" type="password" id="pw" autocomplete="new-password"><label for="pw2">Repita a senha</label><input data-slot="input" type="password" id="pw2" autocomplete="new-password"><div class="err"></div>
   ${BACK_AND_OK("Criar e entrar")}`,
  )
  $("#back").onclick = () => stepId()
  const go = async () => {
    const password = $<HTMLInputElement>("#pw").value
    const email = playerEmail(pendingId)
    if (!hasAccount) {
      if (password.length < 6) return showLoginFieldError($<HTMLInputElement>("#pw"), "Use pelo menos 6 caracteres.")
      if (password !== $<HTMLInputElement>("#pw2").value)
        return showLoginFieldError($<HTMLInputElement>("#pw2"), "Repita a mesma senha.")
    }
    $<HTMLButtonElement>("#ok").disabled = true
    mstatus(hasAccount ? "Entrando…" : "Criando a conta…")
    try {
      const { auth, au } = await fb()
      if (hasAccount) await au.signInWithEmailAndPassword(auth, email, password)
      else
        try {
          await au.createUserWithEmailAndPassword(auth, email, password)
        } catch (error) {
          if (!/email-already-in-use/.test(errorCode(error))) throw error
          await au.signInWithEmailAndPassword(auth, email, password)
        }
      await dbSet(
        "contas",
        safeName(pendingId),
        { key: safeName(pendingId), riotId: id, at: Date.now(), ...(hasAccount ? {} : { created: Date.now() }) },
        true,
      )
      await finishLogin(false)
    } catch (error) {
      $<HTMLButtonElement>("#ok").disabled = false
      merr(playerErrorText(errorCode(error)))
    }
  }
  $("#ok").onclick = () => void go()
  onEnter(() => void go())
}

export function stepAdminPw() {
  const pendingId = session.pendingId ?? ""
  modal(`<h3>Login do admin</h3><p>Este Riot ID é administrador. Digite a senha de admin.</p>
   <label for="pw">Senha</label><input data-slot="input" type="password" id="pw" autocomplete="current-password"><div id="fbw" style="display:none"><label for="fpw">Senha do Firebase (${esc(adminEmail(pendingId))})</label><input data-slot="input" type="password" id="fpw" autocomplete="current-password"></div><div class="err"></div>
   ${BACK_AND_OK("Entrar")}`)
  const go = async () => {
    $<HTMLButtonElement>("#ok").disabled = true
    mstatus("Verificando…")
    try {
      const password = $<HTMLInputElement>("#pw").value
      session.keys = await adminUnlock(password, $<HTMLInputElement>("#fpw").value)
      if (slotOf(session.admin, pendingId)?.temp) return stepNewPw(password)
      await finishLogin(true)
    } catch (error) {
      $<HTMLButtonElement>("#ok").disabled = false
      if ((error as Error).message === "fb") {
        $("#fbw").style.display = ""
        merr(
          $<HTMLInputElement>("#fpw").value
            ? "Senha do Firebase incorreta."
            : "A senha do Firebase é diferente da senha de admin. Digite a do Firebase também.",
        )
        $("#fpw").focus()
      } else merr("Senha incorreta.")
    }
  }
  $("#ok").onclick = () => void go()
  onEnter(() => void go())
  $("#back").onclick = () => stepId()
}

/** Primeiro acesso de um admin novo: troca a senha provisória pela senha dele. */
function stepNewPw(temporary: string) {
  modal(`<h3>Crie a sua senha de admin</h3><p>Você entrou com a senha provisória. Agora crie a sua senha. Só você vai saber, e ela também vira a sua senha do banco do time.</p>
   <label for="np">Nova senha (mínimo 8 caracteres)</label><input data-slot="input" type="password" id="np" autocomplete="new-password"><label for="np2">Repita a senha</label><input data-slot="input" type="password" id="np2" autocomplete="new-password"><div class="err"></div>
   <div class="row"><button data-slot="button" data-variant="default" id="ok">Salvar senha</button></div>`)
  const go = async () => {
    const first = $<HTMLInputElement>("#np")
    const second = $<HTMLInputElement>("#np2")
    if (first.value.length < 8) return showLoginFieldError(first, "Use pelo menos 8 caracteres.")
    if (first.value !== second.value) return showLoginFieldError(second, "Repita a mesma senha.")
    if (first.value === temporary) return showLoginFieldError(first, "Escolha uma senha diferente da provisória.")
    $<HTMLButtonElement>("#ok").disabled = true
    mstatus("Salvando…")
    try {
      const admin = session.admin
      if (!admin) throw new Error("noadmin")
      await setSlot(meId(), await makeSlot(await slotRaw(admin, meId(), temporary), first.value, false))
      const { auth, au } = await fb()
      await au.updatePassword(auth.currentUser, first.value)
      await finishLogin(true)
    } catch (error) {
      merr(`Erro: ${(error as Error).message}`)
      $<HTMLButtonElement>("#ok").disabled = false
    }
  }
  $("#ok").onclick = () => void go()
  onEnter(() => void go())
}
