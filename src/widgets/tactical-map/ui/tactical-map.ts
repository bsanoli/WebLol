import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { iconMarkup } from "@/shared/ui/icon"
import { TOKS, blankPlay, ensureTeamPlays, initialFrame, preset } from "@/entities/tactical-play"
import { readWards, type Ward } from "../model/wards"
import { readWaves, type Wave } from "../model/battlefield"
import type { MapPoint } from "../model/faelights"
import { mountBattlefield } from "./battlefield-layer"
import { mountMapCamera } from "./map-camera"
import { mountMapCompositions } from "./map-compositions"
import { mountMapContextMenu } from "./map-context-menu"
import { mountMapCursorColor } from "./map-cursor-color"
import { hasArrowhead, mountMapDrawing, type Line } from "./map-drawing"
import { renderMapFallback } from "./map-fallback"
import {
  mapQuickTools,
  mountMapDisclosures,
  mountMapSidebar,
  mountMapTools,
  mountMapVision,
  waveToolSide,
  type Tool,
} from "./map-tools"
import { mountChampionLayer } from "./champion-layer"
import { mountChampionSize } from "./champion-size"
import { animatePieces } from "./frame-animation"
import { mountMapHistory } from "./map-history"
import { mountFaelightLayer } from "./faelight-layer"
import { mountWardLayer } from "./ward-layer"
import { mountMapPanel, mountStepPages } from "./map-panel"
import { $ } from "@/shared/lib/dom"
import { mountMapImage } from "./map-image"
import { playOptionsMarkup, stepListMarkup, stepStatus } from "./step-markup"
import {
  asFramePositions,
  clone,
  type Frame,
  type FrameChanges,
  type HistorySnapshot,
  type MapComposition,
  type MapDeps,
  type MapSession,
  type Play,
  type Step,
  type TeamState,
} from "./map-session"

