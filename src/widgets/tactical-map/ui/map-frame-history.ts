import { mountMapHistory } from "./map-history"
import type { MapRuntime } from "./map-runtime"
import { clone, type HistorySnapshot } from "./map-session"

/** Desfazer e refazer do quadro ao vivo e do passo em edição. */
export function mountMapFrameHistory({
  session: M,
  state,
  plays,
  play,
  snapshotFrame,
  canChangeFrame,
  save,
  layers,
  actions,
}: MapRuntime) {
  return mountMapHistory<HistorySnapshot>({
    canEdit: canChangeFrame,
    capture: () => ({
      pid: state().curPlay,
      live: clone(play().live),
      step: M.edit ? play().steps[M.sel] : undefined,
    }),
    restore: ({ pid, live, step }) => {
      const p = plays().find(candidate => candidate.id === pid)
      if (!p) return
      const stepIndex = step ? p.steps.indexOf(step) : -1
      const previous = { pid, live: step && stepIndex >= 0 ? snapshotFrame(step) : p.live, step }
      p.live = live
      if (state().curPlay !== pid) {
        state().curPlay = pid
        M.sel = -1
      }
      if (step && stepIndex >= 0) {
        M.sel = stepIndex
        Object.assign(step, snapshotFrame(live))
      }
      layers.drawing.reset()
      layers.wardLayer.clearSelection()
      save(false)
      actions.renderPlays()
      return previous
    },
  })
}
