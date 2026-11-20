import type { MapPoint } from "../model/faelights"

type StrokeKind = "arrow" | "freehand" | "freehand-arrow"
type Line = { c: string; pts: MapPoint[]; kind?: StrokeKind; width?: number; dashed?: boolean }

export const hasArrowhead = (line: Line) => line.kind !== "freehand"

function pointBeforeEnd(points: MapPoint[], distance: number) {
  for (let i = points.length - 1; i > 0; i--) {
    const [x, y] = points[i],
      [previousX, previousY] = points[i - 1]
    const dx = previousX - x,
      dy = previousY - y
    const length = Math.hypot(dx, dy)
    if (length && distance <= length) {
      const point: MapPoint = [x + (dx * distance) / length, y + (dy * distance) / length]
      return { point, index: i - 1 }
    }
    distance -= length
  }
  return { point: points[0], index: -1 }
}

export function mountMapDrawing({
  map,
  read,
  write,
  getTool,
  canEdit,
  point,
  scale,
  update,
}: {
  map: HTMLElement
  read: () => Line[]
  write: (lines: Line[]) => void
  getTool: () => string
  canEdit: () => boolean
  point: (event: MouseEvent) => MapPoint
  scale: () => number
  update: () => void
}) {
  const canvas = map.querySelector<HTMLCanvasElement>("canvas")!
  const width = document.querySelector<HTMLSelectElement>("#map-stroke-width")!
  const style = document.querySelector<HTMLSelectElement>("#map-stroke-style")!
  const arrowhead = document.querySelector<HTMLInputElement>("#map-stroke-arrowhead")!
  let color = "#ffd34d"
  let hover = -1
  let contextIndex = -1
  let pending: MapPoint | undefined
  let active: { id: number; origin: MapPoint; points: MapPoint[]; kind: StrokeKind } | undefined

  const make = (kind: StrokeKind, pts: MapPoint[]): Line => ({
    c: color,
    pts,
    kind,
    width: Number(width.value),
    dashed: style.value === "dashed",
  })
  const distance = (a: MapPoint, b: MapPoint) => Math.hypot(a[0] - b[0], a[1] - b[1])

  function render() {
    update()
    const rect = canvas.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1
    const size = Math.round(rect.width * dpr)
    if (!size) return
    if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size
    const g = canvas.getContext("2d")!,
      unit = size / 100
    g.clearRect(0, 0, size, size)
    g.lineCap = "round"
    g.lineJoin = "round"
    const preview = active ? make(active.kind, active.points) : undefined
    const lines = preview ? [...read(), preview] : read()
    lines.forEach((line, index) => {
      if (line.pts.length < 2) return
      const contextSelected = index === contextIndex
      const highlight = !contextSelected && getTool() === "erase" && index === hover
      const thickness = (highlight ? 6 : (line.width ?? 3.2)) * dpr
      g.strokeStyle = g.fillStyle = highlight ? "#ff5656" : line.c
      g.lineWidth = thickness
      g.setLineDash(line.dashed || highlight ? [8 * dpr, 5 * dpr] : [])
      const end = line.pts.length - 1
      const [x, y] = line.pts[end]
      const freehandArrow = line.kind === "freehand-arrow"
      const [bx, by] = freehandArrow
        ? pointBeforeEnd(line.pts, (12 * dpr) / unit).point
        : line.pts[Math.max(0, end - 3)]
      const drawHead = hasArrowhead(line) && (x !== bx || y !== by)
      const angle = Math.atan2(y - by, x - bx),
        tip = Math.max(9 * dpr, thickness * 3.4)
      // End the round stroke inside the wider part of the arrowhead.
      const inset = tip * 0.72
      const tail = drawHead ? pointBeforeEnd(line.pts, inset / unit) : undefined
      if (!tail || tail.index >= 0) {
        g.beginPath()
        g.moveTo(line.pts[0][0] * unit, line.pts[0][1] * unit)
        for (let i = 1; i <= (tail?.index ?? end); i++) {
          const [px, py] = line.pts[i]
          g.lineTo(px * unit, py * unit)
        }
        if (tail) {
          g.lineTo(tail.point[0] * unit, tail.point[1] * unit)
          g.lineTo(x * unit - inset * Math.cos(angle), y * unit - inset * Math.sin(angle))
        }
        if (contextSelected) {
          g.save()
          g.strokeStyle = "#fff2b7"
          g.lineWidth = thickness + 5 * dpr
          g.stroke()
          g.restore()
        }
        g.stroke()
      }
      if (!drawHead) return
      g.beginPath()
      g.moveTo(x * unit, y * unit)
      g.lineTo(x * unit - tip * Math.cos(angle - 0.45), y * unit - tip * Math.sin(angle - 0.45))
      g.lineTo(x * unit - tip * Math.cos(angle + 0.45), y * unit - tip * Math.sin(angle + 0.45))
      g.closePath()
      if (contextSelected) {
        g.save()
        g.setLineDash([])
        g.strokeStyle = "#fff2b7"
        g.lineWidth = 5 * dpr
        g.stroke()
        g.restore()
      }
      g.fill()
    })
    if (pending) {
      g.fillStyle = color
      g.beginPath()
      g.arc(pending[0] * unit, pending[1] * unit, 4 * dpr, 0, Math.PI * 2)
      g.fill()
    }
  }

  function hit([x, y]: MapPoint) {
    let index = -1,
      closest = 2 / scale()
    read().forEach((line, i) => {
      for (let j = 1; j < line.pts.length; j++) {
        const [ax, ay] = line.pts[j - 1],
          [bx, by] = line.pts[j]
        const dx = bx - ax,
          dy = by - ay,
          length = dx * dx + dy * dy
        const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0
        const d = Math.hypot(x - ax - t * dx, y - ay - t * dy)
        if (d < closest) {
          closest = d
          index = i
        }
      }
    })
    return index
  }

  map.addEventListener("pointerdown", event => {
    if (!canEdit() || event.button !== 0 || (event.target as Element).closest(".map-wave, .map-ward-target")) return
    const tool = getTool()
    if (tool === "erase") {
      const index = hit(point(event))
      if (index >= 0) {
        hover = -1
        write(read().filter((_, i) => i !== index))
      }
      return
    }
    if (tool !== "draw" && tool !== "freehand") return
    event.preventDefault()
    const origin = point(event)
    const kind = tool === "draw" ? "arrow" : arrowhead.checked ? "freehand-arrow" : "freehand"
    active = { id: event.pointerId, origin, points: [pending ?? origin], kind }
    map.setPointerCapture(event.pointerId)
  })

  map.addEventListener("pointermove", event => {
    if (!canEdit()) return
    const here = point(event)
    if (active?.id === event.pointerId) {
      if (active.kind === "arrow") active.points[1] = here
      else if (distance(here, active.points[active.points.length - 1]) > 0.35 / scale()) active.points.push(here)
      render()
    } else if (getTool() === "erase") {
      const next = (event.target as Element).closest(".map-wave, .map-ward-target") ? -1 : hit(here)
      if (next !== hover) {
        hover = next
        render()
      }
    }
  })

  map.addEventListener("pointerup", event => {
    if (active?.id !== event.pointerId) return
    const stroke = active,
      here = point(event)
    active = undefined
    if (!canEdit()) {
      pending = undefined
      render()
      return
    }
    if (stroke.kind === "arrow") {
      const start = pending ?? stroke.origin
      if (!pending && distance(start, here) < 0.6 / scale()) {
        pending = here
        render()
        return
      }
      pending = undefined
      if (distance(start, here) >= 0.6 / scale()) {
        write([...read(), make("arrow", [start, here])])
        return
      }
    } else if (stroke.points.length > 1) {
      if (distance(here, stroke.points[stroke.points.length - 1]) > 0) stroke.points.push(here)
      write([...read(), make(stroke.kind, stroke.points)])
      return
    }
    render()
  })

  map.addEventListener("lostpointercapture", event => {
    if (active?.id === event.pointerId) {
      active = undefined
      render()
    }
  })
  map.addEventListener("pointerleave", () => {
    if (hover !== -1) {
      hover = -1
      render()
    }
  })

  function reset() {
    active = undefined
    pending = undefined
    hover = -1
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && (active || pending)) {
      reset()
      render()
    }
  })

  return {
    render,
    reset,
    contextAction(event: MouseEvent) {
      const index = hit(point(event))
      const line = read()[index]
      if (!line) return
      const targetName =
        line.kind === "freehand" ? "Traço livre" : line.kind === "freehand-arrow" ? "Traço livre com seta" : "Seta"
      return {
        label: "Excluir",
        targetName,
        highlight(active: boolean) {
          contextIndex = active ? index : -1
          render()
        },
        run() {
          hover = -1
          if (canEdit()) write(read().filter((_, candidate) => candidate !== index))
        },
      }
    },
    setColor(value: string) {
      color = value
      render()
    },
  }
}
