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
  const animation = element.animate([
    { opacity: .35, translate: `0 ${distance}` },
    { opacity: 1, translate: "0 0" },
  ], { duration, easing: tokens.getPropertyValue("--wl-motion-ease").trim() || "ease-out" })
  byElement.set(element, animation)
  running.add(animation)
  const cleanup = () => running.delete(animation)
  animation.addEventListener("finish", cleanup, { once: true })
  animation.addEventListener("cancel", cleanup, { once: true })
}

/** One observer per persistent navigation; resize also handles wrapping on mobile. */
export function initializeMotionNav(selector: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach(nav => {
    nav.classList.add("wl-motion-nav")
    let pending = 0
    const update = () => {
      cancelAnimationFrame(pending)
      pending = requestAnimationFrame(() => {
        const active = nav.querySelector<HTMLElement>('button:is([aria-current="page"],[aria-pressed="true"])')
        if (!active || !active.getClientRects().length) {
          nav.style.setProperty("--wl-nav-width", "0px")
          return
        }
        const parent = nav.getBoundingClientRect()
        const rect = active.getBoundingClientRect()
        nav.style.setProperty("--wl-nav-width", `${rect.width}px`)
        nav.style.setProperty("--wl-nav-x", `${rect.left - parent.left + nav.scrollLeft}px`)
        nav.style.setProperty("--wl-nav-y", `${rect.bottom - parent.top + nav.scrollTop - 2}px`)
        requestAnimationFrame(() => { nav.dataset.motionReady = "" })
      })
    }
    new MutationObserver(update).observe(nav, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["aria-current", "aria-pressed"],
    })
    new ResizeObserver(update).observe(nav)
    void document.fonts.ready.then(update)
    update()
  })
}
