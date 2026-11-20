import type { MapPoint } from "../model/faelights"
import type { Wave } from "../model/battlefield"
import type { Ward } from "../model/wards"
import type { mountFaelightLayer } from "./faelight-layer"
import type { Line } from "./map-drawing"
import type { mountMapPanel } from "./map-panel"
import type { mountMapTools, Tool } from "./map-tools"

/** Um quadro do mapa: posições, desenhos, wards, waves e torres destruídas. */
export type Frame = {
  pos: Record<string, MapPoint>
  lines: Line[]
  wards: Ward[]
  waves: Wave[]
  destroyedTowers: string[]
}
export type FrameChanges = { [Key in keyof Frame]?: unknown }
export type Step = Frame & { label: string }
export type Play = { id: string; name: string; live: Frame; steps: Step[]; cb: string; cr: string }
export type MapComposition = { id: string; name: string; lanes?: Record<string, string[] | undefined> }
export type TeamState<Comp extends MapComposition> = {
  curPlay?: string
  plays: Play[]
  comps: Comp[]
  useImg?: boolean
  showFaelights?: boolean
  additionalFaelights?: boolean
}
export type MapDeps<Comp extends MapComposition> = {
  getState: () => Omit<TeamState<Comp>, "plays"> & { plays?: { id: string }[] }
  save: (record?: boolean) => void
  publishTeamRoute: (view: "map") => void
  toast: (message: string, undo?: () => void) => void
  uid: () => string
  img: (name: string) => string
  esc: (value: unknown) => string
  compositionPreview: (comp: Comp) => (string | undefined)[]
  mountTeamSelect: (field: HTMLSelectElement) => void
  mountMapEmpty: (host: Element) => void
  mountMapSwitch: Parameters<typeof mountFaelightLayer>[0]["mountMapSwitch"]
  mountToolGroup: Parameters<typeof mountMapTools>[0]["mountToolGroup"]
  mountSectionTabs: Parameters<typeof mountMapPanel>[0]
  clearTeamControls: (region: Element) => void
}
export type HistorySnapshot = { pid: string | undefined; live: Frame; step: Step | undefined }
export type MapSession = {
  tool: Tool
  sel: number
  playing: boolean
  edit: boolean
  transition: object | null
  frame: Frame | null
  playback: object | null
}
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
// `preset` e `blankPlay` ainda tipam as posições como number[]; o mapa as lê como pares [x, y].
export const asFramePositions = (pos: Record<string, number[]>) => pos as unknown as Frame["pos"]
