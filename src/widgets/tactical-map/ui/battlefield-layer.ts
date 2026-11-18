import { championSight, clamp, isSide, laneLabel, mapRadius, minionSight, nearestLane, progressOnLane, readWaves, sideLabel, towerAttack, towers, towerSight, wavePosition, type Side, type Wave } from "../model/battlefield"
import type { MapPoint } from "../model/faelights"
import { readWards, wardOnMap, type WardScene } from "../model/wards"

type Frame = { pos: Record<string, MapPoint>; waves?: unknown; wards?: unknown; destroyedTowers?: string[] }
type Changes = Pick<Frame, "waves" | "destroyedTowers">

export function mountBattlefield({ read, write, canEdit, getTool, getPerspective, point, wardScene, uid }: {
  read: () => Frame
  write: (changes: Changes) => void
  canEdit: () => boolean
  getTool: () => string
  getPerspective: () => Side | "all"
  point: (event: MouseEvent) => MapPoint
  wardScene: () => WardScene
  uid: () => string
}) {
  const get = <T extends HTMLElement | SVGElement = HTMLElement>(id: string) => document.getElementById(id) as unknown as T
  const map = get("map")
  const towersHost = get("map-towers")
  const wavesHost = get("map-waves")
  const vision = get("map-vision-mask")
  const waveSide = get<HTMLSelectElement>("map-wave-side")
  const preview = get("map-wave-preview")
  const cursor = get("map-wave-cursor")
  const detectedLane = get("map-wave-detected")
  const viewport = get("map-viewport")
  let keyboardPoint: MapPoint = [50, 50]
  let showTowers = false
  let drag: { index: number; wave: Wave; pointer: number; start: MapPoint; moved: boolean } | undefined

  const at = ([x, y]: MapPoint) => `left:${x}%;top:${y}%`
  const circle = ([x, y]: MapPoint, units: number) => `<circle cx="${x}" cy="${y}" r="${mapRadius(units)}"/>`

  function renderSight(frame: Frame, waves = readWaves(frame.waves)) {
    const side = getPerspective()
    if (!isSide(side)) {
      vision.innerHTML = ""
      return
    }
    const allied = Object.entries(frame.pos).filter(([id]) => id.startsWith(side + "_")).map(([, pos]) => circle(pos, championSight))
    const towersSight = towers.filter(t => t.side === side && !frame.destroyedTowers?.includes(t.id)).map(t => circle(t.point, towerSight))
    const scene = wardScene()
    const wavesSight = waves.filter(w => w.side === side).map(w => circle(wavePosition(w, scene.style), minionSight))
    const wards = readWards(frame.wards).map(w => wardOnMap(w, scene)).filter(w => w.side === side)
    const wardSight = wards.map(w => {
      const bonus = w.faelight
      const [x, y] = w.point
      return circle(w.point, w.sight) + (bonus ? `<path d="${bonus.bonusPath}" transform="translate(${x - bonus.minimap[0]} ${y - bonus.minimap[1]})"/>` : "")
    })
    vision.innerHTML = `<defs><mask id="tactical-fog" x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse"><rect width="100" height="100" fill="white"/><g fill="black">${[...allied, ...towersSight, ...wavesSight, ...wardSight].join("")}</g></mask></defs><rect width="100" height="100" fill="#050911" opacity=".77" mask="url(#tactical-fog)"/>`
  }

  function render(frame = read()) {
    const waves = readWaves(frame.waves)
    const { style } = wardScene()
    const interactive = canEdit() && getTool() === "move"
    wavesHost.innerHTML = waves.map((wave, index) => `<button type="button" class="map-piece map-wave" data-side="${wave.side}" data-wave-index="${index}"
      style="${at(wavePosition(wave, style))}" aria-label="Wave — ${laneLabel[wave.lane]} — ${sideLabel[wave.side]}" aria-description="Grupo de seis minions" title="Wave — ${laneLabel[wave.lane]} — ${sideLabel[wave.side]}"
      ${interactive || (canEdit() && getTool() === "erase") ? "" : "disabled"}><span class="map-wave-minions" aria-hidden="true">${"<i></i>".repeat(6)}</span></button>`).join("")
    renderSight(frame, waves)
  }

  function renderTowers(frame = read()) {
    const interactive = canEdit() && getTool() === "move"
    const activeTowers = towers.filter(tower => !frame.destroyedTowers?.includes(tower.id))
    get("map-tower-ranges").innerHTML = showTowers ? activeTowers.map(tower =>
      `<g data-side="${tower.side}">${circle(tower.point, towerAttack)}</g>`).join("") : ""
    towersHost.innerHTML = showTowers ? towers.map(tower => {
      const destroyed = frame.destroyedTowers?.includes(tower.id)
      return `<button type="button" class="map-piece map-tower" data-side="${tower.side}" data-tower="${tower.id}"
       style="${at(tower.point)}" aria-pressed="${Boolean(destroyed)}" aria-label="${tower.name}" title="${tower.name} · ${destroyed ? "Destruída" : "750 de alcance de ataque"}"
       ${interactive ? "" : "disabled"}><img src="assets/lol/hud/tower.png" alt=""></button>`
    }).join("") : ""
  }

  towersHost.addEventListener("click", event => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-tower]")
    if (!button || !canEdit() || getTool() !== "move") return
    const id = button.dataset.tower!
    const destroyed = read().destroyedTowers ?? []
    write({ destroyedTowers: destroyed.includes(id) ? destroyed.filter(value => value !== id) : [...destroyed, id] })
    towersHost.querySelector<HTMLElement>(`[data-tower="${id}"]`)?.focus({ preventScroll: true })
  })

  function withWave(index: number, wave?: Wave) {
    const waves = readWaves(read().waves)
    if (wave) waves[index] = wave
    else waves.splice(index, 1)
    return waves
  }

  function placeWave(at: MapPoint) {
    const side = waveSide.value
    const { lane, progress } = nearestLane(at, wardScene().style)
    if (isSide(side)) {
      const waves = readWaves(read().waves)
      const index = waves.findIndex(wave => wave.lane === lane)
      const existing = waves[index]
      if (existing?.side === side && existing.progress === progress) return
      const wave = { id: existing?.id ?? uid(), side, lane, progress }
      if (existing) waves[index] = wave
      else waves.push(wave)
      write({ waves })
    }
  }
  function showPreview(target: MapPoint, fromKeyboard = false) {
    const side = waveSide.value
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
    if (getTool() === "wave") placeWave(point(event))
  })
  map.addEventListener("pointermove", event => {
    if (canEdit() && getTool() === "wave" && !viewport.classList.contains("map-temporary-hand")) showPreview(point(event))
  })
  viewport.addEventListener("pointerleave", hidePreview)
  viewport.addEventListener("focus", () => {
    if (!canEdit() || getTool() !== "wave") return
    const rect = viewport.getBoundingClientRect()
    keyboardPoint = point(new MouseEvent("click", { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }))
    showPreview(keyboardPoint, true)
  })
  viewport.addEventListener("blur", hidePreview)
  viewport.addEventListener("keydown", event => {
    if (event.target !== viewport || !canEdit() || getTool() !== "wave" || event.ctrlKey || event.metaKey || event.altKey ||
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

  return {
    render, renderSight,
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
