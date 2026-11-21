// Botão único de salvamento da Área do time: mostra se há rascunho ou se está em dia com o time e reúne
// enviar, sincronizar, ver o que mudou, descartar o rascunho e o backup. O app principal (`features/auth`) decide
// o texto e a ação do envio (#send); aqui o menu só espelha esse estado e repassa o clique.
import { hostDraft, hostElement } from "@/shared/api/host-bridge"
import { KN, OPN, type ItemKind, type ChangeOp } from "@/shared/lib/team-changes"
import { $, localSave, SAVE_RESULT_EVENT, saveFailed } from "./team-store"

const SEND_ICON = `<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons.svg#upload"></use></svg>`
const plural = (count: number) => `${count} ${count === 1 ? "alteração" : "alterações"}`

function hostSendButton(): HTMLButtonElement | null {
  const button = hostElement("send")
  // instanceof não serve entre janelas: cada uma tem o próprio HTMLButtonElement.
  return button?.tagName === "BUTTON" ? (button as HTMLButtonElement) : null
}

function setText(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text
}

function renderSend(button: HTMLButtonElement, count: number) {
  const source = hostSendButton()
  const label = source?.textContent?.trim() ?? ""
  button.hidden = !count || !source || source.hidden || !label
  if (button.hidden) return
  const html = `${SEND_ICON}<span></span>`
  if (!button.querySelector("span")) button.innerHTML = html
  setText(button.querySelector("span") as HTMLElement, label)
  button.disabled = source?.disabled ?? true
  button.dataset.variant = source?.dataset.variant === "secondary" ? "secondary" : "default"
  button.title = button.disabled ? "Suas alterações já foram enviadas e aguardam o capitão" : ""
}

function renderChanges(list: HTMLElement, changes: { kind: string; op: string; name: string }[]) {
  const html = changes
    .map(change => {
      const kind = KN[change.kind as ItemKind] ?? change.kind
      const op = OPN[change.op as ChangeOp] ?? change.op
      const item = document.createElement("li")
      item.textContent = `${kind} ${op}: ${change.name}`
      return item.outerHTML
    })
    .join("")
  if (list.dataset.html !== html) {
    list.dataset.html = html
    list.innerHTML = html
  }
}

/** Redesenha o botão e o menu a partir do rascunho do app principal e do resultado da última gravação. */
export function renderSaveMenu() {
  const draft = hostDraft()
  const changes = draft?.changes ?? []
  const count = changes.length
  let label = "Salvo neste navegador"
  let help = "As edições são salvas automaticamente neste navegador."
  if (saveFailed()) {
    label = "Falha ao salvar"
    help = "O navegador não conseguiu gravar as edições. Use Exportar backup para guardar uma cópia."
  } else if (draft?.synced) {
    label = count ? `Rascunho · ${plural(count)}` : `Em dia com o time · v${draft.version}`
    help = count
      ? `${plural(count)} ${count === 1 ? "ainda não está" : "ainda não estão"} na versão do time (v${draft.version}).`
      : "Suas composições e jogadas são iguais à versão do time."
  } else {
    const account = hostElement("sync-label")?.textContent?.trim()
    if (account) help = `${account}. As edições ficam salvas neste navegador.`
  }
  localSave.toggleAttribute("data-save-error", saveFailed())
  localSave.dataset.draft = count ? "pending" : "clean"
  setText($("#saved"), label)
  setText($("#local-save-description"), help)
  renderSend($<HTMLButtonElement>("#save-send"), count)
  const sync = $<HTMLButtonElement>("#save-sync")
  const hostSync = hostElement("sync") as HTMLButtonElement | null
  sync.disabled = !!hostSync?.disabled
  const showChanges = $<HTMLButtonElement>("#save-changes")
  showChanges.hidden = !count
  const list = $("#save-changes-list")
  if (!count) {
    list.hidden = true
    showChanges.setAttribute("aria-expanded", "false")
  } else renderChanges(list, changes)
}

export function mountSaveMenu() {
  const close = () => {
    localSave.open = false
  }
  document.addEventListener("click", event => {
    const target = event.target as HTMLElement
    if (!localSave.contains(target) && !target.closest?.('[role="alertdialog"]')) close()
  })
  localSave.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !localSave.open) return
    close()
    localSave.querySelector("summary")?.focus()
  })
  document.addEventListener(SAVE_RESULT_EVENT, renderSaveMenu)
  $("#save-send").addEventListener("click", () => {
    if (!($("#save-send") as HTMLButtonElement).disabled) hostSendButton()?.click()
  })
  $("#save-sync").addEventListener("click", () => hostElement("sync")?.click())
  $("#save-changes").addEventListener("click", () => {
    const list = $("#save-changes-list")
    list.hidden = !list.hidden
    $("#save-changes").setAttribute("aria-expanded", String(!list.hidden))
  })
  $("#save-export").addEventListener("click", () => {
    close()
    $("#exp").click()
  })
  $("#save-import").addEventListener("click", () => {
    close()
    $("#impb").click()
  })
  renderSaveMenu()
}
