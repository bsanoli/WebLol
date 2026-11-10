import { useEffect, useRef, useState } from "react"
import { palettes, selectTheme, type PaletteId } from "@/client/theme"

export function ThemePicker({ initialPalette }: { initialPalette: PaletteId }) {
  const [palette, setPalette] = useState(initialPalette)
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const selected = palettes.find(option => option.id === palette)!

  function closeMenu(restoreFocus: boolean) {
    if (!menu.current?.open) return
    menu.current.open = false
    if (restoreFocus) trigger.current?.focus()
  }

  useEffect(() => {
    const listeners = new AbortController()
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) closeMenu(false)
    }

    document.addEventListener("pointerdown", outside, { signal: listeners.signal })
    for (const frame of document.querySelectorAll<HTMLIFrameElement>("#screens iframe")) {
      frame.addEventListener("load", () => {
        frame.contentDocument?.addEventListener("pointerdown", outside, { signal: listeners.signal })
      }, { signal: listeners.signal })
    }
    return () => listeners.abort()
  }, [])

  return (
    <details className="palette" ref={menu}
      onKeyDown={event => {
        if (event.key !== "Escape" || !menu.current?.open) return
        event.preventDefault()
        closeMenu(true)
      }}
    >
      <summary ref={trigger} aria-label={`Tema: ${selected.label}`}>
        <span className="palette-preview" aria-hidden="true" />
        <span>Tema</span>
      </summary>
      <div className="palette-options" role="group" aria-label="Temas do WebLol">
        {palettes.map(option => (
          <button key={option.id} type="button" className="palette-option" data-palette={option.id}
            aria-pressed={option.id === palette}
            onClick={() => {
              selectTheme(option.id)
              setPalette(option.id)
              closeMenu(true)
            }}
          >
            <span className="palette-preview" aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>
    </details>
  )
}