export function mountTacticalMap<Comp extends MapComposition>({
  getState,
  save,
  publishTeamRoute,
  toast,
  uid,
  img,
  esc,
  compositionPreview,
  mountTeamSelect,
  mountMapEmpty,
  mountMapSwitch,
  mountToolGroup,
  mountSectionTabs,
  clearTeamControls,
}: MapDeps<Comp>) {
  const state = () => getState() as TeamState<Comp>
  const clearMap = $<HTMLButtonElement>("#map-clear-all")
  const clearWaves = $<HTMLButtonElement>("#map-clear-waves")
  const clearStrokes = $<HTMLButtonElement>("#map-clear-strokes")
  const resetMap = $<HTMLButtonElement>("#map-reset")
  const initialPositions = initialFrame().pos
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const M: MapSession = {
    tool: "move",
    sel: -1,
    playing: false,
    edit: false,
    transition: null,
    frame: null,
    playback: null,
  }
  const plays = () => ensureTeamPlays(getState(), uid) as Play[]
  const play = () => plays().find(p => p.id === getState().curPlay) as Play
  const newPlay = (name?: string) => blankPlay(uid, name) as unknown as Play
  const snapshotFrame = ({ pos, lines, wards, waves, destroyedTowers }: Pick<Frame, "pos"> & Partial<Frame>): Frame =>
    clone({
      pos,
      lines: lines ?? [],
      wards: readWards(wards),
      waves: readWaves(waves),
      destroyedTowers: Array.isArray(destroyedTowers) ? destroyedTowers : [],
    })
  const canChangeFrame = () => !M.playing && !M.transition
  const { getPerspective, resetPerspective } = mountMapVision(() => {
    $("#map-preview-notice").textContent =
      getPerspective() === "both"
        ? "Prévia tática aproximada da visão das duas equipes."
        : "Prévia tática aproximada da visão da equipe."
    renderStat()
    battlefield.renderTowers()
    battlefield.renderSight(visibleFrame())
  })
  const canEdit = canChangeFrame
  const visibleFrame = () => M.frame ?? play().live

  renderMapFallback(document.querySelector<SVGSVGElement>("#schem")!)
  const map = $("#map")
  mountChampionSize($("#map-champion-size"), map)
  const viewport = $("#map-viewport")
  mountMapCursorColor($("#mapw"))
  const camera = mountMapCamera(
    viewport,
    map,
    () => drawing.render(),
    () => (canChangeFrame() ? M.tool : "hand"),
    () => {
      wardLayer.closeEditor()
      contextMenu.close()
    },
  )
  const pt = camera.point
  const champions = mountChampionLayer({
    map,
    read: () => visibleFrame().pos,
    write: pos => writeFrame({ pos }),
    preview: pos => battlefield.renderSight({ ...visibleFrame(), pos }),
    canMove: () => canChangeFrame() && M.tool === "move",
    point: pt,
    portrait: img,
    champion: (side, role) =>
      state().comps.find(comp => comp.id === (side === "b" ? play().cb : play().cr))?.lanes?.[role]?.[0],
  })
  const renderTokens = champions.render,
    placeTokens = champions.place
  const compositions = mountMapCompositions({
    read: () =>
      state().comps.map(comp => ({
        id: comp.id,
        name: comp.name,
        champions: compositionPreview(comp).filter((name): name is string => Boolean(name)),
      })),
    selected: side => (side === "b" ? play().cb : play().cr),
    choose: (side, id) => {
      if (!canEdit()) return
      play()[side === "b" ? "cb" : "cr"] = id
      save(false)
      renderTokens()
    },
    portrait: img,
  })
  const drawing = mountMapDrawing({
    map,
    read: () => visibleFrame().lines ?? [],
    write: lines => commit({ lines }),
    canEdit,
    getTool: () => M.tool,
    point: pt,
    scale: camera.scale,
    update: updateClearMap,
  })
  const wardLayer = mountWardLayer({
    read: () => visibleFrame().wards,
    write: wards => commit({ wards }),
    getTool: () => M.tool,
    isPlaying: () => !canEdit(),
    pointFromEvent: pt,
    mountTeamSelect,
    onPlaced,
  })
  const battlefield = mountBattlefield({
    read: visibleFrame,
    write: commit,
    canEdit,
    getTool: () => M.tool,
    getPerspective,
    point: pt,
    wardScene: wardLayer.scene,
    uid,
    onPlaced,
  })
  const historyActions = [
    { label: "Desfazer", icon: "undo", button: $<HTMLButtonElement>("#undo"), startsHistory: true },
    { label: "Refazer", icon: "redo", button: $<HTMLButtonElement>("#redo") },
  ]
  const contextMenu = mountMapContextMenu(
    map,
    viewport,
    event => {
      if (!canEdit()) return
      return (
        wardLayer.contextAction(event) ??
        battlefield.contextAction(event, "wave") ??
        battlefield.contextAction(event, "tower") ??
        (event instanceof MouseEvent ? drawing.contextAction(event) : undefined)
      )
    },
    () =>
      canEdit()
        ? [
            ...mapQuickTools.map(tool => ({
              label: tool.label,
              icon: tool.icon,
              selected: M.tool === tool.value,
              run: () => {
                if (M.tool !== tool.value) selectTool(tool.value, false)
                else showToolOptions()
              },
            })),
            ...historyActions.map(({ button, ...action }) => ({
              ...action,
              disabled: button.disabled,
              run: () => button.click(),
            })),
          ]
        : [],
  )
  const previewFaelights = mountFaelightLayer({
    getState,
    save: () => save(false),
    mountMapSwitch,
    onAvailabilityChange: refreshMap,
  })
  const zoomFields = ["#map-stroke-width", "#map-stroke-style"]
  zoomFields.forEach(selector => mountTeamSelect($<HTMLSelectElement>(selector)))
  function renderTowerSwitch() {
    mountMapSwitch($("#map-tower-range-control"), "Alcance das torres", battlefield.showTowers, checked => {
      battlefield.toggleTowers(checked)
      renderTowerSwitch()
    })
  }
  renderTowerSwitch()
  mountMapDisclosures()
  mountMapSidebar($("#v-map"))
  mountMapPanel(mountSectionTabs)
  const syncStepPages = mountStepPages()

  const { render: renderToolControls, showToolOptions } = mountMapTools({
    map,
    canEdit,
    canMove: canChangeFrame,
    currentTool: () => M.tool,
    chooseColor: drawing.setColor,
    mountToolGroup,
    chooseTool: tool => selectTool(tool, true),
  })
  function selectTool(tool: Tool, focusCursor: boolean) {
    M.tool = tool
    drawing.reset()
    wardLayer.clearSelection()
    contextMenu.close()
    drawMapTools(focusCursor)
    refreshMap()
    drawing.render()
  }
  function onPlaced() {
    selectTool("move", false)
    viewport.focus({ preventScroll: true })
  }
  function drawMapTools(focusCursor = false) {
    const tool = renderToolControls()
    champions.setInteractive(tool === "move")
    wardLayer.setTool(tool, focusCursor)
    previewFaelights.preview(tool === "ward")
    battlefield.setWavePreview(Boolean(waveToolSide(tool)), focusCursor)
  }
  function refreshMap() {
    contextMenu.close()
    placeTokens()
    wardLayer.render()
    battlefield.renderTowers()
    battlefield.render()
    updateClearMap()
  }
  function commit(changes: FrameChanges) {
    if (canEdit()) writeFrame(changes)
  }
  function writeFrame(changes: FrameChanges) {
    if (!canChangeFrame()) return
    history.record()
    Object.assign(play().live, changes)
    save(false)
    syncStep()
    refreshMap()
    drawing.render()
  }
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
  const clearArrows = $<HTMLButtonElement>("#clr")
  function updateClearMap() {
    const { lines, wards, waves } = play().live
    const hasWaves = readWaves(waves).length > 0
    const hasAnnotations = lines?.length || readWards(wards).length || hasWaves
    clearArrows.disabled = !canEdit() || !lines?.some(hasArrowhead)
    clearStrokes.disabled = !canEdit() || !lines?.some(line => !hasArrowhead(line))
    clearWaves.disabled = !canEdit() || !hasWaves
    clearMap.disabled = !canEdit() || !hasAnnotations
    resetMap.disabled = !canChangeFrame() || (getPerspective() === "all" && !frameHasChanges())
  }
  clearArrows.onclick = () => {
    if (!clearArrows.disabled) commit({ lines: play().live.lines.filter(line => !hasArrowhead(line)) })
  }
  clearStrokes.onclick = () => {
    if (!clearStrokes.disabled) commit({ lines: play().live.lines.filter(hasArrowhead) })
  }
  clearWaves.onclick = () => {
    if (!clearWaves.disabled) commit({ waves: [] })
  }
  clearMap.onclick = () => {
    if (!clearMap.disabled) {
      drawing.reset()
      wardLayer.clearSelection()
      commit({ lines: [], wards: [], waves: [] })
    }
  }
  resetMap.onclick = () => {
    if (resetMap.disabled) return
    if (frameHasChanges()) {
      drawing.reset()
      wardLayer.clearSelection()
      writeFrame(initialFrame())
    }
    resetPerspective()
  }
  document.querySelectorAll<HTMLElement>("[data-pre]").forEach(
    b =>
      (b.onclick = () => {
        if (!canEdit()) return
        history.record()
        void animateTo({
          ...snapshotFrame(play().live),
          pos: asFramePositions(preset(b.dataset.pre as Parameters<typeof preset>[0])),
        })
      }),
  )
  const history = mountMapHistory<HistorySnapshot>({
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
      drawing.reset()
      wardLayer.clearSelection()
      save(false)
      renderPlays()
      return previous
    },
  })

  // jogadas
  function renderPlays(highlightStep = false) {
    const p = play()
    $<HTMLSelectElement>("#psel").innerHTML = playOptionsMarkup(plays(), p.id, esc)
    mountTeamSelect($<HTMLSelectElement>("#psel"))
    compositions.render()
    const steps = $("#steps")
    clearTeamControls(steps)
    steps.innerHTML = stepListMarkup(p.steps, M.sel, highlightStep, canEdit(), esc)
    if (!p.steps.length && steps.firstElementChild) mountMapEmpty(steps.firstElementChild)
    syncStepPages(p.steps.length, M.sel)
    renderStat()
    drawMapTools()
    renderTokens()
    previewFaelights.refresh()
    refreshMap()
    drawing.render()
  }
  $("#psel").onchange = () => {
    stopPlayback()
    state().curPlay = $<HTMLSelectElement>("#psel").value
    M.sel = -1
    wardLayer.clearSelection()
    drawing.reset()
    save(false)
    renderPlays()
    publishTeamRoute("map")
  }
  $("#pnew").onclick = async () => {
    const n = await askName("Nova jogada", "Jogada " + (plays().length + 1))
    if (n === undefined) return
    const p = newPlay(n || undefined)
    state().plays.push(p)
    state().curPlay = p.id
    M.sel = -1
    save()
    renderPlays()
    publishTeamRoute("map")
  }
  $("#pren").onclick = async () => {
    const p = play(),
      n = await askName("Renomear jogada", p.name)
    if (!n) return
    p.name = n
    save()
    renderPlays()
  }
  $("#pdel").onclick = async () => {
    const p = play()
    if (!(await confirmAction(`Excluir a jogada "${p.name}"?`, "Excluir jogada"))) return
    state().plays = state().plays.filter(x => x.id !== p.id)
    plays()
    M.sel = -1
    save()
    renderPlays()
    publishTeamRoute("map")
  }

  // passos: o passo selecionado salva sozinho tudo o que muda no mapa
  function syncStep() {
    const p = play()
    if (!M.edit || !canChangeFrame() || M.sel < 0 || !p.steps[M.sel]) return
    Object.assign(p.steps[M.sel], snapshotFrame(p.live))
    save(false)
    flashStep()
  }
  let tFl: ReturnType<typeof setTimeout> | undefined
  function flashStep() {
    const el = document.querySelector<HTMLElement>("#sstat .ok")
    if (!el) return
    el.style.opacity = "1"
    clearTimeout(tFl)
    tFl = setTimeout(() => (el.style.opacity = "0"), 900)
  }
  function renderStat() {
    updateClearMap()
    history.update()
    const editingAllowed = canEdit()
    $<HTMLButtonElement>("#splay").disabled = Boolean(M.transition && !M.playing)
    const preview = getPerspective() !== "all"
    $("#map-preview-notice").hidden = !preview
    document.querySelectorAll<HTMLButtonElement>("#sadd,#sedit,[data-pre],#pnew,#pren,#pdel").forEach(button => {
      button.disabled = !editingAllowed
    })
    compositions.setDisabled(!editingAllowed)
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
  $("#sadd").onclick = () => {
    if (!canEdit()) return
    const p = play(),
      at = M.sel >= 0 ? M.sel + 1 : p.steps.length
    p.steps.splice(at, 0, { label: "Passo " + (p.steps.length + 1), ...snapshotFrame(p.live) })
    M.sel = at
    save()
    renderPlays()
    toast(`Passo ${at + 1} salvo com a posição atual`)
  }
  $("#sedit").onclick = () => {
    if (!canEdit()) return
    M.edit = !M.edit
    renderStat()
    if (M.edit && M.sel < 0) toast("Agora clique no passo que quer editar")
  }
  $("#steps").addEventListener("input", e => {
    const field = e.target as HTMLInputElement
    const i = field.dataset.lab
    if (i == null || !canEdit()) return
    play().steps[+i].label = field.value
    save(false)
  })
  $("#steps").onclick = async e => {
    const target = e.target as Element
    const d = target.closest<HTMLElement>("[data-sdel]")
    const p = play()
    if (d) {
      if (!canEdit()) return
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
    void goStep(index)
    if (active) {
      const replacement = document.querySelector<HTMLInputElement>(
        caret ? `[data-lab="${index}"]` : `[data-step-select="${index}"]`,
      )
      replacement?.focus({ preventScroll: true })
      if (caret) replacement?.setSelectionRange(...caret)
    }
  }
  function goStep(i: number) {
    const p = play()
    if (i < 0 || i >= p.steps.length) return
    M.sel = i
    wardLayer.clearSelection()
    drawing.reset()
    renderPlays(true)
    return animateTo(snapshotFrame(p.steps[i]))
  }
  $("#sprev").onclick = () => !M.playing && !M.transition && goStep(M.sel - 1)
  $("#snext").onclick = () => !M.playing && !M.transition && goStep(M.sel + 1)
  const stepSpeed = $<HTMLInputElement>("#spd")
  stepSpeed.oninput = () => {
    const seconds = Number(stepSpeed.value).toLocaleString("pt-BR")
    $("#spdv").textContent = `${seconds} s`
    stepSpeed.setAttribute("aria-valuetext", `${seconds} ${stepSpeed.valueAsNumber === 1 ? "segundo" : "segundos"}`)
  }
  function animateTo(target: Frame): Promise<void> {
    const p = play(),
      from = snapshotFrame(p.live)
    const duration = Number(stepSpeed.value) * 1000
    const transition = {}
    M.transition = transition
    renderStat()
    drawMapTools()
    M.frame = { ...target, pos: from.pos, waves: from.waves }
    drawing.render()
    wardLayer.render()
    battlefield.renderTowers()

    const finish = () => {
      M.transition = null
      M.frame = null
      p.live = target
      save(false)
      if (!M.playing) {
        renderStat()
        drawMapTools()
        refreshMap()
        drawing.render()
      } else refreshMap()
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
        placeTokens(pieces.pos)
        battlefield.render()
      },
    ).then(completed => {
      if (completed) finish()
    })
  }
  function stopPlayback() {
    if (M.playing && M.transition) M.sel--
    M.playing = false
    M.transition = null
    M.frame = null
    M.playback = null
    $("#splay").innerHTML = iconMarkup("play") + " Reproduzir"
  }
  $("#splay").onclick = async () => {
    if (M.playing) {
      stopPlayback()
      save(false)
      renderPlays()
      return
    }
    if (M.transition) return
    const p = play()
    if (p.steps.length < 2) return toast("Salve pelo menos 2 passos para reproduzir")
    const playback = {}
    M.playback = playback
    M.playing = true
    drawing.reset()
    wardLayer.clearSelection()
    $("#splay").innerHTML = iconMarkup("stop") + " Parar"
    p.live = snapshotFrame(p.steps[0])
    M.sel = 0
    renderPlays(true)
    for (let i = 1; i < p.steps.length; i++) {
      await new Promise<void>(resolve => setTimeout(resolve, 450))
      if (M.playback !== playback) return
      M.sel = i
      renderPlays(true)
      await animateTo(snapshotFrame(p.steps[i]))
      if (M.playback !== playback) return
    }
    stopPlayback()
    renderPlays()
  }

  for (const image of $("#v-map").querySelectorAll<HTMLImageElement>("img[data-src]")) {
    image.src = image.dataset.src ?? ""
    delete image.dataset.src
  }
  mountMapImage({
    getState: state,
    save,
    mountMapSwitch,
    onChange: () => {
      wardLayer.render()
      battlefield.render()
      battlefield.renderTowers()
    },
  })

  return {
    renderPlays,
    selectPlay(id: string) {
      if (state().curPlay === id) return
      stopPlayback()
      M.sel = -1
      drawing.reset()
      wardLayer.clearSelection()
      state().curPlay = id
    },
  }
}
