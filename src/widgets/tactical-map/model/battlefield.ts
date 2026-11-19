import type { MapPoint, MapStyle } from "./faelights"

export type Side = "b" | "r"
export type MapPerspective = Side | "both" | "all"
export type Lane = keyof typeof routes
export type Wave = { id: string; side: Side; lane: Lane; progress: number }
export const waveKey = ({ lane, side }: Pick<Wave, "lane" | "side">) => `${lane}:${side}` as const

export const sideLabel = { b: "Azul", r: "Vermelho" }
export const laneLabel = { top: "Topo", mid: "Meio", adc: "Inferior" }
export const isSide = (value: unknown): value is Side => value === "b" || value === "r"
export const clamp = (value: number, max = 100) => Math.min(max, Math.max(0, value))
// The authored minimap spans 14,850 units; the realistic image is calibrated against tower positions.
export const mapRadius = (units: number, style: MapStyle) => units / (style === "minimap" ? 148.5 : 150)

const routes = {
  top: [[11, 87], [9, 73], [10, 55], [8, 35], [9, 21], [12, 12], [19, 8], [30, 8], [49, 8.5], [70, 8.5], [88, 11]],
  mid: [[11, 87], [24, 76], [35, 66], [49, 50], [65, 34], [77, 24], [88, 11]],
  adc: [[11, 87], [26, 91], [47, 91], [69, 92], [82, 91], [90, 87], [93, 79], [93, 64], [91, 45], [92, 28], [88, 11]],
} satisfies Record<string, MapPoint[]>
export const isLane = (value: unknown): value is Lane => typeof value === "string" && Object.hasOwn(routes, value)

const realisticRoutes: Record<Lane, MapPoint[]> = {
  top: [...routes.top.slice(0, 4), [11, 21], [15, 14], [20, 10], ...routes.top.slice(7)],
  mid: routes.mid,
  adc: [...routes.adc.slice(0, 4), [82, 89], [85.5, 83.5], [91, 78], ...routes.adc.slice(7)],
}

// Keep the original segment lengths as the progress scale for saved waves.
const routeMetrics = (lane: Lane, style: MapStyle) => {
  const points = style === "realistic" ? realisticRoutes[lane] : routes[lane]
  let length = 0
  const segments = points.slice(1).map(([x, y], index) => {
    const [ax, ay] = points[index]
    const dx = x - ax, dy = y - ay
    const [originalX, originalY] = routes[lane][index + 1]
    const [originalStartX, originalStartY] = routes[lane][index]
    const size = Math.hypot(originalX - originalStartX, originalY - originalStartY)
    const start = length
    length += size
    return { ax, ay, dx, dy, size, start }
  })
  return { segments, length }
}

export function wavePosition({ lane, progress }: Pick<Wave, "lane" | "progress">, style: MapStyle): MapPoint {
  const { segments, length } = routeMetrics(lane, style)
  const distance = clamp(progress, 1) * length
  const segment = segments.find(part => distance <= part.start + part.size) ?? segments[segments.length - 1]
  const t = (distance - segment.start) / segment.size
  return [segment.ax + segment.dx * t, segment.ay + segment.dy * t]
}

function projectOnLane(lane: Lane, [x, y]: MapPoint, style: MapStyle) {
  const { segments, length } = routeMetrics(lane, style)
  let bestDistance = Infinity
  let progress = 0
  for (const { ax, ay, dx, dy, size, start } of segments) {
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 1)
    const distance = Math.hypot(x - ax - t * dx, y - ay - t * dy)
    if (distance < bestDistance) {
      bestDistance = distance
      progress = (start + size * t) / length
    }
  }
  return { lane, progress, distance: bestDistance }
}

export function progressOnLane(lane: Lane, point: MapPoint, style: MapStyle) {
  return projectOnLane(lane, point, style).progress
}

export function nearestLane(point: MapPoint, style: MapStyle) {
  const middle = projectOnLane("mid", point, style)
  const top = projectOnLane("top", point, style)
  const bottom = projectOnLane("adc", point, style)
  const nearest = top.distance < middle.distance ? top : middle
  return bottom.distance < nearest.distance ? bottom : nearest
}

export function readWaves(value: unknown): Wave[] {
  if (!Array.isArray(value)) return []
  const slots = new Map<ReturnType<typeof waveKey>, Wave>()
  for (const wave of value) {
    if (typeof wave?.id === "string" && isSide(wave.side) && isLane(wave.lane) &&
      Number.isFinite(wave.progress) && wave.progress >= 0 && wave.progress <= 1) slots.set(waveKey(wave), wave)
  }
  return [...slots.values()]
}

const blueTowers: MapPoint[] = [[7.5, 29.8], [11, 54.6], [8.7, 70.8], [39.9, 56.9], [34.4, 67.3], [25.2, 74.2], [71, 92.5], [47, 89.4], [29.5, 90.6], [12.4, 84.3], [15.4, 87.5]]
const redTowers: MapPoint[] = [[29.6, 6.9], [53.8, 10], [70.8, 8.3], [60.5, 42.5], [66, 32], [75, 24.9], [93.3, 69.2], [89.7, 44.4], [91.7, 28], [84.9, 12.1], [87.8, 15.2]]
const towerNames = ["externa do topo", "interna do topo", "do inibidor do topo", "externa do meio", "interna do meio", "do inibidor do meio", "externa da rota inferior", "interna da rota inferior", "do inibidor da rota inferior", "do Nexus (primeira)", "do Nexus (segunda)"]

export const towers = ([["b", blueTowers], ["r", redTowers]] as const).flatMap(([side, points]) =>
  points.map((point, index) => ({ id: side + index, side, point, name: `Torre ${towerNames[index]} — ${sideLabel[side]}` })))
export const towerAttack = 750
export const towerSight = 1350
export const minionSight = 1200
export const championSight = 1350
