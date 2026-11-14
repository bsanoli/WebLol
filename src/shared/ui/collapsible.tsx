import type { ComponentProps } from "react"
import { Collapsible as Primitive } from "radix-ui"

export function Collapsible(props: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="collapsible" {...props} />
}

export function CollapsibleContent(props: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content data-slot="collapsible-content" {...props} />
}
