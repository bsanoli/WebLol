import { clamp, isSide, type Side } from "../model/battlefield"

export function mountWardSidePopover(viewport: HTMLElement, changeSide: (side?: Side) => void) {
  const popover = document.querySelector<HTMLElement>("#map-ward-popover")!
  const camera = document.querySelector<HTMLElement>(".map-camera-controls")!
  const options = [...popover.querySelectorAll<HTMLButtonElement>("[data-ward-side]")]
  let trigger: HTMLButtonElement | undefined
  const isOpen = () => popover.matches(":popover-open")

  function close(restoreFocus = false) {
    const previousTrigger = trigger
    if (isOpen()) popover.hidePopover()
    if (restoreFocus) previousTrigger?.focus({ preventScroll: true })
  }

  popover.addEventListener("beforetoggle", event => {
    if (event.newState !== "closed") return
    trigger?.setAttribute("aria-expanded", "false")
    trigger = undefined
  })
  popover.addEventListener("keydown", event => {
    if (event.key !== "Escape") return
    event.preventDefault()
    event.stopPropagation()
    close(true)
  })
  for (const button of options) {
    button.addEventListener("click", () => {
      const side = button.dataset.wardSide
      changeSide(isSide(side) ? side : undefined)
    })
  }

  return {
    close,
    open(anchor: HTMLButtonElement, side?: Side) {
      trigger = anchor
      const active = options.find(option => option.dataset.wardSide === (side ?? ""))
      for (const option of options) option.setAttribute("aria-pressed", String(option === active))
      anchor.setAttribute("aria-expanded", "true")
      popover.showPopover({ source: anchor })

      const gap = 8
      const ward = anchor.getBoundingClientRect()
      const bounds = viewport.getBoundingClientRect()
      const left = Math.max(0, bounds.left) + gap
      const top = Math.max(0, bounds.top) + gap
      const right = Math.min(document.documentElement.clientWidth, bounds.right) - gap
      const bottom = Math.min(document.documentElement.clientHeight, bounds.bottom) - gap
      const { offsetWidth: width, offsetHeight: height } = popover
      const center = ward.left + (ward.width - width) / 2
      const x = left + clamp(center - left, Math.max(0, right - width - left))
      const controls = camera.getBoundingClientRect()
      const limit = x + width > controls.left && x < controls.right ? Math.min(bottom, controls.top - gap) : bottom
      const y = ward.bottom + gap + height <= limit ? ward.bottom + gap : ward.top - gap - height
      popover.style.left = `${x}px`
      popover.style.top = `${top + clamp(y - top, Math.max(0, limit - height - top))}px`
      active?.focus({ preventScroll: true })
    },
  }
}
