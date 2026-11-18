import { laneIconMarkup } from "@/shared/ui/icon"
import type { MapPoint } from "../model/faelights"
import { clamp } from "../model/battlefield"
import { RN, TOKS } from "../model/play"

type Positions = Record<string, MapPoint>
type Side = "b" | "r"
type Role = keyof typeof RN
const directions = new Map<string, MapPoint>([
  ["ArrowLeft", [-1, 0]], ["ArrowRight", [1, 0]], ["ArrowUp", [0, -1]], ["ArrowDown", [0, 1]],
])
const sizeKey = "weblol-map-champion-size"

function mountChampionSize(map: HTMLElement) {
  const input = document.querySelector<HTMLInputElement>("#map-champion-size")!
  const display = document.getElementById("map-champion-size-value")!
  try {
    const saved = Number(localStorage.getItem(sizeKey))
    if (saved >= Number(input.min) && saved <= Number(input.max)) input.valueAsNumber = saved
  } catch {}
  function apply() {
    const value = input.valueAsNumber
    map.style.setProperty("--map-champion-scale", String(value / 100))
    display.textContent = `${value}%`
    input.setAttribute("aria-valuetext", `${value}%`)
  }
  input.addEventListener("input", apply)
  input.addEventListener("change", () => {
    try { localStorage.setItem(sizeKey, input.value) } catch {}
  })
  apply()
}

export function mountChampionLayer({ map, read, write, preview, canMove, point, champion, portrait }: {
  map: HTMLElement
  read: () => Positions
  write: (positions: Positions) => void
  preview: (positions: Positions) => void
  canMove: () => boolean
  point: (event: MouseEvent) => MapPoint
  champion: (side: Side, role: Role) => string | undefined
  portrait: (name: string) => string
}) {
  mountChampionSize(map)
  const tokens = TOKS.map(id => {
    const [side, role] = id.split("_") as [Side, Role]
    const button = document.createElement("button")
    button.type = "button"
    button.className = `tok ${side}`
    button.dataset.t = id
    map.append(button)
    return { id, side, role, button }
  })
  let drag: { id: string; pointer: number; start: MapPoint; position?: MapPoint } | undefined

  function place(positions = read()) {
    for (const { button, id } of tokens) {
      const point = positions[id]
      if (!point) continue
      button.style.left = point[0] + "%"
      button.style.top = point[1] + "%"
    }
  }

  function render() {
    for (const { button, side, role } of tokens) {
      const name = champion(side, role)
      button.innerHTML = (name ? portrait(name) : "") + `<span class="map-lane-icon">${laneIconMarkup(role)}</span>`
      button.title = `${side === "b" ? "Azul" : "Vermelho"} ${RN[role]}${name ? " - " + name : ""}`
      button.setAttribute("aria-label", button.title)
    }
    place()
  }

  map.addEventListener("keydown", event => {
    const token = (event.target as Element).closest<HTMLButtonElement>(".tok")
    const direction = directions.get(event.key)
    if (!token || !direction || !canMove() || event.ctrlKey || event.altKey || event.metaKey) return
    const id = token.dataset.t!, current = read()[id]
    if (!current) return
    event.preventDefault()
    const step = event.shiftKey ? 5 : 1
    const next: MapPoint = [clamp(current[0] + direction[0] * step), clamp(current[1] + direction[1] * step)]
    if (next[0] !== current[0] || next[1] !== current[1]) write({ ...read(), [id]: next })
  })

  map.addEventListener("pointerdown", event => {
    const token = (event.target as Element).closest<HTMLButtonElement>(".tok")
    if (!token || !canMove() || event.button !== 0) return
    drag = { id: token.dataset.t!, pointer: event.pointerId, start: point(event) }
    token.setPointerCapture(event.pointerId)
    token.focus({ preventScroll: true })
    event.preventDefault()
  })
  map.addEventListener("pointermove", event => {
    if (!drag || drag.pointer !== event.pointerId || !canMove()) return
    const here = point(event)
    if (!drag.position && Math.hypot(here[0] - drag.start[0], here[1] - drag.start[1]) < .3) return
    drag.position = here
    const positions = { ...read(), [drag.id]: here }
    place(positions)
    preview(positions)
  })
  map.addEventListener("pointerup", event => {
    if (!drag || drag.pointer !== event.pointerId) return
    const change = drag
    drag = undefined
    if (change.position && canMove()) write({ ...read(), [change.id]: change.position })
    else { place(); preview(read()) }
  })
  map.addEventListener("lostpointercapture", event => {
    if (!drag || drag.pointer !== event.pointerId) return
    drag = undefined
    place()
    preview(read())
  })

  return { render, place, setInteractive(enabled: boolean) {
    for (const { button } of tokens) button.tabIndex = enabled ? 0 : -1
  } }
}
