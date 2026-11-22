import { $ } from "@/shared/lib/dom"
import { confirmAction } from "@/shared/ui/dialog-controls"
import { iconMarkup } from "@/shared/ui/icon"
import { mountStepPages } from "./map-panel"
import type { MapRuntime } from "./map-runtime"
import type { MapDeps } from "./map-session"
import { playOptionsMarkup, stepListMarkup, stepStatus } from "./step-markup"

type StepPanelDeps = Pick<MapDeps<never>, "esc" | "mountTeamSelect" | "mountMapEmpty" | "clearTeamControls">

/** Lista de jogadas e passos: renderização, status, seleção, edição e exclusão de passos. */
export function mountMapStepPanel(
  { session: M, plays, play, snapshotFrame, canChangeFrame, save, toast, layers, actions }: MapRuntime,
  { esc, mountTeamSelect, mountMapEmpty, clearTeamControls }: StepPanelDeps,
) {
  const syncStepPages = mountStepPages()
  let flashTimer: ReturnType<typeof setTimeout> | undefined

  // o passo selecionado salva sozinho tudo o que muda no mapa
  function syncStep() {
    const p = play()
    if (!M.edit || !canChangeFrame() || M.sel < 0 || !p.steps[M.sel]) return
    Object.assign(p.steps[M.sel], snapshotFrame(p.live))
    save(false)
    flashStep()
  }
  function flashStep() {
    const el = document.querySelector<HTMLElement>("#sstat .ok")
    if (!el) return
    el.style.opacity = "1"
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => (el.style.opacity = "0"), 900)
  }
  function renderStat() {
    actions.updateClearMap()
    layers.history.update()
    const editingAllowed = canChangeFrame()
    $<HTMLButtonElement>("#splay").disabled = Boolean(M.transition && !M.playing)
    const isPreview = layers.vision.getPerspective() !== "all"
    $("#map-preview-notice").hidden = !isPreview
    document.querySelectorAll<HTMLButtonElement>("#sadd,#sedit,[data-pre],#pnew,#pren,#pdel").forEach(button => {
      button.disabled = !editingAllowed
    })
    layers.compositions.setDisabled(!editingAllowed)
    $("#steps")
      .querySelectorAll<HTMLInputElement>("[data-lab]")
      .forEach(field => {
        field.readOnly = !editingAllowed
      })
    $("#steps")
      .querySelectorAll<HTMLButtonElement>("[data-sdel]")
      .forEach(button => {
        button.disabled = !editingAllowed
      })
    const { steps } = play()
    const editingStep = M.edit && steps[M.sel]
    const button = $("#sedit")
    const status = $("#sstat")
    button.classList.toggle("on", !!M.edit)
    button.setAttribute("aria-pressed", String(M.edit))
    status.classList.toggle("ed", !!editingStep)

    const { icon, message } = stepStatus({ steps, sel: M.sel, playing: M.playing, edit: M.edit })
    status.innerHTML = `${icon ? iconMarkup(icon) : ""}<span>${message}</span>`
    status.hidden = !message
  }
  function renderPlays(shouldHighlightStep = false) {
    const p = play()
    $<HTMLSelectElement>("#psel").innerHTML = playOptionsMarkup(plays(), p.id, esc)
    mountTeamSelect($<HTMLSelectElement>("#psel"))
    layers.compositions.render()
    const steps = $("#steps")
    clearTeamControls(steps)
    steps.innerHTML = stepListMarkup(p.steps, M.sel, shouldHighlightStep, canChangeFrame(), esc)
    if (!p.steps.length && steps.firstElementChild) mountMapEmpty(steps.firstElementChild)
    syncStepPages(p.steps.length, M.sel)
    renderStat()
    actions.drawMapTools()
    layers.champions.render()
    layers.previewFaelights.refresh()
    actions.refreshMap()
    layers.drawing.render()
  }

  $("#sadd").onclick = () => {
    if (!canChangeFrame()) return
    const p = play(),
      at = M.sel >= 0 ? M.sel + 1 : p.steps.length
    p.steps.splice(at, 0, { label: `Passo ${p.steps.length + 1}`, ...snapshotFrame(p.live) })
    M.sel = at
    save()
    renderPlays()
    toast(`Passo ${at + 1} salvo com a posição atual`)
  }
  $("#sedit").onclick = () => {
    if (!canChangeFrame()) return
    M.edit = !M.edit
    renderStat()
    if (M.edit && M.sel < 0) toast("Agora clique no passo que quer editar")
  }
  $("#steps").addEventListener("input", e => {
    const field = e.target as HTMLInputElement
    const i = field.dataset.lab
    if (i == null || !canChangeFrame()) return
    play().steps[+i].label = field.value
    save(false)
  })
  $("#steps").onclick = async e => {
    const target = e.target as Element
    const d = target.closest<HTMLElement>("[data-sdel]")
    const p = play()
    if (d) {
      if (!canChangeFrame()) return
      const i = Number(d.dataset.sdel)
      if (!(await confirmAction(`Apagar o passo ${i + 1}?`, "Apagar passo"))) return
      p.steps.splice(i, 1)
      if (M.sel === i) M.sel = -1
      else if (M.sel > i) M.sel--
      save()
      renderPlays()
      return
    }
    const li = target.closest<HTMLElement>("li[data-i]")
    if (!li || M.playing || M.transition) return
    const index = Number(li.dataset.i)
    if (index === M.sel) return
    const active = target.closest<HTMLElement>("[data-step-select], [data-lab]")
    const caret =
      active instanceof HTMLInputElement && active.matches("[data-lab]")
        ? ([active.selectionStart, active.selectionEnd] as const)
        : null
    void actions.goStep(index)
    if (active) {
      const replacement = document.querySelector<HTMLInputElement>(
        caret ? `[data-lab="${index}"]` : `[data-step-select="${index}"]`,
      )
      replacement?.focus({ preventScroll: true })
      if (caret) replacement?.setSelectionRange(...caret)
    }
  }
  return { renderPlays, renderStat, syncStep }
}
