import { ensureTeamPlays } from "@/entities/tactical-play"
import { $ } from "@/shared/lib/dom"
import { readWaves } from "../model/battlefield"
import { readWards } from "../model/wards"
import { mountBattlefield } from "./battlefield-layer"
import { mountChampionLayer } from "./champion-layer"
import { mountChampionSize } from "./champion-size"
import { mountFaelightLayer } from "./faelight-layer"
import { mountMapCamera } from "./map-camera"
import { mountMapClearControls } from "./map-clear-controls"
import { mountMapCompositions } from "./map-compositions"
import { mountMapCursorColor } from "./map-cursor-color"
import { renderMapFallback } from "./map-fallback"
import { mountMapFrameHistory } from "./map-frame-history"
import { mountMapDrawing } from "./map-drawing"
import { mountMapImage } from "./map-image"
import { mountMapPanel } from "./map-panel"
import { mountMapPlayControls } from "./map-play-controls"
import { mountMapPlayback } from "./map-playback"
import type { MapActions, MapLayers, MapRuntime } from "./map-runtime"
import {
  clone,
  type Frame,
  type FrameChanges,
  type MapComposition,
  type MapDeps,
  type MapSession,
  type Play,
  type TeamState,
} from "./map-session"
import { mountMapStepPanel } from "./map-step-panel"
import { mountMapToolContextMenu } from "./map-tool-context-menu"
import {
  mountMapDisclosures,
  mountMapSidebar,
  mountMapTools,
  mountMapVision,
  waveToolSide,
  type Tool,
} from "./map-tools"
import { mountWardLayer } from "./ward-layer"

export function mountTacticalMap<Comp extends MapComposition>(deps: MapDeps<Comp>) {
  const {
    getState,
    save,
    toast,
    uid,
    img,
    compositionPreview,
    mountTeamSelect,
    mountMapSwitch,
    mountToolGroup,
    mountSectionTabs,
  } = deps
  const state = () => getState() as TeamState<Comp>
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
  const snapshotFrame = ({ pos, lines, wards, waves, destroyedTowers }: Pick<Frame, "pos"> & Partial<Frame>): Frame =>
    clone({
      pos,
      lines: lines ?? [],
      wards: readWards(wards),
      waves: readWaves(waves),
      destroyedTowers: Array.isArray(destroyedTowers) ? destroyedTowers : [],
    })
  const canChangeFrame = () => !M.playing && !M.transition
  const visibleFrame = () => M.frame ?? play().live
  // As camadas e as ações são preenchidas durante a montagem; só são lidas dentro de eventos.
  const layers = {} as MapLayers
  const actions = {} as MapActions
  const runtime: MapRuntime = {
    session: M,
    state: () => state(),
    plays,
    play,
    snapshotFrame,
    canChangeFrame,
    save,
    toast,
    layers,
    actions,
  }

  const vision = mountMapVision(() => {
    $("#map-preview-notice").textContent =
      vision.getPerspective() === "both"
        ? "Prévia tática aproximada da visão das duas equipes."
        : "Prévia tática aproximada da visão da equipe."
    actions.renderStat()
    battlefield.renderTowers()
    battlefield.renderSight(visibleFrame())
  })

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
      layers.contextMenu.close()
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
  const compositions = mountMapCompositions({
    read: () =>
      state().comps.map(comp => ({
        id: comp.id,
        name: comp.name,
        champions: compositionPreview(comp).filter((name): name is string => Boolean(name)),
      })),
    selected: side => (side === "b" ? play().cb : play().cr),
    choose: (side, id) => {
      if (!canChangeFrame()) return
      play()[side === "b" ? "cb" : "cr"] = id
      save(false)
      champions.render()
    },
    portrait: img,
  })
  const drawing = mountMapDrawing({
    map,
    read: () => visibleFrame().lines ?? [],
    write: lines => commit({ lines }),
    canEdit: canChangeFrame,
    getTool: () => M.tool,
    point: pt,
    scale: camera.scale,
    update: () => actions.updateClearMap(),
  })
  const wardLayer = mountWardLayer({
    read: () => visibleFrame().wards,
    write: wards => commit({ wards }),
    getTool: () => M.tool,
    isPlaying: () => !canChangeFrame(),
    pointFromEvent: pt,
    mountTeamSelect,
    onPlaced,
  })
  const battlefield = mountBattlefield({
    read: visibleFrame,
    write: commit,
    canEdit: canChangeFrame,
    getTool: () => M.tool,
    getPerspective: vision.getPerspective,
    point: pt,
    wardScene: wardLayer.scene,
    uid,
    onPlaced,
  })
  Object.assign(layers, { vision, champions, compositions, drawing, wardLayer, battlefield })
  layers.contextMenu = mountMapToolContextMenu(runtime, {
    map,
    viewport,
    selectTool,
    showToolOptions: () => showToolOptions(),
  })
  layers.previewFaelights = mountFaelightLayer({
    getState,
    save: () => save(false),
    mountMapSwitch,
    onAvailabilityChange: refreshMap,
  })
  for (const selector of ["#map-stroke-width", "#map-stroke-style"]) mountTeamSelect($<HTMLSelectElement>(selector))
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

  const { render: renderToolControls, showToolOptions } = mountMapTools({
    map,
    canEdit: canChangeFrame,
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
    layers.contextMenu.close()
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
    layers.previewFaelights.preview(tool === "ward")
    battlefield.setWavePreview(Boolean(waveToolSide(tool)), focusCursor)
  }
  function refreshMap() {
    layers.contextMenu.close()
    champions.place()
    wardLayer.render()
    battlefield.renderTowers()
    battlefield.render()
    actions.updateClearMap()
  }
  function commit(changes: FrameChanges) {
    if (canChangeFrame()) writeFrame(changes)
  }
  function writeFrame(changes: FrameChanges) {
    if (!canChangeFrame()) return
    layers.history.record()
    Object.assign(play().live, changes)
    save(false)
    actions.syncStep()
    refreshMap()
    drawing.render()
  }

  Object.assign(actions, { refreshMap, drawMapTools, commit, writeFrame })
  layers.history = mountMapFrameHistory(runtime)
  Object.assign(actions, mountMapClearControls(runtime))
  Object.assign(actions, mountMapStepPanel(runtime, deps))
  Object.assign(actions, mountMapPlayback(runtime))
  mountMapPlayControls(runtime, deps)

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
    renderPlays: actions.renderPlays,
    selectPlay(id: string) {
      if (state().curPlay === id) return
      actions.stopPlayback()
      M.sel = -1
      drawing.reset()
      wardLayer.clearSelection()
      state().curPlay = id
    },
  }
}
