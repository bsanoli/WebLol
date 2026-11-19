import { iconMarkup } from "@/shared/ui/icon"
import type { MapPoint } from "../model/faelights"

export function mountMapCamera(viewport: HTMLElement, map: HTMLElement, onChange: () => void, getTool: () => string, onMove: () => void) {
  const zoomIn = document.querySelector<HTMLButtonElement>("#map-zoom-in")!
  const zoomOut = document.querySelector<HTMLButtonElement>("#map-zoom-out")!
  const fit = document.querySelector<HTMLButtonElement>("#map-zoom-fit")!
  const value = document.querySelector<HTMLOutputElement>("#map-zoom-value")!
  const workspace = document.querySelector<HTMLElement>("#v-map")!
  const layout = workspace.querySelector<HTMLElement>("#mapw")!
  const fullscreen = document.querySelector<HTMLButtonElement>("#map-fullscreen")!
  const toolbar = workspace.querySelector<HTMLElement>(".map-toolbar")!
  const editToolbar = toolbar.querySelector<HTMLElement>(".map-edit-toolbar")!
  const stageBar = toolbar.querySelector<HTMLElement>(".map-stage-bar")!
  const stage = viewport.closest<HTMLElement>(".map-stage")!
  let zoom = 1
  let x = 0, y = 0
  let space = false
  let overMap = false
  let pointerControl: Element | null = null
  let wheelFrame = 0
  let drag: { id: number; x: number; y: number; startX: number; startY: number } | undefined

  function limit(offset: number, length: number, board: number) {
    return board <= length ? (length - board) / 2 : Math.max(length - board, Math.min(0, offset))
  }

  function alignToolbar() {
    const fitInset = Math.max(0, (viewport.clientWidth - stage.clientHeight) / 2)
    const sharedRow = stageBar.offsetTop < editToolbar.offsetTop + editToolbar.offsetHeight &&
      editToolbar.offsetTop < stageBar.offsetTop + stageBar.offsetHeight
    const gap = Number.parseFloat(getComputedStyle(toolbar).columnGap)
    const boundary = sharedRow ? stageBar.offsetLeft - gap : toolbar.clientWidth
    const room = boundary - editToolbar.offsetLeft - editToolbar.offsetWidth
    layout.style.setProperty("--map-toolbar-inset", `${Math.max(0, Math.min(fitInset, room))}px`)
  }

  function render(redraw = true) {
    const width = viewport.clientWidth, height = viewport.clientHeight
    const board = Math.min(width, height) * zoom
    x = limit(x, width, board)
    y = limit(y, height, board)
    map.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`
    value.value = `${Math.round(zoom * 100)}%`
    zoomOut.disabled = zoom === 1
    zoomIn.disabled = zoom === 3
    if (redraw && board) onChange()
  }

  function setZoom(next: number, anchorX = viewport.clientWidth / 2, anchorY = viewport.clientHeight / 2, redraw = true) {
    if (next === zoom) return
    onMove()
    const scale = next / zoom
    const board = Math.min(viewport.clientWidth, viewport.clientHeight) * zoom
    anchorX = Math.max(x, Math.min(x + board, anchorX))
    anchorY = Math.max(y, Math.min(y + board, anchorY))
    x = anchorX - (anchorX - x) * scale
    y = anchorY - (anchorY - y) * scale
    zoom = next
    render(redraw)
  }
  const step = (delta: number) => setZoom(Math.max(1, Math.min(3, zoom + delta)))
  zoomIn.onclick = () => step(.25)
  zoomOut.onclick = () => step(-.25)
  fit.onclick = () => setZoom(1)
  viewport.addEventListener("wheel", event => {
    if (event.ctrlKey || event.metaKey || !event.deltaY) return
    event.preventDefault()
    if (drag) return
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1
    const next = Math.max(1, Math.min(3, zoom * Math.exp(-event.deltaY * multiplier / 500)))
    if (next === zoom) return
    const rect = viewport.getBoundingClientRect()
    setZoom(next, event.clientX - rect.left, event.clientY - rect.top, false)
    if (!wheelFrame) wheelFrame = requestAnimationFrame(() => { wheelFrame = 0; onChange() })
  }, { passive: false })

  function setSpace(pressed: boolean) {
    space = pressed
    viewport.classList.toggle("map-temporary-hand", pressed)
  }
  viewport.addEventListener("pointerenter", () => { overMap = true })
  viewport.addEventListener("pointerleave", () => { overMap = false })
  const controlSelector = 'button, a[href], summary, [role="button"], [role="radio"]'
  document.addEventListener("pointerdown", event => {
    pointerControl = event.target instanceof Element ? event.target.closest(controlSelector) : null
  }, { capture: true })
  document.addEventListener("keydown", event => {
    if (event.key === "Tab") pointerControl = null
    if (event.key !== " " || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented ||
      !workspace.classList.contains("on") || (!overMap && event.target !== viewport)) return
    const target = event.target instanceof Element ? event.target : null
    const focusedControl = target?.closest(controlSelector)
    if (focusedControl && (focusedControl !== pointerControl || focusedControl.matches("[data-ward-index]"))) return
    if (target?.closest('input, textarea, select, [role="slider"], [contenteditable]:not([contenteditable="false"]), [role="dialog"]') ||
      document.querySelector('[role="listbox"][data-state="open"], [role="menu"][data-state="open"], dialog[open], #map-context-menu:popover-open')) return
    event.preventDefault()
    setSpace(true)
  })
  document.addEventListener("keyup", event => { if (event.key === " ") setSpace(false) })
  window.addEventListener("blur", () => { setSpace(false); overMap = false; pointerControl = null })
  viewport.addEventListener("keydown", event => {
    if (event.target !== viewport || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === "+" || event.key === "=") step(.25)
    if (event.key === "-") step(-.25)
    if (event.key === "0") setZoom(1)
    if (getTool() !== "hand" && !space) return
    const dx = event.key === "ArrowLeft" ? 32 : event.key === "ArrowRight" ? -32 : 0
    const dy = event.key === "ArrowUp" ? 32 : event.key === "ArrowDown" ? -32 : 0
    if (dx || dy) { event.preventDefault(); onMove(); x += dx; y += dy; render(false) }
  })
  viewport.addEventListener("pointerdown", event => {
    if (event.button !== 0 || (getTool() !== "hand" && !space)) return
    onMove()
    event.preventDefault()
    event.stopPropagation()
    viewport.setPointerCapture(event.pointerId)
    drag = { id: event.pointerId, x, y, startX: event.clientX, startY: event.clientY }
    viewport.classList.add("map-panning")
  }, { capture: true })
  viewport.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return
    x = drag.x + event.clientX - drag.startX
    y = drag.y + event.clientY - drag.startY
    render(false)
  })
  viewport.addEventListener("lostpointercapture", () => {
    drag = undefined
    viewport.classList.remove("map-panning")
  })

  const expanded = () => document.fullscreenElement === workspace || workspace.classList.contains("map-expanded")
  function syncFullscreen() {
    setSpace(false)
    const active = expanded()
    const label = active ? "Sair da tela cheia" : "Tela cheia"
    fullscreen.innerHTML = iconMarkup(active ? "collapse" : "expand")
    fullscreen.setAttribute("aria-label", label)
    fullscreen.dataset.mapTip = label
    fullscreen.setAttribute("aria-pressed", String(active))
  }
  fullscreen.onclick = async () => {
    onMove()
    if (document.fullscreenElement === workspace) await document.exitFullscreen()
    else if (expanded()) workspace.classList.remove("map-expanded")
    else {
      try { await workspace.requestFullscreen() }
      catch { workspace.classList.add("map-expanded") }
    }
    syncFullscreen()
  }
  document.addEventListener("fullscreenchange", syncFullscreen)
  workspace.addEventListener("keydown", event => {
    if (event.key !== "Escape" || event.defaultPrevented || !workspace.classList.contains("map-expanded")) return
    if ((event.target as Element).closest("[data-map-menu][open]") || workspace.querySelector(":popover-open")) return
    workspace.classList.remove("map-expanded")
    syncFullscreen()
    fullscreen.focus()
  })
  let lastWidth = 0, lastHeight = 0
  const resize = new ResizeObserver(() => {
    const width = viewport.clientWidth, height = viewport.clientHeight
    if (!width || !height) return
    if (lastWidth && lastHeight) {
      if (width !== lastWidth || height !== lastHeight) onMove()
      const ratio = Math.min(width, height) / Math.min(lastWidth, lastHeight)
      x = width / 2 - (lastWidth / 2 - x) * ratio
      y = height / 2 - (lastHeight / 2 - y) * ratio
    }
    lastWidth = width
    lastHeight = height
    alignToolbar()
    render()
  })
  resize.observe(viewport)
  resize.observe(editToolbar)
  resize.observe(stageBar)
  syncFullscreen()
  alignToolbar()
  render(false)

  return {
    point(event: MouseEvent): MapPoint {
      const rect = map.getBoundingClientRect()
      const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 10) / 10
      return [clamp((event.clientX - rect.left) / rect.width * 100), clamp((event.clientY - rect.top) / rect.height * 100)]
    },
    scale: () => zoom,
  }
}
