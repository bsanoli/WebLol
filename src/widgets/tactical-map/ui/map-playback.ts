import { preset } from "@/entities/tactical-play"
import { $ } from "@/shared/lib/dom"
import { iconMarkup } from "@/shared/ui/icon"
import { animatePieces } from "./frame-animation"
import type { MapRuntime } from "./map-runtime"
import { asFramePositions, type Frame } from "./map-session"

/** Presets de posição, navegação entre passos, animação entre quadros e reprodução da jogada. */
export function mountMapPlayback({
  session: M,
  play,
  snapshotFrame,
  canChangeFrame,
  save,
  toast,
  layers,
  actions,
}: MapRuntime) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const stepSpeed = $<HTMLInputElement>("#spd")

  function animateTo(target: Frame): Promise<void> {
    const p = play(),
      from = snapshotFrame(p.live)
    const duration = Number(stepSpeed.value) * 1000
    const transition = {}
    M.transition = transition
    actions.renderStat()
    actions.drawMapTools()
    M.frame = { ...target, pos: from.pos, waves: from.waves }
    layers.drawing.render()
    layers.wardLayer.render()
    layers.battlefield.renderTowers()

    const finish = () => {
      M.transition = null
      M.frame = null
      p.live = target
      save(false)
      if (!M.playing) {
        actions.renderStat()
        actions.drawMapTools()
        actions.refreshMap()
        layers.drawing.render()
      } else actions.refreshMap()
    }
    if (reducedMotion.matches) {
      finish()
      return M.playing ? new Promise<void>(resolve => setTimeout(resolve, duration)) : Promise.resolve()
    }
    return animatePieces(
      from,
      target,
      duration,
      () => M.transition === transition && play() === p,
      pieces => {
        if (M.frame) Object.assign(M.frame, pieces)
        layers.champions.place(pieces.pos)
        layers.battlefield.render()
      },
    ).then(completed => {
      if (completed) finish()
    })
  }
  function goStep(i: number) {
    const p = play()
    if (i < 0 || i >= p.steps.length) return
    M.sel = i
    layers.wardLayer.clearSelection()
    layers.drawing.reset()
    actions.renderPlays(true)
    return animateTo(snapshotFrame(p.steps[i]))
  }
  function stopPlayback() {
    if (M.playing && M.transition) M.sel--
    M.playing = false
    M.transition = null
    M.frame = null
    M.playback = null
    $("#splay").innerHTML = iconMarkup("play") + " Reproduzir"
  }
  async function playSteps() {
    if (M.playing) {
      stopPlayback()
      save(false)
      actions.renderPlays()
      return
    }
    if (M.transition) return
    const p = play()
    if (p.steps.length < 2) return toast("Salve pelo menos 2 passos para reproduzir")
    const playback = {}
    M.playback = playback
    M.playing = true
    layers.drawing.reset()
    layers.wardLayer.clearSelection()
    $("#splay").innerHTML = iconMarkup("stop") + " Parar"
    p.live = snapshotFrame(p.steps[0])
    M.sel = 0
    actions.renderPlays(true)
    for (let i = 1; i < p.steps.length; i++) {
      await new Promise<void>(resolve => setTimeout(resolve, 450))
      if (M.playback !== playback) return
      M.sel = i
      actions.renderPlays(true)
      await animateTo(snapshotFrame(p.steps[i]))
      if (M.playback !== playback) return
    }
    stopPlayback()
    actions.renderPlays()
  }

  document.querySelectorAll<HTMLElement>("[data-pre]").forEach(button => {
    button.onclick = () => {
      if (!canChangeFrame()) return
      layers.history.record()
      void animateTo({
        ...snapshotFrame(play().live),
        pos: asFramePositions(preset(button.dataset.pre as Parameters<typeof preset>[0])),
      })
    }
  })
  $("#sprev").onclick = () => !M.playing && !M.transition && goStep(M.sel - 1)
  $("#snext").onclick = () => !M.playing && !M.transition && goStep(M.sel + 1)
  stepSpeed.oninput = () => {
    const seconds = Number(stepSpeed.value).toLocaleString("pt-BR")
    $("#spdv").textContent = `${seconds} s`
    stepSpeed.setAttribute("aria-valuetext", `${seconds} ${stepSpeed.valueAsNumber === 1 ? "segundo" : "segundos"}`)
  }
  $("#splay").onclick = playSteps
  return { animateTo, goStep, stopPlayback }
}
