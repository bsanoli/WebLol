import { requireElement } from "@/shared/lib/dom"
export function mountMapHistory<Snapshot>({
  capture,
  restore,
  canEdit,
}: {
  capture: () => Snapshot
  restore: (snapshot: Snapshot) => Snapshot | undefined
  canEdit: () => boolean
}) {
  const undoButton = requireElement<HTMLButtonElement>("#undo")
  const redoButton = requireElement<HTMLButtonElement>("#redo")
  const undo: Snapshot[] = [],
    redo: Snapshot[] = []
  function update() {
    undoButton.disabled = !canEdit() || !undo.length
    redoButton.disabled = !canEdit() || !redo.length
  }
  function step(from: Snapshot[], to: Snapshot[]) {
    if (!canEdit()) return
    while (from.length) {
      const snapshot = from.pop()
      if (!snapshot) break
      const previous = restore(snapshot)
      if (!previous) continue
      to.push(previous)
      break
    }
    update()
  }
  undoButton.onclick = () => step(undo, redo)
  redoButton.onclick = () => step(redo, undo)
  document.addEventListener("keydown", event => {
    if (
      !requireElement("#v-map").classList.contains("on") ||
      !canEdit() ||
      (event.target as Element).closest("input, textarea, select, [role=slider], [contenteditable], [role=dialog]") ||
      !(event.ctrlKey || event.metaKey)
    )
      return
    const key = event.key.toLowerCase()
    if (key !== "z" && key !== "y") return
    event.preventDefault()
    if (key === "z" && !event.shiftKey) step(undo, redo)
    else step(redo, undo)
  })
  update()
  return {
    update,
    record() {
      undo.push(capture())
      if (undo.length > 100) undo.shift()
      redo.length = 0
      update()
    },
  }
}
