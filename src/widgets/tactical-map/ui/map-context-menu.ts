import { iconMarkup } from "@/shared/ui/icon"
import { requireElement } from "@/shared/lib/dom"

type MenuItem = {
  label: string
  icon?: string
  selected?: boolean
  disabled?: boolean
  startsHistory?: boolean
  run: () => void
}

type ContextAction = {
  label: string
  targetName: string
  marker?: Element
  highlight?: (active: boolean) => void
  run: () => void
}

export function mountMapContextMenu(
  map: HTMLElement,
  viewport: HTMLElement,
  resolve: (event: MouseEvent | KeyboardEvent) => ContextAction | undefined,
  quickActions: () => MenuItem[],
) {
  const menu = requireElement<HTMLElement>("#map-context-menu")
  const items = requireElement<HTMLElement>(".map-context-items", menu)
  const title = requireElement<HTMLElement>(".map-context-title", menu)
  const ring = requireElement<HTMLElement>("#map-context-target", map)
  let action: ContextAction | undefined
  let trigger: HTMLElement | undefined

  function close() {
    if (menu.matches(":popover-open")) menu.hidePopover()
  }

  menu.addEventListener("beforetoggle", event => {
    if (event.newState !== "closed") return
    ring.hidden = true
    action?.highlight?.(false)
    action = undefined
    trigger = undefined
  })

  function open(event: MouseEvent | KeyboardEvent) {
    const targetElement = event.target as Element
    const next = map.contains(targetElement) ? resolve(event) : undefined
    const actions = next ? [next] : targetElement.closest("button") ? [] : quickActions()
    if (!actions.length) return
    event.preventDefault()
    close()
    action = next
    const anchor = event.target instanceof HTMLElement && event.target.matches("button") ? event.target : viewport
    trigger = anchor
    const target = anchor.getBoundingClientRect()
    const bounds = viewport.getBoundingClientRect()
    const x = event instanceof MouseEvent ? event.clientX : target.left + target.width / 2
    const y = event instanceof MouseEvent ? event.clientY : target.bottom
    const marker = next?.marker?.getBoundingClientRect()
    if (marker) {
      const board = map.getBoundingClientRect()
      const diameter = Math.max(marker.width, marker.height) + 8
      ring.style.left = `${((marker.left + marker.width / 2 - board.left) / board.width) * 100}%`
      ring.style.top = `${((marker.top + marker.height / 2 - board.top) / board.height) * 100}%`
      ring.style.width = ring.style.height = `${(diameter / board.width) * 100}%`
      ring.hidden = false
    }
    next?.highlight?.(true)
    title.textContent = next?.targetName ?? "Ferramentas do mapa"
    menu.setAttribute("aria-label", next ? `Ações: ${next.targetName}` : "Ferramentas do mapa")
    items.replaceChildren(...actions.map(createButton))
    menu.style.maxHeight = `${Math.max(0, bounds.height - 8)}px`
    menu.showPopover({ source: anchor })
    const right = bounds.right - menu.offsetWidth - 4
    const near = (marker?.right ?? x) + 12
    const away = (marker?.left ?? x) - menu.offsetWidth - 12
    const left = near <= right ? near : away
    menu.style.left = `${Math.max(bounds.left + 4, Math.min(left, right))}px`
    menu.style.top = `${Math.max(bounds.top + 4, Math.min((marker?.top ?? y) + 8, bounds.bottom - menu.offsetHeight - 4))}px`
    const enabled = items.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
    const first = items.querySelector<HTMLButtonElement>('[aria-checked="true"]:not(:disabled)') ?? enabled[0]
    first?.focus({ preventScroll: true })
  }

  function createButton(item: MenuItem) {
    const button = document.createElement("button")
    button.type = "button"
    button.tabIndex = -1
    button.dataset.slot = "button"
    button.dataset.variant = "ghost"
    button.dataset.size = "sm"
    button.disabled = Boolean(item.disabled)
    button.setAttribute("role", item.selected === undefined ? "menuitem" : "menuitemradio")
    if (item.selected !== undefined) button.setAttribute("aria-checked", String(item.selected))
    if (item.startsHistory) button.dataset.historyStart = ""
    if (item.icon) button.innerHTML = iconMarkup(item.icon)
    button.append(item.label)
    button.onclick = () => {
      close()
      item.run()
      viewport.focus({ preventScroll: true })
    }
    return button
  }

  viewport.addEventListener("contextmenu", open)
  viewport.addEventListener("keydown", event => {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) open(event)
  })
  menu.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      const previous = trigger
      close()
      previous?.focus({ preventScroll: true })
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const enabled = Array.from(items.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"))
    const index = enabled.indexOf(event.target as HTMLButtonElement)
    const offset = event.key === "ArrowDown" ? 1 : -1
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? enabled.length - 1
          : (index + offset + enabled.length) % enabled.length
    enabled[next]?.focus()
  })
  return { close }
}
