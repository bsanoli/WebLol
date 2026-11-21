import { TOKS, initialFrame } from "@/entities/tactical-play"
import { $ } from "@/shared/lib/dom"
import { readWaves } from "../model/battlefield"
import { readWards } from "../model/wards"
import { hasArrowhead } from "./map-drawing"
import type { MapRuntime } from "./map-runtime"

/** Botões de limpar setas, traços, waves, anotações e de restaurar o mapa. */
export function mountMapClearControls({ canChangeFrame, play, layers, actions }: MapRuntime) {
  const clearArrows = $<HTMLButtonElement>("#clr")
  const clearMap = $<HTMLButtonElement>("#map-clear-all")
  const clearWaves = $<HTMLButtonElement>("#map-clear-waves")
  const clearStrokes = $<HTMLButtonElement>("#map-clear-strokes")
  const resetMap = $<HTMLButtonElement>("#map-reset")
  const initialPositions = initialFrame().pos

  function frameHasChanges() {
    const { pos, lines, wards, waves, destroyedTowers } = play().live
    return Boolean(
      lines?.length ||
        readWards(wards).length ||
        readWaves(waves).length ||
        destroyedTowers?.length ||
        TOKS.some(id => initialPositions[id].some((axis, index) => axis !== pos[id]?.[index])),
    )
  }
  function updateClearMap() {
    const { lines, wards, waves } = play().live
    const canEdit = canChangeFrame()
    const hasWaves = readWaves(waves).length > 0
    const hasAnnotations = lines?.length || readWards(wards).length || hasWaves
    clearArrows.disabled = !canEdit || !lines?.some(hasArrowhead)
    clearStrokes.disabled = !canEdit || !lines?.some(line => !hasArrowhead(line))
    clearWaves.disabled = !canEdit || !hasWaves
    clearMap.disabled = !canEdit || !hasAnnotations
    resetMap.disabled = !canChangeFrame() || (layers.vision.getPerspective() === "all" && !frameHasChanges())
  }
  function resetSelections() {
    layers.drawing.reset()
    layers.wardLayer.clearSelection()
  }
  clearArrows.onclick = () => {
    if (!clearArrows.disabled) actions.commit({ lines: play().live.lines.filter(line => !hasArrowhead(line)) })
  }
  clearStrokes.onclick = () => {
    if (!clearStrokes.disabled) actions.commit({ lines: play().live.lines.filter(hasArrowhead) })
  }
  clearWaves.onclick = () => {
    if (!clearWaves.disabled) actions.commit({ waves: [] })
  }
  clearMap.onclick = () => {
    if (!clearMap.disabled) {
      resetSelections()
      actions.commit({ lines: [], wards: [], waves: [] })
    }
  }
  resetMap.onclick = () => {
    if (resetMap.disabled) return
    if (frameHasChanges()) {
      resetSelections()
      actions.writeFrame(initialFrame())
    }
    layers.vision.resetPerspective()
  }
  return { updateClearMap }
}
