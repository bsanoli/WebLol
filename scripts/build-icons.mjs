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
  hand: "Hand",
  draw: "ArrowUpRight",
  erase: "Eraser",
  ward: "Eye",
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
  expand: "Maximize02",
  collapse: "Minimize02",
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
  "  </symbol>",
  '  <symbol id="map-tool-move" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
  '    <path d="M4 3l4.5 15 3.3-5.7 5.7-3.3L4 3z" fill="currentColor" fill-opacity=".18"/>',
  '    <path d="M12 13l5 6M14 19h3v-3M18 11h3m-1.5-1.5v3"/>',
  "  </symbol>",
  '  <symbol id="map-tool-hand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
  '    <path d="M8 12V6.5a1.5 1.5 0 013 0V4a1.5 1.5 0 013 0v6-3a1.5 1.5 0 013 0v3a1.5 1.5 0 013 0v4.5A6.5 6.5 0 0113.5 21h-1a5 5 0 01-4.1-2.1l-4-5.6a1.6 1.6 0 012.5-2L8 12z" fill="currentColor" fill-opacity=".18"/>',
  '    <path d="M11 6v4m-1 4c1.7 0 3 1.2 3 2.7"/>',
  "  </symbol>",
  '  <symbol id="map-tool-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
  '    <path d="M6 18l11-11M12 6h6v6"/>',
  '    <circle cx="5" cy="19" r="2" fill="currentColor" fill-opacity=".18"/>',
  "  </symbol>",
  '  <symbol id="map-tool-brush" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
  '    <path d="M10 12.5l7.5-8a1.4 1.4 0 012 2l-7.6 8-1.9-2z"/>',
  '    <path d="M12 14.5c.4 2.5-1.7 4-4 3.4-1.2-.3-2 .1-2.7.7 1-1.4 1-2 1.1-3.1.2-1.8 1.9-3 3.6-3l2 2z" fill="currentColor" fill-opacity=".18"/>',
  '    <path d="M4 20.5c3.2 1.5 5.6-.4 8.9-.6 2.6-.1 4.1 1.1 6.6.1"/>',
  "  </symbol>",
  '  <symbol id="map-tool-erase" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">',
  '    <path d="M6.5 18l-3-3a2 2 0 010-2.8l7.6-7.6a2 2 0 012.8 0l5.1 5.1a2 2 0 010 2.8L13.5 18h-7z" fill="currentColor" fill-opacity=".18"/>',
  '    <path d="M7.5 8.3l7.3 7.3M6.5 18h14"/>',
  "  </symbol>",
  "</svg>",
  "",
].join("\n")

writeFileSync(new URL("../public/assets/icons.svg", import.meta.url), sprite)
