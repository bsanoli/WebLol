import type { ComponentProps } from "react"
import {
  Combobox,
  ComboboxContent as ComboboxContentPrimitive,
  ComboboxEmpty as ComboboxEmptyPrimitive,
  ComboboxInput as ComboboxInputPrimitive,
  ComboboxItem as ComboboxItemPrimitive,
  ComboboxList as ComboboxListPrimitive,
  ComboboxTrigger,
} from "@ui-sdk/react/combobox"
import { cn } from "@/shared/lib/utils"

/**
 * Seletor com busca: botão que abre um popup com campo de pesquisa e lista filtrável.
 * O Radix não tem esse padrão, então ele vem do UI SDK. Foco, setas, Enter, Esc e leitor de tela já vêm prontos.
 * Use `className` para ajustar largura e altura de cada tela.
 */
function ComboboxContent({ className, ...props }: ComponentProps<typeof ComboboxContentPrimitive>) {
  return (
    <ComboboxContentPrimitive align="start" className={cn("team-note-popover wl-combobox", className)} {...props} />
  )
}

function ComboboxInput({ className, ...props }: ComponentProps<typeof ComboboxInputPrimitive>) {
  return <ComboboxInputPrimitive data-slot="input" className={className} {...props} />
}

function ComboboxList({ className, ...props }: ComponentProps<typeof ComboboxListPrimitive>) {
  return <ComboboxListPrimitive className={cn("wl-combobox-list", className)} {...props} />
}

function ComboboxItem({ className, ...props }: ComponentProps<typeof ComboboxItemPrimitive>) {
  return <ComboboxItemPrimitive className={cn("wl-combobox-item", className)} {...props} />
}

function ComboboxEmpty({ className, ...props }: ComponentProps<typeof ComboboxEmptyPrimitive>) {
  return <ComboboxEmptyPrimitive className={cn("wl-combobox-empty", className)} {...props} />
}

export { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger }
