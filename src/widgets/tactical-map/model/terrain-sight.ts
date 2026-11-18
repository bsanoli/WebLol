import { mapRadius } from "./battlefield"
import schematicGrid from "./data/summoners-rift-sight.json"
import realisticGrid from "./data/summoners-rift-realistic-sight.json"
import type { MapPoint, MapStyle } from "./faelights"

const wall = 1
const brush = 2
const rays = Array.from({ length: 256 }, (_, index) => {
  const angle = index * 2 * Math.PI / 256
  return [Math.cos(angle), Math.sin(angle)] as const
})

function decodeTerrain(style: MapStyle) {
  // The realistic artwork shows the _3 layout, including the isolated river brush.
  const grid = style === "realistic" ? realisticGrid : schematicGrid
  const { width, height, cellSize } = grid
  const scale = mapRadius(cellSize, style)
  const offsetX = (100 - width * scale) / 2
  const offsetY = (100 - height * scale) / 2
  // The version 7 Map11 navgrid stores row 0 at minimum world Z.
  // The packaged grid is north-up, with four cells per byte: open, wall, brush.
  // Wall flag 0x2 is opaque unless 0x40 is also set; grass uses 0x1.
  const packed = atob(grid.cells)
  const terrain = Uint8Array.from({ length: width * height }, (_, cell) =>
    packed.charCodeAt(cell >> 2) >> ((cell & 3) * 2) & 3)
  const brushGroup = new Uint16Array(terrain.length)
  const groups: number[][] = [[]]
  for (let cell = 0; cell < terrain.length; cell++) {
    if (terrain[cell] !== brush || brushGroup[cell]) continue
    const group = groups.length
    const members = [cell]
    groups.push(members)
    brushGroup[cell] = group
    const pending = [cell]
    while (pending.length) {
      const current = pending.pop()!
      const col = current % width
      const adjacent = [col > 0 ? current - 1 : -1, col < width - 1 ? current + 1 : -1, current - width, current + width]
      for (const neighbor of adjacent) {
        if (terrain[neighbor] !== brush || brushGroup[neighbor]) continue
        brushGroup[neighbor] = group
        members.push(neighbor)
        pending.push(neighbor)
      }
    }
  }
  const outlines = new Map<number, ReturnType<typeof brushOutline>>()

  function locate([x, y]: MapPoint) {
    const fromX = (x - offsetX) / scale, fromY = (y - offsetY) / scale
    const col = Math.floor(fromX), row = Math.floor(fromY)
    const index = col >= 0 && col < width && row >= 0 && row < height ? row * width + col : -1
    return { fromX, fromY, col, row, index }
  }

  function brushOutline(id: number) {
    const fill: string[] = [], edge: string[] = []
    for (const cell of groups[id]) {
      const x = cell % width, y = Math.floor(cell / width)
      fill.push(`M${x} ${y}h1v1h-1Z`)
      if (brushGroup[cell - width] !== id) edge.push(`M${x} ${y}h1`)
      if (x === width - 1 || brushGroup[cell + 1] !== id) edge.push(`M${x + 1} ${y}v1`)
      if (brushGroup[cell + width] !== id) edge.push(`M${x} ${y + 1}h1`)
      if (x === 0 || brushGroup[cell - 1] !== id) edge.push(`M${x} ${y}v1`)
    }
    return { id, fill: fill.join(""), edge: edge.join(""), transform: `translate(${offsetX} ${offsetY}) scale(${scale})` }
  }

  return { terrain, brushGroup, width, height, cellSize, scale, locate, brushOutline, outlines }
}

const grids: Partial<Record<MapStyle, ReturnType<typeof decodeTerrain>>> = {}
const terrainFor = (style: MapStyle) => grids[style] ??= decodeTerrain(style)

export function occupiedBrush(point: MapPoint, style: MapStyle) {
  const { locate, brushGroup, brushOutline, outlines } = terrainFor(style)
  const id = brushGroup[locate(point).index]
  if (!id) return
  const outline = outlines.get(id) ?? brushOutline(id)
  outlines.set(id, outline)
  return outline
}

export function terrainSightOutline(point: MapPoint, style: MapStyle, sight: number) {
  const { terrain, brushGroup, width, height, cellSize, scale, locate } = terrainFor(style)
  const { fromX, fromY, col, row, index } = locate(point)
  const [x, y] = point
  const radius = sight / cellSize
  // The planner permits drawing a position inside a wall. Only reveal the token there.
  const canTrace = index >= 0 && terrain[index] !== wall
  const sourceBrush = brushGroup[index] || 0
  const points = rays.map(([dx, dy]) => {
    const reach = canTrace ? rayReach(dx, dy) : .5
    return `${(x + dx * reach * scale).toFixed(2)} ${(y + dy * reach * scale).toFixed(2)}`
  })
  return `M${points.join("L")}Z`

  function rayReach(dx: number, dy: number) {
    const stepX = Math.sign(dx), stepY = Math.sign(dy)
    const deltaX = Math.abs(1 / dx), deltaY = Math.abs(1 / dy)
    let nextX = dx ? (dx > 0 ? col + 1 - fromX : fromX - col) * deltaX : Infinity
    let nextY = dy ? (dy > 0 ? row + 1 - fromY : fromY - row) * deltaY : Infinity
    let cellX = col, cellY = row

    while (true) {
      const distance = Math.min(nextX, nextY)
      if (distance >= radius) return radius
      if (nextX < nextY) {
        cellX += stepX
        nextX += deltaX
      } else {
        cellY += stepY
        nextY += deltaY
      }
      if (cellX < 0 || cellX >= width || cellY < 0 || cellY >= height) return distance
      const cell = cellY * width + cellX
      if (terrain[cell] === wall || (brushGroup[cell] && brushGroup[cell] !== sourceBrush)) return distance
    }
  }
}
