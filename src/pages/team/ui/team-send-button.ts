// "Enviar para aprovação (N)" / "Publicar minhas alterações (N)" na linha do nome da composição.
// O app principal (sync.js) decide o texto, o estado e a ação do botão #send; aqui o botão só espelha
// esse estado e repassa o clique, para a pessoa não precisar abrir o menu da conta.
// Quando não há o que enviar, o botão continua no lugar, desabilitado, com o motivo no title.

const SEND_ICON = `<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons.svg#upload"></use></svg>`

type HostWindow = Window & { captainAccess?: () => boolean }

function hostWindow(): HostWindow | null {
  try {
    return window.parent !== window ? (window.parent as HostWindow) : null
  } catch {
    return null
  }
}

function hostElement(id: string): HTMLElement | null {
  try {
    return hostWindow()?.document.getElementById(id) ?? null
  } catch {
    return null
  }
}

function hostSendButton(): HTMLButtonElement | null {
  const button = hostElement("send")
  // instanceof não serve entre janelas: cada uma tem o próprio HTMLButtonElement.
  return button?.tagName === "BUTTON" ? (button as HTMLButtonElement) : null
}

function isCaptain() {
  try {
    return !!hostWindow()?.captainAccess?.()
  } catch {
    return false
  }
}

const escapeHTML = (text: string) => text.replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)

function renderLabel(button: HTMLButtonElement, label: string) {
  if (button.dataset.label === label) return
  button.dataset.label = label
  button.innerHTML = `${SEND_ICON}<span>${escapeHTML(label)}</span>`
}

/** Motivo de não haver envio: sem time, sem usuário ou nada alterado. */
function idleReason() {
  const status = hostElement("sync-label")?.textContent?.trim() ?? ""
  if (/sem usu|sem time|tempor/i.test(status)) return status
  return "Nenhuma alteração para enviar"
}

/** Copia texto, estado e variante do botão do app principal; sem envio possível, fica desabilitado. */
export function syncTeamSendButton(button: HTMLButtonElement) {
  button.hidden = false
  const source = hostSendButton()
  const label = source?.textContent?.trim() ?? ""
  if (source && !source.hidden && label) {
    renderLabel(button, label)
    button.disabled = source.disabled
    button.dataset.variant = source.dataset.variant === "secondary" ? "secondary" : "default"
    button.title = source.disabled ? "Suas alterações já foram enviadas e aguardam o capitão" : ""
    return
  }
  renderLabel(button, isCaptain() ? "Publicar minhas alterações" : "Enviar para aprovação")
  button.disabled = true
  button.dataset.variant = "secondary"
  button.title = idleReason()
}

export function mountTeamSendButton(button: HTMLButtonElement) {
  button.addEventListener("click", () => {
    if (!button.disabled) hostSendButton()?.click()
  })
  syncTeamSendButton(button)
}
