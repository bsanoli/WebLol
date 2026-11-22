import { useEffect, useState } from "react"
import { Button } from "@/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { palettes, selectTheme, type PaletteId } from "@/shared/config"

export function ThemePicker({ initialPalette }: { initialPalette: PaletteId }) {
  const [palette, setPalette] = useState(initialPalette)
  const [open, setOpen] = useState(false)
  const selected = palettes.find(option => option.id === palette)
  if (!selected) throw new Error(`Paleta desconhecida: ${palette}`)

  useEffect(() => {
    if (!open) return
    const listeners = new AbortController()
    for (const frame of document.querySelectorAll<HTMLIFrameElement>("#screens iframe")) {
      frame.contentDocument?.addEventListener("pointerdown", () => setOpen(false), { signal: listeners.signal })
    }
    return () => listeners.abort()
  }, [open])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="theme-trigger" aria-label={`Tema: ${selected.label}`}>
          <span className="palette-preview" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="palette-options"
        align="end"
        sideOffset={12}
        aria-label="Temas do WebLol"
        onCloseAutoFocus={event => {
          if (document.activeElement instanceof HTMLIFrameElement) event.preventDefault()
        }}
      >
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={palette}
            onValueChange={value => {
              const option = palettes.find(option => option.id === value)
              if (!option) return
              selectTheme(option.id)
              setPalette(option.id)
            }}
          >
            {palettes.map(option => (
              <DropdownMenuRadioItem
                key={option.id}
                value={option.id}
                className="palette-option"
                data-palette={option.id}
              >
                <span className="palette-preview" aria-hidden="true" />
                <span className="palette-label">{option.label}</span>
                <svg className="icon palette-indicator" aria-hidden="true" focusable="false">
                  <use href="assets/icons.svg#check" />
                </svg>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
