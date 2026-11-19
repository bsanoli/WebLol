import { clamp, isSide, laneLabel, mapRadius, nearestLane, progressOnLane, readWaves, sideLabel, towerAttack, towers, waveKey, wavePosition, type Side, type Wave } from "../model/battlefield"
import type { MapPoint, MapStyle } from "../model/faelights"
import type { WardScene } from "../model/wards"
import { mountMapSightLayer, type SightFrame } from "./map-sight-layer"
import { waveToolSide } from "./map-tools"

type Frame = SightFrame & { waves?: unknown }
type Changes = Pick<Frame, "waves" | "destroyedTowers">

const casterPortrait = { b: "bluerange_circle.png", r: "redrange_circle.png" }
const laneOrder = { top: 0, mid: 2, adc: 4 }

function waveMarkerPositions(waves: Wave[], style: MapStyle, boardWidth: number) {
  const clearance = Math.max(4.5, boardWidth ? 2400 / boardWidth : 0) + .2
  const occupied: MapPoint[] = []
  const positions = new Map<ReturnType<typeof waveKey>, MapPoint>()
  // Use a consistent order even when the waves were placed in a different order.
  const order = (wave: Wave) => laneOrder[wave.lane] + Number(wave.side === "r")
  for (const wave of [...waves].sort((a, b) => order(a) - order(b))) {
    const [x, y] = wavePosition(wave, style)
    let marker: MapPoint = [x, y]
    if (occupied.some(([px, py]) => Math.hypot(px - x, py - y) < clearance)) {
      const [ax, ay] = wavePosition({ ...wave, progress: wave.progress - .01 }, style)
      const [bx, by] = wavePosition({ ...wave, progress: wave.progress + .01 }, style)
      const normal = Math.atan2(by - ay, bx - ax) + Math.PI / 2
      let nearest = Infinity
      for (let direction = 0; direction < 8; direction++) {
        const angle = normal + direction * Math.PI / 4
        const ux = Math.cos(angle), uy = Math.sin(angle)
        // Intersect this ray with each earlier marker's clearance circle.
        const intervals = occupied.flatMap(([px, py]) => {
          const dx = px - x, dy = py - y
          const along = dx * ux + dy * uy
          const across = dx * uy - dy * ux
          if (Math.abs(across) >= clearance) return []
          const reach = Math.sqrt(clearance ** 2 - across ** 2)
          return [{ start: along - reach, end: along + reach }]
        }).sort((a, b) => a.start - b.start)
        let distance = 0
        for (const interval of intervals) {
          if (interval.start > distance) break
          distance = Math.max(distance, interval.end)
        }
        if (distance < nearest - .0001) {
          nearest = distance
          marker = [x + ux * distance, y + uy * distance]
        }
      }
    }
    occupied.push(marker)
    positions.set(waveKey(wave), marker)
  }
  return positions
}

