import { revealContent } from "@/shared/lib/motion"
import { showDialog } from "@/shared/ui/dialog-controls"
import { iconMarkup } from "@/shared/ui/icon"

export function handleMatchGridClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest<HTMLButtonElement>(".match-draft-toggle")
  if (!button) return
  const card = button.closest(".cg")?.cloneNode(true) as HTMLElement | undefined
  const panel = card?.querySelector<HTMLElement>(".match-draft")
  const title = panel?.querySelector<HTMLElement>(".match-draft-title")
  const closeButton = card?.querySelector<HTMLButtonElement>(".match-draft-toggle")
  if (!card || !panel || !title || !closeButton) return
  panel.id = "active-match-draft"
  title.id = "active-match-draft-title"
  panel.setAttribute("aria-labelledby", title.id)
  panel.hidden = false
  closeButton.removeAttribute("aria-haspopup")
  closeButton.removeAttribute("aria-controls")
  closeButton.classList.remove("worlds-detail-action")
  closeButton.classList.replace("match-draft-toggle", "match-dialog-close")
  closeButton.dataset.variant = "ghost"
  closeButton.dataset.size = "icon-sm"
  closeButton.setAttribute("aria-label", "Fechar draft")
  closeButton.innerHTML = iconMarkup("close")
  closeButton.onclick = () => closeDraft()
  const controls = document.createElement("div")
  controls.className = "match-dialog-controls"
  controls.append(closeButton)
  const content = document.createElement("div")
  content.append(controls, card)
  const closeDraft: () => void = showDialog({
    title: "Detalhes da partida e draft",
    children: content,
    className: "match-dialog",
    initialFocus: () => closeButton,
  })
  const modeButtons = panel.querySelectorAll<HTMLButtonElement>("[data-draft-mode]")
  const draftViews = panel.querySelectorAll<HTMLElement>(".match-draft-team-view, .match-draft-order-view")
  for (const mode of modeButtons) {
    mode.onclick = () => {
      if (mode.getAttribute("aria-pressed") === "true") return
      const isChronological = mode.dataset.draftMode === "order"
      for (const button of modeButtons) button.setAttribute("aria-pressed", String(button === mode))
      for (const view of draftViews) {
        view.hidden = view.classList.contains("match-draft-team-view") === isChronological
        if (!view.hidden) revealContent(view, true)
      }
    }
  }
}
