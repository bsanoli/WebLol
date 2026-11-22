// Alça entre o bloco de notas e a gaveta de Táticas: arrastar (ou usar as setas) muda a largura do bloco de notas.
import { $, S, save } from "./team-store"

const ASIDE_MIN = 360
const NOTES_MIN = 360
const STEP = 16

/** Largura salva só vale se for um número razoável; qualquer outra coisa volta ao padrão. */
export const savedAsideWidth = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= ASIDE_MIN ? Math.round(value) : undefined

/** O `aria-valuenow` já vem na marcação (o separador focável exige); ao focar, o valor real é lido do layout. */
export const asideResizeHTML = (width = 480) =>
  `<div class="tx-vresize" role="separator" aria-orientation="vertical" tabindex="0" data-tactic-aside-resize aria-label="Ajustar a largura do bloco de notas" aria-valuemin="${ASIDE_MIN}" aria-valuenow="${width}" title="Arraste para ajustar a largura do bloco de notas · duplo clique volta ao padrão"></div>`

/** A gaveta não cresce a ponto de o bloco de notas perder a largura mínima. */
const limitOf = (tx: HTMLElement) => Math.max(ASIDE_MIN, tx.clientWidth - NOTES_MIN - 12)

const asideOf = (tx: HTMLElement) => tx.querySelector<HTMLElement>(":scope > .tx-aside")

function apply(tx: HTMLElement, handle: HTMLElement, width: number | null) {
  if (width === null) {
    tx.style.removeProperty("--tx-aside-w")
  } else {
    tx.style.setProperty("--tx-aside-w", `${width}px`)
    handle.setAttribute("aria-valuenow", String(width))
  }
}

function commit(width: number | null) {
  if (width === null) delete S.tacticsAsideWidth
  else S.tacticsAsideWidth = width
  save()
}

export function mountTacticAsideResize() {
  const editor = $("#editor")
  const find = (target: EventTarget | null) => {
    const handle = (target as Element | null)?.closest<HTMLElement>("[data-tactic-aside-resize]") ?? null
    const tx = handle?.parentElement
    const aside = tx && asideOf(tx)
    return handle && tx && aside ? { handle, tx, aside } : null
  }
  editor.addEventListener("pointerdown", e => {
    const found = find(e.target)
    if (!found) return
    const { handle, tx, aside } = found
    e.preventDefault()
    const startX = e.clientX,
      startWidth = aside.getBoundingClientRect().width,
      limit = limitOf(tx)
    let width = startWidth
    handle.setPointerCapture(e.pointerId)
    handle.classList.add("dragging")
    const move = (event: PointerEvent) => {
      width = Math.round(Math.min(limit, Math.max(ASIDE_MIN, startWidth - (event.clientX - startX))))
      apply(tx, handle, width)
    }
    const end = () => {
      const hasMoved = width !== startWidth
      handle.classList.remove("dragging")
      handle.removeEventListener("pointermove", move)
      handle.removeEventListener("pointerup", end)
      handle.removeEventListener("pointercancel", end)
      if (hasMoved) commit(width)
    }
    handle.addEventListener("pointermove", move)
    handle.addEventListener("pointerup", end)
    handle.addEventListener("pointercancel", end)
  })
  // Leitores de tela precisam dos valores atuais quando a alça recebe o foco.
  editor.addEventListener("focusin", e => {
    const found = find(e.target)
    if (!found) return
    found.handle.setAttribute("aria-valuemax", String(limitOf(found.tx)))
    found.handle.setAttribute("aria-valuenow", String(Math.round(found.aside.getBoundingClientRect().width)))
  })
  editor.addEventListener("dblclick", e => {
    const found = find(e.target)
    if (!found) return
    apply(found.tx, found.handle, null)
    commit(null)
  })
  editor.addEventListener("keydown", e => {
    const found = find(e.target)
    if (!found) return
    const current = found.aside.getBoundingClientRect().width,
      limit = limitOf(found.tx)
    // Seta para a esquerda leva a alça para a esquerda: o bloco de notas encolhe e a gaveta cresce.
    const next =
      e.key === "ArrowLeft"
        ? current + STEP
        : e.key === "ArrowRight"
          ? current - STEP
          : e.key === "Home"
            ? ASIDE_MIN
            : e.key === "End"
              ? limit
              : null
    if (next === null) return
    e.preventDefault()
    const width = Math.round(Math.min(limit, Math.max(ASIDE_MIN, next)))
    apply(found.tx, found.handle, width)
    commit(width)
  })
}
