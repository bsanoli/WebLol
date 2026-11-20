// Diálogo de acesso: monta o conteúdo de cada passo, mostra erros e estados e fecha o diálogo.
import { showDialog } from "@/shared/ui/dialog-controls"
import { $ } from "@/shared/lib/dom"
import { session } from "../model/session"

export function closeModal() {
  session.dismissLogin?.()
  session.dismissLogin = undefined
}

/** Troca o conteúdo do diálogo de acesso; abre o diálogo se ainda não estiver aberto. */
export function modal(html: string) {
  document.dispatchEvent(new Event("weblol:close-account"))
  const box =
    document.querySelector<HTMLElement>("#mbox") || Object.assign(document.createElement("div"), { id: "mbox" })
  box.innerHTML = html
  const error = box.querySelector(".err")
  if (error) {
    error.setAttribute("role", "alert")
    const status = document.createElement("div")
    status.className = "login-status"
    status.setAttribute("role", "status")
    error.after(status)
  }
  for (const label of box.querySelectorAll("label[for]")) {
    const input = label.nextElementSibling
    if (input?.tagName !== "INPUT") continue
    const field = document.createElement("div")
    field.dataset.slot = "field"
    label.before(field)
    field.append(label, input)
  }
  const initialFocus = () => box.querySelector<HTMLElement>("input, [data-variant=default]")
  if (session.dismissLogin) initialFocus()?.focus()
  else
    session.dismissLogin = showDialog({
      title: "Acesso à conta WebLol",
      children: box,
      className: "shell-login-dialog",
      dismissible: false,
      initialFocus,
    })
}

function setLoginFeedback(message: string, isPending = false) {
  const error = document.querySelector("#mbox .err")
  const status = document.querySelector("#mbox .login-status")
  if (error) error.textContent = isPending ? "" : message
  if (status) status.textContent = isPending ? message : ""
}
export const merr = (message: string) => setLoginFeedback(message)
export const mstatus = (message: string) => setLoginFeedback(message, true)

/** Mostra o erro junto do campo (com `aria-invalid`) e devolve o foco para ele. */
export function showLoginFieldError(input: HTMLInputElement, message: string) {
  merr("")
  const field = input.parentElement as HTMLElement
  let error = field.querySelector<HTMLElement>(".login-field-error")
  if (!error) {
    const created = document.createElement("span")
    created.id = `${input.id}-error`
    created.className = "login-field-error"
    created.setAttribute("role", "alert")
    field.append(created)
    input.addEventListener(
      "input",
      () => {
        created.remove()
        input.removeAttribute("aria-invalid")
        input.removeAttribute("aria-errormessage")
      },
      { once: true },
    )
    error = created
  }
  error.textContent = message
  input.setAttribute("aria-invalid", "true")
  input.setAttribute("aria-errormessage", error.id)
  input.focus()
}

/** Enter em qualquer campo do diálogo executa `go`. */
export function onEnter(go: () => void) {
  for (const input of $("#mbox").querySelectorAll("input"))
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault()
        go()
      }
    })
}
