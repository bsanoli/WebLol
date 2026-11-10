import * as React from "react"
import { Slot } from "radix-ui"

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  asChild?: boolean
}

function Button({
  variant = "default",
  size = "default",
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      type={asChild ? undefined : type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      {...props}
    />
  )
}

export { Button }
