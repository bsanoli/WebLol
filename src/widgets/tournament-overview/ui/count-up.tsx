import { animate } from "motion"
import { useEffect, useRef } from "react"

const formatNumber = new Intl.NumberFormat("pt-BR")

// Count Up adapted from React Bits for whole-number tournament totals.
// https://www.reactbits.dev/text-animations/count-up
export function CountUp({ value }: { value: number }) {
  const visualRef = useRef<HTMLSpanElement>(null)
  const label = formatNumber.format(value)

  useEffect(() => {
    const visual = visualRef.current
    const preference = visual?.ownerDocument.defaultView?.matchMedia("(prefers-reduced-motion: reduce)")
    if (!visual || !preference || preference.matches) return

    const animation = animate(0, value, {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: current => {
        visual.textContent = formatNumber.format(Math.round(current))
      },
    })
    const finish = () => {
      animation.stop()
      visual.textContent = label
    }
    const handleMotionChange = () => {
      if (preference.matches) finish()
    }
    preference.addEventListener("change", handleMotionChange)
    return () => {
      finish()
      preference.removeEventListener("change", handleMotionChange)
    }
  }, [label, value])

  return (
    <span className="metric-count">
      <span className="metric-count-label">{label}</span>
      <span className="metric-count-visual" ref={visualRef} aria-hidden="true">
        {label}
      </span>
    </span>
  )
}
