import type { mountBattlefield } from "./battlefield-layer"
import type { mountChampionLayer } from "./champion-layer"
import type { mountFaelightLayer } from "./faelight-layer"
import type { mountMapCompositions } from "./map-compositions"
import type { mountMapContextMenu } from "./map-context-menu"
import type { mountMapDrawing } from "./map-drawing"
import type { mountMapHistory } from "./map-history"
import type { mountMapVision } from "./map-tools"
import type { mountWardLayer } from "./ward-layer"
import type {
  Frame,
  FrameChanges,
  HistorySnapshot,
  MapComposition,
  MapDeps,
  MapSession,
  Play,
  TeamState,
} from "./map-session"

/** Camadas do mapa já montadas; os módulos do mapa as leem só dentro de eventos. */
export type MapLayers = {
  drawing: ReturnType<typeof mountMapDrawing>
  wardLayer: ReturnType<typeof mountWardLayer>
  battlefield: ReturnType<typeof mountBattlefield>
  champions: ReturnType<typeof mountChampionLayer>
  compositions: ReturnType<typeof mountMapCompositions>
  previewFaelights: ReturnType<typeof mountFaelightLayer>
  contextMenu: ReturnType<typeof mountMapContextMenu>
  vision: ReturnType<typeof mountMapVision>
  history: ReturnType<typeof mountMapHistory<HistorySnapshot>>
}

/** Operações que os módulos do mapa chamam uns dos outros; cada módulo registra as suas. */
export type MapActions = {
  renderPlays: (highlightStep?: boolean) => void
  renderStat: () => void
  refreshMap: () => void
  drawMapTools: (focusCursor?: boolean) => void
  commit: (changes: FrameChanges) => void
  writeFrame: (changes: FrameChanges) => void
  updateClearMap: () => void
  syncStep: () => void
  animateTo: (target: Frame) => Promise<void>
  goStep: (index: number) => Promise<void> | undefined
  stopPlayback: () => void
}

export type MapRuntime = {
  session: MapSession
  state: () => TeamState<MapComposition>
  plays: () => Play[]
  play: () => Play
  snapshotFrame: (frame: Pick<Frame, "pos"> & Partial<Frame>) => Frame
  canChangeFrame: () => boolean
  save: MapDeps<MapComposition>["save"]
  toast: MapDeps<MapComposition>["toast"]
  layers: MapLayers
  actions: MapActions
}
