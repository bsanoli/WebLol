import { revealContent } from "@/shared/lib/motion"

export function showBuildOption(panels: NodeListOf<HTMLElement>, dataKey: "runeView" | "skillPanel", value: string) {
  for (const panel of panels) {
    const show = panel.dataset[dataKey] === value
    const wasHidden = panel.hidden
    panel.hidden = !show
    if (show && wasHidden) revealContent(panel, true)
  }
}

document.addEventListener("click", event => {
  const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-rune-tree-option]") : null
  const tree = button?.closest(".rune-tree")
  if (!button || !tree) return
  tree.querySelectorAll("[data-rune-tree-option]").forEach(option => {
    option.setAttribute("aria-pressed", String(option === button))
  })
  showBuildOption(
    tree.querySelectorAll<HTMLElement>("[data-rune-view]"),
    "runeView",
    button.dataset.runeTreeOption ?? "",
  )
})
