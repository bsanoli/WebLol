// Alça entre a lista de composições e o quadro de Táticas: arrastar (ou usar as setas) muda a altura da lista.
import { $, S, save } from "./team-store"

const LIST_MIN = 96
const BOARD_MIN = 360
const STEP = 16

/** Altura salva só vale se for um número razoável; qualquer outra coisa volta ao padrão. */
export const savedListHeight = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= LIST_MIN ? Math.round(value) : undefined

/** O `aria-valuenow` já vem na marcação (o separador focável exige); ao focar, o valor real é lido do layout. */
export const listResizeHTML = (height = 230) =>
  `<div class="tx-resize" role="separator" aria-orientation="horizontal" tabindex="0" data-tactic-resize aria-label="Ajustar a altura da lista de composições" aria-valuemin="${LIST_MIN}" aria-valuenow="${height}" title="Arraste para ajustar a altura da lista · duplo clique volta ao padrão"></div>`

/** A lista não cresce a ponto de o quadro perder o espaço mínimo dos cinco picks. */
function limitOf(tabs: HTMLElement) {
  const aside = tabs.closest<HTMLElement>(".tx-aside")
  return Math.max(LIST_MIN, (aside?.clientHeight ?? 0) - BOARD_MIN - 16)
}

function apply(tabs: HTMLElement, handle: HTMLElement, height: number | null) {
  if (height === null) {
    tabs.style.removeProperty("--tx-list-h")
  } else {
    tabs.style.setProperty("--tx-list-h", `${height}px`)
    handle.setAttribute("aria-valuenow", String(height))
  }
}

function commit(height: number | null) {
  if (height === null) delete S.tacticsListHeight
  else S.tacticsListHeight = height
  save()
}

export function mountTacticListResize() {
  const editor = $("#editor")
  const parts = (handle: HTMLElement) => {
    const tabs = handle.previousElementSibling
    return tabs instanceof HTMLElement && tabs.classList.contains("tx-tabs") ? tabs : null
  }
  editor.addEventListener("pointerdown", e => {
    const handle = (e.target as Element).closest<HTMLElement>("[data-tactic-resize]")
    const tabs = handle && parts(handle)
    if (!handle || !tabs) return
    e.preventDefault()
    const startY = e.clientY,
      startHeight = tabs.getBoundingClientRect().height,
      limit = limitOf(tabs)
    let height = startHeight
    handle.setPointerCapture(e.pointerId)
    handle.classList.add("dragging")
    const move = (event: PointerEvent) => {
      height = Math.round(Math.min(limit, Math.max(LIST_MIN, startHeight + event.clientY - startY)))
      apply(tabs, handle, height)
    }
    const end = () => {
      const hasMoved = height !== startHeight
      handle.classList.remove("dragging")
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", end)
      handle.removeEventListener("pointercancel", end)
      if (hasMoved) commit(height)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", end)
    handle.addEventListener("pointercancel", end)
  })
  // Leitores de tela precisam dos valores atuais quando a alça recebe o foco.
  editor.addEventListener("focusin", e => {
    const handle = (e.target as Element).closest<HTMLElement>("[data-tactic-resize]")
    const tabs = handle && parts(handle)
    if (!handle || !tabs) return
    handle.setAttribute("aria-valuemax", String(limitOf(tabs)))
    handle.setAttribute("aria-valuenow", String(Math.round(tabs.getBoundingClientRect().height)))
  })
  editor.addEventListener("dblclick", e => {
    const handle = (e.target as Element).closest<HTMLElement>("[data-tactic-resize]")
    const tabs = handle && parts(handle)
    if (!handle || !tabs) return
    apply(tabs, handle, null)
    commit(null)
  })
  editor.addEventListener("keydown", e => {
    const handle = (e.target as Element).closest<HTMLElement>("[data-tactic-resize]")
    const tabs = handle && parts(handle)
    if (!handle || !tabs) return
    const current = tabs.getBoundingClientRect().height,
      limit = limitOf(tabs)
    const next =
      e.key === "ArrowUp"
        ? current - STEP
        : e.key === "ArrowDown"
          ? current + STEP
          : e.key === "Home"
            ? LIST_MIN
            : e.key === "End"
              ? limit
              : null
    if (next === null) return
    e.preventDefault()
    const height = Math.round(Math.min(limit, Math.max(LIST_MIN, next)))
    apply(tabs, handle, height)
    commit(height)
  })
}
