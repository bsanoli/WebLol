/** Arrastar uma comp da lista da gaveta de Táticas e soltar num dos lados do quadro. O tipo próprio não colide com o arrastar de campeões. */
export const COMP_DRAG_TYPE = "text/x-weblol-comp"

export function bindTacticDrop(editor: HTMLElement, onDrop: (compId: string, side: "blue" | "red") => void) {
  const zone = (event: Event) => (event.target as Element | null)?.closest?.<HTMLElement>("[data-drop-side]") ?? null
  const hasComp = (event: DragEvent) => !!event.dataTransfer?.types.includes(COMP_DRAG_TYPE)
  editor.addEventListener("dragstart", event => {
    const tab = (event.target as Element | null)?.closest?.<HTMLElement>("[data-tactic-comp]")
    if (!tab?.dataset.tacticComp || !event.dataTransfer) return
    event.dataTransfer.setData(COMP_DRAG_TYPE, tab.dataset.tacticComp)
    event.dataTransfer.effectAllowed = "copyMove"
  })
  editor.addEventListener("dragover", event => {
    const host = zone(event)
    if (!host || !hasComp(event)) return
    event.preventDefault()
    host.classList.add("drop")
  })
  editor.addEventListener("dragleave", event => {
    const host = zone(event)
    if (host && !host.contains(event.relatedTarget as Node | null)) host.classList.remove("drop")
  })
  editor.addEventListener("drop", event => {
    const host = zone(event)
    const id = event.dataTransfer?.getData(COMP_DRAG_TYPE)
    host?.classList.remove("drop")
    if (!host || !id) return
    event.preventDefault()
    onDrop(id, host.dataset.dropSide === "red" ? "red" : "blue")
  })
  document.addEventListener("dragend", () => editor.querySelector(".tx-side-col.drop")?.classList.remove("drop"))
}
