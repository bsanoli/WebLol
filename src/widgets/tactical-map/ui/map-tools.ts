import { isSide, type Side } from "../model/battlefield"

type Tool = "move" | "hand" | "draw" | "freehand" | "erase" | "ward" | "wave"

const colors=[["#ffd34d","Amarela"],["#3d8bff","Azul"],["#ff4d4d","Vermelha"],["#ffffff","Branca"],["#5be08a","Verde"]];

const mapTools = [
  { value: "move", label: "Mover", icon: "map-tool-move", shortcuts: "V" },
  { value: "hand", label: "Mão", icon: "map-tool-hand", shortcuts: "H" },
  { value: "draw", label: "Desenhar seta", icon: "map-tool-arrow", shortcuts: "Shift+L" },
  { value: "freehand", label: "Traço livre", icon: "map-tool-brush", shortcuts: "Shift+P" },
  { value: "erase", label: "Borracha", icon: "map-tool-erase", shortcuts: "B E" },
  { value: "ward", label: "Colocar ward", image: "assets/lol/hud/ward-3340.png" },
  { value: "wave", label: "Colocar wave", image: "assets/lol/hud/bluemelee_circle_classic.png" },
] satisfies { value: Tool; label: string; icon?: string; image?: string; shortcuts?: string }[]

export function mountMapVision(onChange: () => void) {
  const options = document.querySelectorAll<HTMLButtonElement>("#map-perspective [data-vision]")
  let perspective: Side | "all" = "all"
  for (const option of options) {
    option.onclick = () => {
      const value = option.dataset.vision
      const next = isSide(value) ? value : "all"
      if (next === perspective) return
      perspective = next
      for (const button of options) button.setAttribute("aria-pressed", String(button === option))
      onChange()
    }
  }
  return () => perspective
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
  const palette = document.getElementById("cols")!
  palette.innerHTML = colors.map(([color, name], index) => `<button class="col${index ? "" : " on"}" data-color="${color}" style="--swatch:${color}" aria-label="${name}" aria-pressed="${index === 0}"></button>`).join("")
  palette.onclick = event => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-color]")
    if (!button || !canEdit()) return
    chooseColor(button.dataset.color!)
    palette.querySelectorAll("[data-color]").forEach(swatch => {
      swatch.classList.toggle("on", swatch === button)
      swatch.setAttribute("aria-pressed", String(swatch === button))
    })
  }

  const availableTools = () => canEdit() ? mapTools : mapTools.slice(0, 2)
  viewport.addEventListener("pointerdown", event => {
    if (event.button === 0 && !(event.target as Element).closest("button")) viewport.focus({ preventScroll: true })
  }, true)
  document.getElementById("v-map")!.addEventListener("keydown", event => {
    const target = event.target as Element
    const fromToolbar = host.contains(target)
    if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
      !canMove() || (!fromToolbar && !viewport.contains(target)) ||
      target.closest("input, textarea, select, [contenteditable]") ||
      document.querySelector('[data-map-menu][open], :popover-open, dialog[open], [role="listbox"][data-state="open"], [role="menu"][data-state="open"], [role="dialog"][data-state="open"]')) return
    const key = `${event.shiftKey ? "Shift+" : ""}${event.key.toUpperCase()}`
    const tool = availableTools().find(option => option.shortcuts?.split(" ").includes(key))
    if (!tool) return
    event.preventDefault()
    if (tool.value !== currentTool()) {
      chooseTool(tool.value)
      const nextFocus = fromToolbar ? host.querySelector<HTMLElement>(`[data-tool="${tool.value}"]`) : viewport
      nextFocus?.focus({ preventScroll: true })
    }
  })

  return () => {
    const tools = availableTools()
    const tool = canMove() ? currentTool() : "hand"
    mountToolGroup(host, tool, tools, value => { if (canMove() && tools.some(item => item.value === value)) chooseTool(value as Tool) }, !canMove())
    map.dataset.tool = tool
    map.classList.toggle("draw", tool === "draw" || tool === "freehand" || tool === "wave")
    map.classList.toggle("erase", tool === "erase")
    document.getElementById("map-arrow-options")!.hidden = tool !== "draw" && tool !== "freehand"
    document.getElementById("map-arrowhead-option")!.hidden = tool !== "freehand"
    document.getElementById("map-colors-title")!.textContent = tool === "freehand" ? "Cor do traço" : "Cor da seta"
    document.getElementById("map-wave-options")!.hidden = tool !== "wave"
    return tool
  }
}

export function mountMapDisclosures() {
  const menus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-map-menu][open]"))
  document.addEventListener("pointerdown", event => {
    for (const menu of menus()) {
      if (!menu.contains(event.target as Node)) menu.open = false
    }
  })
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
  }, true)
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
