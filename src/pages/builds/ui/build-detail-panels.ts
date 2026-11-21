import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { animate } from "motion"
import { Collapsible, CollapsibleContent } from "@/shared/ui/collapsible"
import { ExistingContent } from "@/shared/ui/dialog-controls"
import { mountSkillOptions } from "./build-controls"
import { detailColumnSpan, reduceBuildMotion } from "./build-media"

type DetailContent = { element: HTMLElement; root: Root }

/** Abre e fecha o detalhe inline de uma linha da tabela, animando a altura. */
export function createBuildDetailPanels() {
  const detailAnimations = new WeakMap<HTMLElement, ReturnType<typeof animate>>()
  const detailContents = new WeakMap<HTMLElement, DetailContent>()

  const setExpanded = (button: HTMLButtonElement, expanded: boolean) => {
    const detail = document.getElementById(button.getAttribute("aria-controls") ?? "") as HTMLTableRowElement
    const cell = detail.cells[0]
    const panel = cell.firstElementChild as HTMLElement
    const startHeight = detail.hidden ? 0 : panel.getBoundingClientRect().height
    detailAnimations.get(panel)?.stop()
    detailAnimations.delete(panel)

    if (!expanded && detail.contains(document.activeElement)) button.focus({ preventScroll: true })
    button.setAttribute("aria-expanded", String(expanded))
    detail.inert = !expanded
    detail.hidden = false
    const content = detailContents.get(panel)
    if (!content) return
    flushSync(() =>
      content.root.render(
        createElement(
          Collapsible,
          { open: expanded },
          createElement(
            CollapsibleContent,
            { forceMount: true },
            createElement(ExistingContent, { element: content.element }),
          ),
        ),
      ),
    )
    mountSkillOptions(content.element)
    cell.colSpan = detailColumnSpan()
    panel.style.height = ""
    const endHeight = expanded ? panel.getBoundingClientRect().height : 0
    const settle = () => {
      detail.hidden = !expanded
      panel.style.height = ""
      panel.style.overflow = ""
      detailAnimations.delete(panel)
    }
    if (reduceBuildMotion.matches || startHeight === endHeight) {
      settle()
      return
    }
    panel.style.overflow = "clip"
    panel.style.height = `${startHeight}px`
    const animation = animate(
      panel,
      { height: [`${startHeight}px`, `${endHeight}px`] },
      {
        duration: 0.24,
        ease: [0.2, 0.7, 0.25, 1],
        onComplete: settle,
      },
    )
    detailAnimations.set(panel, animation)
  }

  const createDetailContent = (panel: HTMLElement, html: string, register: (root: Root) => void) => {
    const element = document.createElement("div")
    element.innerHTML = html
    const root = createRoot(panel)
    register(root)
    detailContents.set(panel, { element, root })
  }

  return { hasDetailContent: (panel: HTMLElement) => detailContents.has(panel), createDetailContent, setExpanded }
}