export function mountBattlefield({ read, write, canEdit, getTool, getPerspective, point, wardScene, uid, onPlaced }: {
  read: () => Frame
  write: (changes: Changes) => void
  canEdit: () => boolean
  getTool: () => string
  getPerspective: () => Side | "all"
  point: (event: MouseEvent) => MapPoint
  wardScene: () => WardScene
  uid: () => string
  onPlaced: () => void
}) {
  const get = <T extends HTMLElement | SVGElement = HTMLElement>(id: string) => document.getElementById(id) as unknown as T
  const map = get("map")
  const towersHost = get("map-towers")
  const wavesHost = get("map-waves")
  const paintSight = mountMapSightLayer(get<SVGElement>("map-vision-mask"), getPerspective, wardScene)
  const preview = get("map-wave-preview")
  const cursor = get("map-wave-cursor")
  const detectedLane = get("map-wave-detected")
  const viewport = get("map-viewport")
  let keyboardPoint: MapPoint = [50, 50]
  let showTowers = false
  let drag: { index: number; wave: Wave; pointer: number; start: MapPoint; moved: boolean } | undefined

  const at = ([x, y]: MapPoint) => `left:${x}%;top:${y}%`
  function renderSight(frame: Frame, waves = readWaves(frame.waves)) {
    paintSight(frame, waves)
  }

  function render(frame = read()) {
    const waves = readWaves(frame.waves)
    const { style } = wardScene()
    const interactive = canEdit() && getTool() === "move"
    const positions = waveMarkerPositions(waves, style, map.clientWidth)
    wavesHost.innerHTML = waves.map((wave, index) => `<button type="button" class="map-piece map-wave" data-side="${wave.side}" data-wave-index="${index}"
      style="${at(positions.get(waveKey(wave))!)}" aria-label="Wave — ${laneLabel[wave.lane]} — ${sideLabel[wave.side]}" aria-description="Grupo de seis minions" title="Wave — ${laneLabel[wave.lane]} — ${sideLabel[wave.side]}"
      ${interactive || (canEdit() && getTool() === "erase") ? "" : "disabled"}><img class="map-wave-caster" src="assets/lol/hud/${casterPortrait[wave.side]}" alt=""></button>`).join("")
    renderSight(frame, waves)
  }

  function renderTowers(frame = read()) {
    const interactive = canEdit() && getTool() === "move"
    const teamVision = getPerspective() !== "all"
    const { style } = wardScene()
    const activeTowers = towers.filter(tower => !frame.destroyedTowers?.includes(tower.id))
    get("map-tower-ranges").innerHTML = showTowers ? activeTowers.map(tower =>
      `<g data-side="${tower.side}"><circle cx="${tower.point[0]}" cy="${tower.point[1]}" r="${mapRadius(towerAttack, style)}"/></g>`).join("") : ""
    towersHost.toggleAttribute("data-team-vision", teamVision)
    towersHost.innerHTML = showTowers || teamVision ? towers.map(tower => {
      const destroyed = frame.destroyedTowers?.includes(tower.id)
      const state = destroyed ? "Destruída" : "Ativa"
      const action = destroyed ? "Restaurar torre" : "Destruir torre"
      return `<button type="button" class="map-piece map-tower" data-side="${tower.side}" data-tower="${tower.id}"
       style="${at(tower.point)}" aria-pressed="${Boolean(destroyed)}" aria-label="${tower.name}" aria-description="${state}${interactive ? `. ${action}` : ""}"
       title="${tower.name} · ${state}${interactive ? ` · ${action}` : ""}"
       ${interactive ? "" : "disabled"}><img src="assets/lol/hud/tower.png" alt=""></button>`
    }).join("") : ""
  }

  function toggleTower(id: string) {
    const destroyed = read().destroyedTowers ?? []
    write({ destroyedTowers: destroyed.includes(id) ? destroyed.filter(value => value !== id) : [...destroyed, id] })
  }

  towersHost.addEventListener("click", event => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-tower]")
    if (!button || !canEdit() || getTool() !== "move") return
    const id = button.dataset.tower!
    toggleTower(id)
    towersHost.querySelector<HTMLElement>(`[data-tower="${id}"]`)?.focus({ preventScroll: true })
  })

  function withWave(index: number, wave?: Wave) {
    const waves = readWaves(read().waves)
    if (wave) waves[index] = wave
    else waves.splice(index, 1)
    return waves
  }

  function placeWave(at: MapPoint) {
    const side = waveToolSide(getTool())
    const { lane, progress } = nearestLane(at, wardScene().style)
    if (isSide(side)) {
      const waves = readWaves(read().waves)
      const index = waves.findIndex(wave => wave.lane === lane && wave.side === side)
      const existing = waves[index]
      if (existing?.progress === progress) return
      const wave = { id: existing?.id ?? uid(), side, lane, progress }
      if (existing) waves[index] = wave
      else waves.push(wave)
      write({ waves })
      onPlaced()
    }
  }
  function showPreview(target: MapPoint, fromKeyboard = false) {
    const side = waveToolSide(getTool())
    if (!isSide(side)) return
    const { style } = wardScene()
    const wave = nearestLane(target, style)
    const projected = wavePosition(wave, style)
    preview.style.cssText = at(projected)
    preview.dataset.side = side
    preview.hidden = false
    const label = `Rota detectada: ${laneLabel[wave.lane]}`
    if (detectedLane.textContent !== label) detectedLane.textContent = label
    cursor.hidden = !fromKeyboard
    if (fromKeyboard) cursor.style.cssText = at(target)
  }
  function hidePreview() {
    preview.hidden = cursor.hidden = true
    detectedLane.textContent = ""
  }
  map.addEventListener("click", event => {
    if (!canEdit()) return
    const marker = (event.target as Element).closest<HTMLElement>("[data-wave-index]")
    if (marker && getTool() === "erase") write({ waves: withWave(Number(marker.dataset.waveIndex)) })
    if (waveToolSide(getTool())) placeWave(point(event))
  })
  map.addEventListener("pointermove", event => {
    if (canEdit() && waveToolSide(getTool()) && !viewport.classList.contains("map-temporary-hand")) showPreview(point(event))
  })
  viewport.addEventListener("pointerleave", hidePreview)
  viewport.addEventListener("focus", () => {
    if (!canEdit() || !waveToolSide(getTool())) return
    const rect = viewport.getBoundingClientRect()
    keyboardPoint = point(new MouseEvent("click", { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }))
    showPreview(keyboardPoint, true)
  })
  viewport.addEventListener("blur", hidePreview)
  viewport.addEventListener("keydown", event => {
    if (event.target !== viewport || !canEdit() || !waveToolSide(getTool()) || event.ctrlKey || event.metaKey || event.altKey ||
      viewport.classList.contains("map-temporary-hand")) return
    if (event.key === "Enter") {
      event.preventDefault()
      placeWave(keyboardPoint)
      return
    }
    const dx = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0
    const dy = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
    if (!dx && !dy) return
    event.preventDefault()
    const step = event.shiftKey ? 10 : 2
    keyboardPoint = [clamp(keyboardPoint[0] + dx * step), clamp(keyboardPoint[1] + dy * step)]
    showPreview(keyboardPoint, true)
  })

  wavesHost.addEventListener("pointerdown", event => {
    const marker = (event.target as Element).closest<HTMLElement>("[data-wave-index]")
    if (!marker || !canEdit() || getTool() !== "move" || event.button !== 0) return
    const index = Number(marker.dataset.waveIndex), wave = readWaves(read().waves)[index]
    if (!wave) return
    drag = { index, wave, pointer: event.pointerId, start: point(event), moved: false }
    map.setPointerCapture(event.pointerId)
  })
  map.addEventListener("pointermove", event => {
    if (!drag || drag.pointer !== event.pointerId) return
    const next = point(event)
    drag.moved ||= Math.hypot(next[0] - drag.start[0], next[1] - drag.start[1]) > .25
    if (!drag.moved) return
    drag.wave = { ...drag.wave, progress: progressOnLane(drag.wave.lane, next, wardScene().style) }
    render({ ...read(), waves: withWave(drag.index, drag.wave) })
  })
  map.addEventListener("pointerup", event => {
    if (!drag || drag.pointer !== event.pointerId) return
    const change = drag
    drag = undefined
    if (change.moved && canEdit()) write({ waves: withWave(change.index, change.wave) })
  })
  map.addEventListener("lostpointercapture", event => {
    if (drag?.pointer !== event.pointerId) return
    drag = undefined
    render()
  })

  wavesHost.addEventListener("keydown", event => {
    const marker = (event.target as Element).closest<HTMLElement>("[data-wave-index]")
    if (!marker || !canEdit() || getTool() !== "move" || event.altKey || event.metaKey || event.ctrlKey) return
    const index = Number(marker.dataset.waveIndex), wave = readWaves(read().waves)[index]
    if (!wave) return
    if (event.key === "Delete") {
      event.preventDefault()
      write({ waves: withWave(index) })
      return
    }
    const direction = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : 0
    if (!direction) return
    event.preventDefault()
    const progress = clamp(wave.progress + direction * (event.shiftKey ? .08 : .025), 1)
    if (progress === wave.progress) return
    write({ waves: withWave(index, { ...wave, progress }) })
    wavesHost.querySelector<HTMLElement>(`[data-wave-index="${index}"]`)?.focus({ preventScroll: true })
  })

  function contextAction(event: MouseEvent | KeyboardEvent, kind: "wave" | "tower") {
    if (!canEdit()) return
    const host = kind === "wave" ? wavesHost : towersHost
    const selector = kind === "wave" ? "[data-wave-index]" : "[data-tower]"
    const direct = (event.target as Element).closest<HTMLButtonElement>(selector)
    const button = direct && host.contains(direct) ? direct : "clientX" in event
      ? [...host.querySelectorAll<HTMLButtonElement>(selector)].reverse().find(candidate => {
        const bounds = candidate.getBoundingClientRect()
        return event.clientX >= bounds.left && event.clientX <= bounds.right &&
          event.clientY >= bounds.top && event.clientY <= bounds.bottom
      }) : undefined
    if (!button) return
    const targetName = button.getAttribute("aria-label") ?? ""
    if (kind === "tower") {
      const id = button.dataset.tower!
      const destroyed = read().destroyedTowers?.includes(id)
      return { label: destroyed ? "Restaurar" : "Marcar como destruída", targetName, marker: button, run: () => {
        if (canEdit()) toggleTower(id)
      } }
    }
    const wave = readWaves(read().waves)[Number(button.dataset.waveIndex)]
    if (!wave) return
    return { label: "Excluir", targetName, marker: button, run: () => {
      if (!canEdit()) return
      const waves = readWaves(read().waves)
      const next = waves.filter(candidate => waveKey(candidate) !== waveKey(wave) || candidate.id !== wave.id)
      if (next.length !== waves.length) write({ waves: next })
    } }
  }

  return {
    render, renderSight, contextAction,
    renderTowers,
    get showTowers() { return showTowers },
    toggleTowers(enabled: boolean) {
      showTowers = enabled
      renderTowers()
    },
    setWavePreview(active: boolean, focus: boolean) {
      if (!active) { hidePreview(); viewport.removeAttribute("aria-description"); return }
      viewport.setAttribute("aria-description", "Use as setas para mover o cursor e Enter para colocar a wave na rota mais próxima.")
      if (focus) viewport.focus({ preventScroll: true })
    },
  }
}
