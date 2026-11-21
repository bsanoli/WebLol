// Gaveta de Táticas: trocar a posição de um pick no quadro (visão Draft).
import { draftOf, type DraftLane } from "../model/local-state"
import { compOf } from "./team-comps"
import { renderEditor } from "./team-editor"
import { $, eventTarget, S, save, touch } from "./team-store"

/** Cada coluna mostra a ordem do lado em que está; a troca grava nessa comp e nesse lado, como na Ordem do draft. */
function handleTacticLaneChange(field: HTMLSelectElement) {
  const comp = compOf(field),
    side = field.closest<HTMLElement>("[data-drop-side]")?.dataset.dropSide === "red" ? "red" : "blue"
  const order = draftOf(comp).order[side],
    i = Number(field.dataset.pickPosition),
    lane = field.value as DraftLane,
    j = order.indexOf(lane)
  if (j < 0 || i === j) return
  ;[order[i], order[j]] = [lane, order[i]]
  touch(comp)
  save()
  renderEditor()
  const owner = field.dataset.draftSide
  requestAnimationFrame(() =>
    $(
      `#editor [data-drop-side="${side}"] [data-pick-position="${i}"][data-draft-side="${owner}"] + .team-select button`,
    )?.focus({ preventScroll: true }),
  )
}

export function mountTacticLaneOrder() {
  $("#editor").addEventListener("change", e => {
    if (S.view !== "tactics" || !eventTarget(e).matches("select[data-pick-position]")) return
    handleTacticLaneChange(eventTarget<HTMLSelectElement>(e))
  })
}
