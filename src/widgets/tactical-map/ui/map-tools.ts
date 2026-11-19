import { isSide, type Side } from "../model/battlefield"

type Tool = "move" | "hand" | "draw" | "freehand" | "erase" | "ward" | "wave-b" | "wave-r"

export function waveToolSide(tool: string): Side | undefined {
  if (tool === "wave-b") return "b"
  if (tool === "wave-r") return "r"
}

const colors=[["#ffd34d","Amarela"],["#3d8bff","Azul"],["#ff4d4d","Vermelha"],["#ffffff","Branca"],["#5be08a","Verde"]];

export const mapQuickTools = [
  { value: "move", label: "Mover", icon: "map-tool-move", shortcuts: "V" },
  { value: "hand", label: "Mão", icon: "map-tool-hand", shortcuts: "H" },
  { value: "draw", label: "Desenhar seta", icon: "map-tool-arrow", shortcuts: "Shift+L", panel: "map-arrow-options" },
  { value: "freehand", label: "Traço livre", icon: "map-tool-brush", shortcuts: "Shift+P", panel: "map-arrow-options" },
  { value: "erase", label: "Borracha", icon: "map-tool-erase", shortcuts: "B E" },
] as const

type ToolOption = { value: Tool; label: string; icon?: string; image?: string; shortcuts?: string; panel?: string }

const mapTools: ToolOption[] = [
  ...mapQuickTools,
  { value: "ward", label: "Colocar ward", image: "assets/lol/hud/ward-3340.png", panel: "map-ward-options" },
  { value: "wave-b", label: "Colocar wave azul", image: "assets/lol/hud/bluerange_circle.png" },
  { value: "wave-r", label: "Colocar wave vermelha", image: "assets/lol/hud/redrange_circle.png" },
]

export function mountMapVision(onChange: () => void) {
  const options = document.querySelectorAll<HTMLButtonElement>("#map-perspective [data-vision]")
  let perspective: Side | "all" = "all"
  function setPerspective(next: Side | "all") {
    if (next === perspective) return
    perspective = next
    for (const button of options) button.setAttribute("aria-pressed", String(button.dataset.vision === next))
    onChange()
  }
  for (const option of options) {
    option.onclick = () => {
      const value = option.dataset.vision
      setPerspective(isSide(value) && value !== perspective ? value : "all")
    }
  }
  return {
    getPerspective: () => perspective,
    resetPerspective: () => setPerspective("all"),
  }
}

