import { writeFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as UntitledIcons from "@untitledui/icons"

const icons = {
  flag: "Flag01",
  worlds: "Trophy01",
  team: "Users01",
  admin: "ShieldTick",
  map: "Map01",
  book: "BookOpen01",
  plus: "Plus",
  upload: "Upload01",
  download: "Download01",
  move: "Move",
  draw: "ArrowUpRight",
  erase: "Eraser",
  folder: "Folder",
  exit: "LogOut01",
  chart: "BarChart03",
  champion: "UserSquare",
  "champion-add": "UserPlus01",
  matchups: "Target02",
  player: "User01",
  inventory: "Backpack",
  link: "Link01",
  close: "XClose",
  check: "Check",
  next: "ChevronRight",
  previous: "ChevronLeft",
  ascending: "ChevronUp",
  descending: "ChevronDown",
  undo: "ReverseLeft",
  redo: "ReverseRight",
  edit: "Edit03",
  play: "Play",
  stop: "Square",
  warning: "AlertTriangle",
  note: "File02",
  freeze: "Snowflake01",
  layers: "LayersThree01",
  reset: "RefreshCcw01",
  clock: "Clock",
  duplicate: "Copy01",
  trash: "Trash01",
  lock: "Lock01",
}

const symbols = Object.entries(icons).map(([id, name]) => {
  const Icon = UntitledIcons[name]
  if (!Icon) throw new Error(`Untitled UI icon not found: ${name}`)
  const svg = renderToStaticMarkup(createElement(Icon))
  const end = svg.indexOf(">")
  if (!svg.startsWith("<svg ") || !svg.endsWith("</svg>")) {
    throw new Error(`Unexpected SVG for ${name}`)
  }
  const attributes = svg.slice(4, end).replace(/ (width|height|aria-hidden)="[^"]*"/g, "")
  const content = svg.slice(end + 1, -"</svg>".length)
  return `  <symbol id="${id}"${attributes}>${content}</symbol>`
})

const sprite = [
  '<svg xmlns="http://www.w3.org/2000/svg">',
  "  <!-- Untitled UI Icons · https://www.untitledui.com/resources/icons -->",
  ...symbols,
  '  <symbol id="composition" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
  '    <circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/>',
  '    <circle cx="12" cy="12" r="2"/>',
  '    <circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  '  </symbol>',
  "</svg>",
  "",
].join("\n")

writeFileSync(new URL("../public/assets/icons.svg", import.meta.url), sprite)
