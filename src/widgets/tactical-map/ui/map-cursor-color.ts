import { STORAGE_KEYS } from "@/shared/config/storage-keys"
import moveCursor from "./cursors/move.svg?raw"
import openHandCursor from "./cursors/hand.svg?raw"
import closedHandCursor from "./cursors/hand-closed.svg?raw"

const colors = [
  { id: "green", label: "Verde", fill: "#49fa60", highlight: "#d5ffdd" },
  { id: "blue", label: "Azul", fill: "#78beff", highlight: "#e3f4ff" },
  { id: "gold", label: "Dourado", fill: "#ffd34d", highlight: "#fff1b2" },
  { id: "white", label: "Branco", fill: "#f3f7fa", highlight: "#ffffff" },
]
const shapes = [
  { property: "--map-cursor-move", svg: moveCursor, hotspot: [4, 3], fallback: "default" },
  { property: "--map-cursor-hand", svg: openHandCursor, hotspot: [12, 13], fallback: "grab" },
  { property: "--map-cursor-hand-closed", svg: closedHandCursor, hotspot: [12, 13], fallback: "grabbing" },
]
const artworkSize = 24
const colorKey = STORAGE_KEYS.mapCursorColor
const sizeKey = STORAGE_KEYS.mapCursorSize

export function mountMapCursorColor(layout: HTMLElement) {
  const palette = layout.querySelector<HTMLElement>("#map-cursor-colors")!
  const sizeButtons = Array.from(layout.querySelectorAll<HTMLButtonElement>("[data-cursor-size]"))
  let savedColor: string | null = null
  let savedSize: string | null = null
  try {
    savedColor = localStorage.getItem(colorKey)
    savedSize = localStorage.getItem(sizeKey)
  } catch {}
  let activeColor = colors.find(color => color.id === savedColor) ?? colors[0]
  let activeSize = sizeButtons.some(button => button.dataset.cursorSize === savedSize) ? Number(savedSize) : artworkSize

  const colorButtons = colors.map(color => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "col"
    button.style.setProperty("--swatch", color.fill)
    button.setAttribute("aria-label", color.label)
    button.title = color.label
    button.onclick = () => {
      activeColor = color
      apply()
      try {
        localStorage.setItem(colorKey, activeColor.id)
      } catch {}
    }
    return button
  })
  palette.replaceChildren(...colorButtons)

  for (const button of sizeButtons) {
    button.onclick = () => {
      activeSize = Number(button.dataset.cursorSize)
      apply()
      try {
        localStorage.setItem(sizeKey, String(activeSize))
      } catch {}
    }
  }

  function apply() {
    for (const { property, svg, hotspot, fallback } of shapes) {
      const artwork = svg
        .replace('width="24" height="24"', `width="${activeSize}" height="${activeSize}"`)
        .replaceAll("#49fa60", activeColor.fill)
        .replaceAll("#d5ffdd", activeColor.highlight)
      const scaledHotspot = hotspot.map(coordinate => Math.round((coordinate * activeSize) / artworkSize)).join(" ")
      layout.style.setProperty(
        property,
        `url("data:image/svg+xml,${encodeURIComponent(artwork)}") ${scaledHotspot}, ${fallback}`,
      )
    }
    colorButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(colors[index] === activeColor)))
    sizeButtons.forEach(button =>
      button.setAttribute("aria-pressed", String(Number(button.dataset.cursorSize) === activeSize)),
    )
  }

  apply()
}
