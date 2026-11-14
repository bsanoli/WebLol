export const palettes = [
  { id: "weblol", label: "WebLol" },
  { id: "dracula", label: "Dracula" },
  { id: "monokai", label: "Monokai" },
  { id: "nord", label: "Nord" },
  { id: "solarized", label: "Solarized Dark" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "catppuccin", label: "Catppuccin Mocha" },
  { id: "gruvbox", label: "Gruvbox Dark" },
  { id: "one-dark", label: "One Dark" },
  { id: "everforest", label: "Everforest" },
] as const

export type PaletteId = (typeof palettes)[number]["id"]

// Keep the stored preference from when themes were only available in Composições.
const paletteKey = "weblol-composition-palette"
const previousPalettes = new Map([
  ["turquoise", "tokyo-night"], ["violet", "dracula"], ["pink", "catppuccin"],
  ["lime", "monokai"], ["silver", "nord"], ["amber", "solarized"],
])

export function initializeTheme(): PaletteId {
  let stored = window.frameElement?.ownerDocument.documentElement.dataset.palette
  if (!stored) {
    try { stored = localStorage.getItem(paletteKey) ?? undefined } catch {}
  }
  const id = stored && (previousPalettes.get(stored) ?? stored)
  const palette = palettes.find(option => option.id === id)?.id ?? "weblol"
  document.documentElement.dataset.palette = palette
  return palette
}

export function selectTheme(palette: PaletteId) {
  document.documentElement.dataset.palette = palette
  for (const frame of document.querySelectorAll<HTMLIFrameElement>("#screens iframe")) {
    const root = frame.contentDocument?.documentElement
    if (root) root.dataset.palette = palette
  }
  try { localStorage.setItem(paletteKey, palette) } catch {}
}
