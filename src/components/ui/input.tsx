import type { ComponentProps } from "react"

function Input(props: ComponentProps<"input">) {
  return <input data-slot="input" {...props} />
}

export { Input }
