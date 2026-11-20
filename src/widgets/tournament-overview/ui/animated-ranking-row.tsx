import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { revealContent } from "@/shared/lib/motion"

// React Bits Animated Content, adapted to enter on mount in a semantic ranking list.
// https://www.reactbits.dev/animations/animated-content
export function AnimatedRankingRow(props: ComponentPropsWithoutRef<"li">) {
  const row = useRef<HTMLLIElement>(null)
  useLayoutEffect(() => {
    revealContent(row.current, true)
  }, [])
  return <li {...props} ref={row} />
}
