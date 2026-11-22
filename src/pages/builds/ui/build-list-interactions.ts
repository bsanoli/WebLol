import { revealContent } from "@/shared/lib/motion"
import { MATCHUP_PAGE_SIZE } from "./build-matchups"
import { requireClosest, requireElement } from "@/shared/lib/dom"

/** "Ver mais" paginado dos confrontos. Devolve true quando o clique era dele. */
function didHandleMatchupPageClick(target: Element) {
  const page = target.closest<HTMLElement>("[data-show-matchup-page]")
  if (!page) return false
  const hiddenRows = [...(page.previousElementSibling?.querySelectorAll<HTMLElement>("li[hidden]") ?? [])]
  const nextRows = hiddenRows.slice(0, MATCHUP_PAGE_SIZE)
  nextRows.forEach(row => {
    row.hidden = false
    revealContent(row, true)
  })
  nextRows[0]?.querySelector("button")?.focus({ preventScroll: true })

  const remaining = hiddenRows.length - nextRows.length
  if (remaining) {
    if (page.firstElementChild)
      page.firstElementChild.textContent = `Ver mais ${Math.min(MATCHUP_PAGE_SIZE, remaining)}`
  } else {
    page.remove()
  }
  return true
}

/** "Ver mais adversários" que revela a lista escondida. Devolve true quando o clique era dele. */
function didHandleMoreMatchupsClick(target: Element) {
  const more = target.closest("[data-show-matchups]")
  if (!more) return false
  const list = more.nextElementSibling as HTMLElement
  list.hidden = false
  revealContent(list, true)
  list.querySelector("button")?.focus({ preventScroll: true })
  more.remove()
  return true
}

/** Alterna a visão da linha do tempo de compras. Devolve true quando o clique era dela. */
function didHandleTimelineViewClick(target: Element) {
  const view = target.closest<HTMLButtonElement>("[data-timeline-view]")
  if (!view) return false
  const section = requireClosest<Element>(view, ".build-timeline")
  section.querySelectorAll<HTMLButtonElement>("[data-timeline-view]").forEach(button => {
    button.setAttribute("aria-pressed", String(button === view))
  })
  requireElement<HTMLElement>(".build-timeline-games", section).dataset.view = view.dataset.timelineView ?? ""
  return true
}

/** Trata o clique em "Ver mais", "Ver mais adversários" ou na troca da linha do tempo; devolve true quando era de um deles. */
export function didHandleListClick(target: Element) {
  return didHandleMatchupPageClick(target) || didHandleMoreMatchupsClick(target) || didHandleTimelineViewClick(target)
}