export function mountMapTools({ map, canEdit, canMove, currentTool, chooseTool, chooseColor, mountToolGroup }: {
  map: HTMLElement
  canEdit: () => boolean
  canMove: () => boolean
  currentTool: () => Tool
  chooseTool: (tool: Tool) => void
  chooseColor: (color: string) => void
  mountToolGroup: (host: Element, tool: string, tools: typeof mapTools, change: (value: string) => void, disabled: boolean) => void
}) {
  const host = document.getElementById("map-modes")!
  const viewport = document.getElementById("map-viewport")!
  const workspace = document.getElementById("v-map")!
  const toolbar = host.closest<HTMLElement>(".map-toolbar")!
  const editToolbar = host.closest<HTMLElement>(".map-edit-toolbar")!
  const colorOptions = document.getElementById("map-arrow-options")!
  const wardOptions = document.getElementById("map-ward-options")!
  const wardHint = document.getElementById("map-ward-hint")!
  const panels: Partial<Record<Tool, HTMLElement>> = { draw: colorOptions, freehand: colorOptions, ward: wardOptions }
  const drawingButton = () => host.querySelector<HTMLElement>(`[data-tool="${currentTool()}"][aria-controls="map-arrow-options"]`)
  const activeSelect = () => colorOptions.querySelector('[data-team-trigger="select"][data-state="open"]')
  let placementFrame = 0
  function scheduleDrawingPlacement() {
    if (colorOptions.hidden || placementFrame) return
    placementFrame = requestAnimationFrame(() => {
      placementFrame = 0
      const anchor = drawingButton()
      if (colorOptions.hidden || !anchor) return
      const button = anchor.getBoundingClientRect()
      const parent = editToolbar.getBoundingClientRect()
      const edge = 8
      const maxLeft = document.documentElement.clientWidth - colorOptions.offsetWidth - edge
      const left = Math.max(edge, Math.min(button.left, maxLeft))
      const top = Math.max(button.bottom, toolbar.getBoundingClientRect().bottom) + 4
      colorOptions.style.setProperty("--map-drawing-left", `${left - parent.left}px`)
      colorOptions.style.setProperty("--map-drawing-top", `${top - parent.top}px`)
    })
  }
  function setPanelOpen(panel: HTMLElement, open: boolean) {
    panel.hidden = !open
    if (panel === wardOptions) wardHint.hidden = !open
    if (panel === colorOptions && open) scheduleDrawingPlacement()
  }
  const placementObserver = new ResizeObserver(scheduleDrawingPlacement)
  placementObserver.observe(toolbar)
  placementObserver.observe(editToolbar)
  placementObserver.observe(viewport)
  document.addEventListener("pointerdown", event => {
    if (colorOptions.hidden || !(event.target instanceof Element)) return
    const listId = activeSelect()?.getAttribute("aria-controls")
    const list = listId && document.getElementById(listId)
    if (colorOptions.contains(event.target) || drawingButton()?.contains(event.target) ||
      (list && list.contains(event.target))) return
    setPanelOpen(colorOptions, false)
  }, true)
  const palette = document.getElementById("cols")!
  let renderedTool: Tool | undefined
  palette.innerHTML = colors.map(([color, name], index) => `<button type="button" class="col" data-color="${color}" style="--swatch:${color}" aria-label="${name}" aria-pressed="${index === 0}"></button>`).join("")
  palette.onclick = event => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-color]")
    if (!button || !canEdit()) return
    chooseColor(button.dataset.color!)
    palette.querySelectorAll("[data-color]").forEach(swatch => {
      swatch.setAttribute("aria-pressed", String(swatch === button))
    })
  }

  const availableTools = () => canEdit() ? mapTools : mapTools.slice(0, 2)
  viewport.addEventListener("pointerdown", event => {
    if (event.button === 0 && !(event.target as Element).closest("button")) viewport.focus({ preventScroll: true })
  }, true)
  workspace.addEventListener("keydown", event => {
    const target = event.target as Element
    if (event.key === "Escape" && !event.defaultPrevented && !colorOptions.hidden && !activeSelect()) {
      setPanelOpen(colorOptions, false)
      if (colorOptions.contains(target)) {
        event.preventDefault()
        drawingButton()?.focus({ preventScroll: true })
      }
      return
    }
    const fromToolbar = host.contains(target)
    if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
      !canMove() || (!fromToolbar && !viewport.contains(target)) ||
      target.closest("input, textarea, select, [role=slider], [contenteditable]") ||
      document.querySelector('[data-map-menu][open], :popover-open, dialog[open], [role="listbox"][data-state="open"], [role="menu"][data-state="open"], [role="dialog"][data-state="open"]')) return
    const key = `${event.shiftKey ? "Shift+" : ""}${event.key.toUpperCase()}`
    const tool = availableTools().find(option => option.shortcuts?.split(" ").includes(key))
    if (!tool) return
    event.preventDefault()
    if (tool.value !== currentTool()) {
      chooseTool(tool.value)
      const nextFocus = fromToolbar ? host.querySelector<HTMLElement>(`[data-tool="${tool.value}"]`) : viewport
      nextFocus?.focus({ preventScroll: true })
    } else if (panels[tool.value] === colorOptions) {
      setPanelOpen(colorOptions, true)
    }
  })

  function render() {
    const tools = availableTools()
    const tool = canMove() ? currentTool() : "hand"
    mountToolGroup(host, tool, tools, value => {
      if (!canMove() || !tools.some(item => item.value === value)) return
      if (value === tool) {
        const panel = panels[tool]
        if (panel) setPanelOpen(panel, panel.hasAttribute("hidden"))
        return
      }
      chooseTool(value as Tool)
    }, !canMove())
    map.dataset.tool = tool
    if (renderedTool !== tool) {
      const activePanel = panels[tool]
      setPanelOpen(colorOptions, activePanel === colorOptions)
      setPanelOpen(wardOptions, activePanel === wardOptions)
      renderedTool = tool
    }
    document.getElementById("map-arrowhead-option")!.hidden = tool !== "freehand"
    document.getElementById("map-colors-title")!.textContent = tool === "freehand" ? "Cor do traço" : "Cor da seta"
    document.getElementById("map-wave-options")!.hidden = !waveToolSide(tool)
    return tool
  }

  return {
    render,
    showDrawingOptions() {
      if (canEdit() && panels[currentTool()] === colorOptions) setPanelOpen(colorOptions, true)
    },
  }
}

export function mountMapDisclosures() {
  const menus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-map-menu][open]"))
  function fitPanel(menu: HTMLDetailsElement) {
    const panel = menu.querySelector<HTMLElement>(".map-disclosure-panel")
    if (!panel) return
    panel.style.removeProperty("--map-menu-shift-x")
    const { left, right } = panel.getBoundingClientRect()
    const edge = 8
    const shift = Math.max(0, edge - left) - Math.max(0, right - document.documentElement.clientWidth + edge)
    if (shift) panel.style.setProperty("--map-menu-shift-x", `${shift}px`)
  }
  document.addEventListener("pointerdown", event => {
    for (const menu of menus()) {
      if (!menu.contains(event.target as Node)) menu.open = false
    }
  }, true)
  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.key !== "Escape") return
    const open = menus().find(menu => menu.contains(event.target as Node))
    if (!open) return
    event.preventDefault()
    open.open = false
    open.querySelector("summary")?.focus()
  })
  document.addEventListener("toggle", event => {
    const menu = event.target
    if (!(menu instanceof HTMLDetailsElement) || !menu.open || !menu.hasAttribute("data-map-menu")) return
    for (const other of menus()) if (other !== menu) other.open = false
    fitPanel(menu)
  }, true)
  window.addEventListener("resize", () => menus().forEach(fitPanel))
}

export function mountMapSidebar(workspace: HTMLElement) {
  const layout = workspace.querySelector<HTMLElement>("#mapw")!
  const button = workspace.querySelector<HTMLButtonElement>("#map-panel-toggle")!
  const sidebar = workspace.querySelector<HTMLElement>("#map-sidebar")!
  const compact = window.matchMedia("(width < 1000px)")
  function setOpen(open: boolean) {
    layout.toggleAttribute("data-panel-open", open)
    button.setAttribute("aria-expanded", String(open))
  }
  button.onclick = () => {
    const open = !layout.hasAttribute("data-panel-open")
    setOpen(open)
    if (open) sidebar.focus({ preventScroll: true })
  }
  compact.addEventListener("change", () => setOpen(false))
  workspace.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.key !== "Escape" || !compact.matches || !layout.hasAttribute("data-panel-open") ||
      !(sidebar.contains(event.target as Node) || event.target === button)) return
    event.preventDefault()
    setOpen(false)
    button.focus({ preventScroll: true })
  }, { capture: true })
}
