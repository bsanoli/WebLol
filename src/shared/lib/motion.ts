/** Motion is decorative; no callback, focus or state change waits for it. */
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
const running = new Set<Animation>()
const byElement = new WeakMap<Element, Animation>()

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) for (const animation of running) animation.cancel()
})

export function revealContent(element: Element | null, quick = false) {
  if (!element || reducedMotion.matches || !element.getClientRects().length) return
  byElement.get(element)?.cancel()
  const tokens = getComputedStyle(document.documentElement)
  const duration = parseFloat(tokens.getPropertyValue(quick ? "--wl-motion-normal" : "--wl-motion-panel")) || 240
  const distance = tokens.getPropertyValue("--wl-motion-distance").trim() || "6px"
  const animation = element.animate(
    [
      { opacity: 0.35, translate: `0 ${distance}` },
      { opacity: 1, translate: "0 0" },
    ],
    { duration, easing: tokens.getPropertyValue("--wl-motion-ease").trim() || "ease-out" },
  )
  byElement.set(element, animation)
  running.add(animation)
  const cleanup = () => running.delete(animation)
  animation.addEventListener("finish", cleanup, { once: true })
  animation.addEventListener("cancel", cleanup, { once: true })
}
