import { championSight, isSide, minionSight, towers, towerSight, wavePosition, type MapPerspective, type Side, type Wave } from "../model/battlefield"
import type { MapPoint, MapStyle } from "../model/faelights"
import { occupiedBrush, terrainSightOutline } from "../model/terrain-sight"
import { readWards, wardOnMap, type WardScene } from "../model/wards"

export type SightFrame = { pos: Record<string, MapPoint>; wards?: unknown; destroyedTowers?: string[] }

export function mountMapSightLayer(host: SVGElement, getPerspective: () => MapPerspective, wardScene: () => WardScene) {
  const towerPaths: Partial<Record<MapStyle, string[]>> = {}
  const path = (point: MapPoint, style: MapStyle, units: number, source: "tower" | "wave" | "ward") =>
    `<path data-sight-source="${source}" data-sight-radius="${units}" d="${terrainSightOutline(point, style, units)}"/>`

  return function renderSight(frame: SightFrame, waves: Wave[]) {
    const perspective = getPerspective()
    const includesSide = (side: Side | undefined) => side !== undefined && (!isSide(perspective) || side === perspective)
    const scene = wardScene()
    const { style } = scene
    const champions: MapPoint[] = []
    const brushes = new Map<number, { shape: NonNullable<ReturnType<typeof occupiedBrush>>; side: Side | "both" }>()
    for (const [id, point] of Object.entries(frame.pos)) {
      const side = id.split("_", 1)[0]
      if (!isSide(side) || !includesSide(side)) continue
      champions.push(point)
      const shape = occupiedBrush(point, style)
      if (!shape) continue
      const earlier = brushes.get(shape.id)
      brushes.set(shape.id, { shape, side: earlier && earlier.side !== side ? "both" : side })
    }
    const occupied = [...brushes.values()]
    const indicators = occupied.map(({ shape, side }) =>
      `<g data-active-brush="${shape.id}" data-side="${side}" transform="${shape.transform}"><path class="map-brush-fill" d="${shape.fill}"/><path class="map-brush-outline" d="${shape.edge}"/></g>`).join("")
    if (perspective === "all") {
      host.innerHTML = indicators
      return
    }

    const championPaths = champions.map(point =>
      `<path data-champion-sight="" data-origin-x="${point[0]}" data-origin-y="${point[1]}" d="${terrainSightOutline(point, style, championSight)}"/>`)
    const occupiedSight = occupied.map(({ shape }) => `<path d="${shape.fill}" transform="${shape.transform}"/>`)
    const fixedTowers = towerPaths[style] ??= towers.map(tower => path(tower.point, style, towerSight, "tower"))
    const visibleTowers = towers.flatMap((tower, index) =>
      includesSide(tower.side) && !frame.destroyedTowers?.includes(tower.id) ? [fixedTowers[index]] : [])
    const visibleWaves = waves.filter(wave => includesSide(wave.side)).map(wave => path(wavePosition(wave, style), style, minionSight, "wave"))
    const visibleWards = readWards(frame.wards).map(ward => wardOnMap(ward, scene)).filter(ward => includesSide(ward.side))
    const wardPaths = visibleWards.map(ward => {
      const bonus = ward.faelight
      const [x, y] = ward.point
      return path(ward.point, style, ward.sight, "ward") + (bonus ?
        `<path data-faelight-sight="" d="${bonus.bonusPath}" transform="translate(${x - bonus.minimap[0]} ${y - bonus.minimap[1]})"/>` : "")
    })
    const sight = [...championPaths, ...occupiedSight, ...visibleTowers, ...visibleWaves, ...wardPaths].join("")
    host.innerHTML = `<defs><mask id="tactical-fog" x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
      <rect width="100" height="100" fill="white"/><g fill="black">${sight}</g>
      </mask></defs><rect width="100" height="100" fill="#050911" class="map-fog" mask="url(#tactical-fog)"/>${indicators}`
  }
}
