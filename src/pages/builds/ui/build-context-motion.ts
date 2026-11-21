import { animate } from "motion"
import { reduceBuildMotion } from "./build-media"

/** Transições do painel de contexto (confrontos e destaques) ao lado da build. */
export function createBuildContextMotion(container: HTMLElement) {
  let contextAnimation: ReturnType<typeof animate> | undefined
  let matchupCardAnimation: Animation | undefined

  const stopContextAnimation = () => {
    contextAnimation?.stop()
    contextAnimation = undefined
  }

  const updateBuildContext = (html: string, trigger: HTMLButtonElement) => {
    matchupCardAnimation?.cancel()
    const viewport = container.querySelector<HTMLElement>(".build-context-transition")
    if (!viewport) return
    const outgoing = viewport.lastElementChild as HTMLElement
    const startHeight = viewport.getBoundingClientRect().height
    const startOpacity = getComputedStyle(outgoing).opacity
    stopContextAnimation()
    viewport.querySelector(".build-context-outgoing")?.remove()
    viewport.style.height = ""
    viewport.style.overflow = ""

    if (outgoing.contains(document.activeElement)) trigger.focus({ preventScroll: true })
    if (!startHeight || reduceBuildMotion.matches) {
      outgoing.innerHTML = html
      outgoing.style.opacity = ""
      return
    }

    const incoming = document.createElement("div")
    incoming.className = "build-context-content"
    incoming.innerHTML = html
    outgoing.inert = true
    outgoing.setAttribute("aria-hidden", "true")
    outgoing.classList.add("build-context-outgoing")
    viewport.append(incoming)
    const endHeight = viewport.getBoundingClientRect().height
    viewport.style.overflow = "clip"
    const animation = animate(
      [
        [viewport, { height: [`${startHeight}px`, `${endHeight}px`] }],
        [outgoing, { opacity: [Number(startOpacity), 0] }, { at: 0 }],
        [incoming, { opacity: [0, 1] }, { at: 0 }],
      ],
      { defaultTransition: { duration: 0.24, ease: [0.2, 0.7, 0.25, 1] } },
    )
    contextAnimation = animation
    void animation.then(() => {
      if (contextAnimation !== animation) return
      outgoing.remove()
      incoming.style.opacity = ""
      viewport.style.height = ""
      viewport.style.overflow = ""
      contextAnimation = undefined
    })
  }

  /** Acompanha o fechamento nativo do grupo de confrontos ajustando a altura máxima do painel. */
  const animateMatchupGroupToggle = (summary: Element) => {
    matchupCardAnimation?.cancel()
    const group = summary.parentElement as HTMLDetailsElement | null
    const card = group?.closest<HTMLElement>(".build-context-side")
    if (
      !group ||
      !card ||
      !group.open ||
      reduceBuildMotion.matches ||
      card.scrollHeight <= card.clientHeight ||
      !CSS.supports("interpolate-size", "allow-keywords")
    )
      return

    const contentHeight = parseFloat(getComputedStyle(group, "::details-content").blockSize)
    const startHeight = card.offsetHeight
    const endHeight = card.scrollHeight - contentHeight + startHeight - card.clientHeight
    if (endHeight < startHeight) {
      // Animate the viewport cap in sync with the native details transition.
      const styles = getComputedStyle(card)
      matchupCardAnimation = card.animate(
        { maxBlockSize: [`${startHeight}px`, `${Math.ceil(endHeight)}px`] },
        {
          duration: parseFloat(styles.getPropertyValue("--wl-motion-panel")),
          easing: styles.getPropertyValue("--build-matchup-close-ease").trim(),
        },
      )
    }
  }

  return { updateBuildContext, stopContextAnimation, animateMatchupGroupToggle }
}
