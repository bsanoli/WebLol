import { addWard, getWardType, placeWard, readWards, wardOnMap, wardTypes, type Ward, type WardScene } from "../model/wards"
import { isSide, sideLabel, mapRadius, type Side } from "../model/battlefield"
import type { MapPoint } from "../model/faelights"
import { mountWardSidePopover } from "./ward-side-popover"

const directions = new Map<string, MapPoint>([
  ["ArrowLeft", [-1, 0]], ["ArrowRight", [1, 0]], ["ArrowUp", [0, -1]], ["ArrowDown", [0, 1]],
])
const clamp = (axis: number) => Math.min(100, Math.max(0, axis))
const wardItems = { stealth: 3340, control: 2055, farsight: 3363 }
const wardShapes = {
  stealth: '<circle r="1.65"/>',
  control: '<path d="M0 -2 L2 0 L0 2 L-2 0 Z"/>',
  farsight: '<rect x="-1.55" y="-1.55" width="3.1" height="3.1" rx=".45"/>',
}

export function mountWardLayer({ read, write, getTool, isPlaying, pointFromEvent, mountTeamSelect, onPlaced }: {
  read: () => unknown
  write: (wards: ReturnType<typeof readWards>) => void
  getTool: () => string
  isPlaying: () => boolean
  pointFromEvent: (event: MouseEvent) => MapPoint
  mountTeamSelect: (field: HTMLSelectElement) => void
  onPlaced: () => void
}) {
  const map = document.querySelector<HTMLElement>("#map")!
  const viewport = document.querySelector<HTMLElement>("#map-viewport")!
  const layer = map.querySelector<SVGSVGElement>("#map-wards")!
  const realistic = map.querySelector("#mapimg")!
  const spots = map.querySelector("#map-faelights")!
  const cursor = map.querySelector<HTMLButtonElement>("#map-ward-cursor")!
  const hint = document.querySelector<HTMLElement>("#map-ward-hint")!
  const legend = document.querySelector<HTMLElement>("#map-ward-legend")!
  const typeLegend = document.querySelector<HTMLElement>("#map-ward-types")!
  const bonusLegend = document.querySelector<HTMLElement>("#map-ward-bonus-legend")!
  const clear = document.querySelector<HTMLButtonElement>("#map-clear-wards")!
  const typeSelect = document.querySelector<HTMLSelectElement>("#map-ward-type")!
  const sideSelect = document.querySelector<HTMLSelectElement>("#map-ward-side")!
  const targets = map.querySelector<HTMLElement>("#map-ward-targets")!
  const editor = mountWardSidePopover(viewport, changeSide)
  for (const { id, label, sight } of wardTypes) {
    const option = new Option(label, id)
    option.dataset.description = `${sight} unidades de visão`
    typeSelect.add(option)
  }
  mountTeamSelect(typeSelect)
  mountTeamSelect(sideSelect)
  let cursorPosition: MapPoint = [50, 50]
  let selected = -1
  let drag: { index: number; pointer: number; start: MapPoint; preview?: Ward[] } | undefined

  const scene = (): WardScene => ({
    style: realistic.hasAttribute("data-map-visible") ? "realistic" : "minimap",
    additionalFaelights: spots.hasAttribute("data-additional"),
    showAdditionalFaelights: spots.hasAttribute("data-additional-visible"),
  })

  function render(preview?: Ward[]) {
    editor.close()
    const view = scene()
    const wards = (preview ?? readWards(read())).map(ward => wardOnMap(ward, view))
    if (selected >= wards.length) selected = -1
    clear.disabled = wards.length === 0 || isPlaying()
    legend.hidden = wards.length === 0
    bonusLegend.hidden = !wards.some(ward => ward.faelight)
    const placedTypes = new Set(wards.map(ward => ward.type.id))
    typeLegend.innerHTML = wardTypes.filter(type => placedTypes.has(type.id)).map(({ id, label }) => `
      <li><svg class="ward-marker" data-ward-type="${id}" viewBox="-2.5 -2.5 5 5" aria-hidden="true">${wardShapes[id]}</svg>${label}</li>
    `).join("")
    const coverage = wards.map(({ point: [x, y], faelight, type, sight, side }) => `
      ${faelight ? `<path class="ward-vision-bonus" data-faelight="${faelight.id}" d="${faelight.bonusPath}"
        transform="translate(${x - faelight.minimap[0]} ${y - faelight.minimap[1]})"/>` : ""}
      <circle class="ward-vision-range" data-ward-type="${type.id}" data-side="${side ?? ""}" cx="${x}" cy="${y}" r="${mapRadius(sight, view.style)}"/>
    `).join("")
    const markers = wards.map(({ point: [x, y], faelight, type, sight, side }, index) => `
      <g class="ward-marker" data-ward-marker="${index}" data-ward-type="${type.id}" data-side="${side ?? ""}" transform="translate(${x} ${y})"
        role="img" aria-label="${type.label}, ${sight} unidades de visão${faelight ? `, Lume Feérico em ${faelight.location}` : ""}${side ? `, ${sideLabel[side]}` : ""}">
        <g class="${index === selected ? "ward-selected" : ""}">${wardShapes[type.id]}</g><use href="assets/icons.svg#ward" x="-1.2" y="-1.2" width="2.4" height="2.4"/>
        <image href="assets/lol/hud/ward-${wardItems[type.id]}.png" x="-1.1" y="-1.1" width="2.2" height="2.2"/>
      </g>`).join("")
    layer.innerHTML = `<g aria-hidden="true">${coverage}</g>${markers}`
    const erasing = getTool() === "erase"
    const interactive = !isPlaying() && (getTool() === "move" || erasing)
    targets.innerHTML = interactive ? wards.map(({ point: [x, y], type, side }, index) => `
      <button type="button" class="map-ward-target" data-ward-index="${index}" style="left:${x}%;top:${y}%"
        aria-label="${erasing ? "Apagar" : "Mover"} ${type.label} — ${side ? sideLabel[side] : "Sem lado"}"
        ${erasing ? "" : 'aria-haspopup="dialog" aria-controls="map-ward-popover" aria-expanded="false"'}
        title="${type.label} — ${side ? sideLabel[side] : "Sem lado"}"></button>`).join("") : ""
  }

  function handleWardAction(point: MapPoint) {
    if (isPlaying() || getTool() !== "ward") return
    const wards = readWards(read())
    const side = isSide(sideSelect.value) ? sideSelect.value : "b"
    const next = addWard(wards, point, scene(), getWardType(typeSelect.value).id, side)
    if (next !== wards) {
      write(next)
      onPlaced()
    }
  }

  map.addEventListener("click", event => {
    if (event.target !== cursor) handleWardAction(pointFromEvent(event))
  })
  clear.addEventListener("click", () => {
    if (!isPlaying() && readWards(read()).length) write([])
  })
  cursor.addEventListener("click", () => handleWardAction(cursorPosition))
  cursor.addEventListener("keydown", event => {
    const direction = directions.get(event.key)
    if (!direction || event.ctrlKey || event.altKey || event.metaKey) return
    event.preventDefault()
    const distance = event.shiftKey ? 5 : 1
    const [x, y] = [clamp(cursorPosition[0] + direction[0] * distance), clamp(cursorPosition[1] + direction[1] * distance)]
    cursorPosition = [x, y]
    cursor.style.left = `${x}%`
    cursor.style.top = `${y}%`
  })

  const targetAt = (index: number) => targets.querySelector<HTMLButtonElement>(`[data-ward-index="${index}"]`)
  const focus = (index: number) => targetAt(index)?.focus({ preventScroll: true })
  function remove(index: number) {
    const wards = readWards(read())
    if (isPlaying() || !wards[index]) return
    selected = -1
    write(wards.filter((_, candidate) => candidate !== index))
  }
  function contextAction(event: MouseEvent | KeyboardEvent) {
    const wards = readWards(read())
    const view = scene()
    const target = (event.target as Element).closest<HTMLElement>("[data-ward-index]")
    let index = target ? Number(target.dataset.wardIndex) : -1
    if (event instanceof MouseEvent) {
      const [x, y] = pointFromEvent(event)
      let closest = 2.6
      wards.forEach((ward, i) => {
        const [wx, wy] = wardOnMap(ward, view).point
        const distance = Math.hypot(wx - x, wy - y)
        if (distance <= closest) {
          index = i
          closest = distance
        }
      })
    }
    const ward = wards[index]
    if (!ward) return
    const { type, side } = wardOnMap(ward, view)
    return {
      label: "Excluir",
      targetName: `${type.label} — ${side ? sideLabel[side] : "Sem lado"}`,
      marker: layer.querySelector(`[data-ward-marker="${index}"]`) ?? undefined,
      run: () => remove(index),
    }
  }
  function openEditor(index: number) {
    const ward = readWards(read())[index]
    if (!ward) return
    selected = index
    render()
    const target = targetAt(index)
    if (target) editor.open(target, ward.side)
  }
  function changeSide(side?: Side) {
    const index = selected
    const wards = readWards(read()), ward = wards[index]
    if (!ward || isPlaying() || getTool() !== "move") return
    editor.close()
    if (ward.side !== side) {
      wards[index] = { ...ward, side }
      write(wards)
    }
    focus(index)
  }
  targets.addEventListener("click", event => {
    const target = (event.target as Element).closest<HTMLElement>("[data-ward-index]")
    if (!target || isPlaying()) return
    const index = Number(target.dataset.wardIndex)
    if (getTool() === "erase") {
      event.stopPropagation()
      const wards = readWards(read())
      if (!wards[index]) return
      remove(index)
      if (event.detail === 0) {
        const next = targetAt(Math.min(index, wards.length - 2)) ?? viewport
        next.focus({ preventScroll: true })
      }
    } else if (getTool() === "move" && event.detail === 0) openEditor(index)
  })
  targets.addEventListener("pointerdown", event => {
    const target = (event.target as Element).closest<HTMLElement>("[data-ward-index]")
    if (!target || event.button !== 0 || isPlaying() || getTool() !== "move") return
    editor.close()
    drag = { index: Number(target.dataset.wardIndex), pointer: event.pointerId, start: pointFromEvent(event) }
    map.setPointerCapture(event.pointerId)
  })
  map.addEventListener("pointermove", event => {
    if (!drag || drag.pointer !== event.pointerId || isPlaying()) return
    const point = pointFromEvent(event)
    if (!drag.preview && Math.hypot(point[0] - drag.start[0], point[1] - drag.start[1]) < .3) return
    const wards = readWards(read()), ward = wards[drag.index]
    if (!ward) return
    wards[drag.index] = placeWard(ward, point, scene())
    drag.preview = wards
    render(wards)
  })
  map.addEventListener("pointerup", event => {
    if (!drag || drag.pointer !== event.pointerId) return
    const change = drag
    drag = undefined
    if (isPlaying()) { render(); return }
    if (change.preview) {
      selected = change.index
      write(change.preview)
      focus(selected)
    } else openEditor(change.index)
  })
  map.addEventListener("lostpointercapture", event => {
    if (drag?.pointer !== event.pointerId) return
    drag = undefined
    render()
  })
  targets.addEventListener("keydown", event => {
    const target = (event.target as Element).closest<HTMLElement>("[data-ward-index]")
    if (!target || isPlaying() || getTool() !== "move" || event.ctrlKey || event.altKey || event.metaKey) return
    const index = Number(target.dataset.wardIndex), direction = directions.get(event.key)
    const wards = readWards(read()), ward = wards[index]
    if (!ward || (!direction && event.key !== "Delete")) return
    event.preventDefault()
    if (direction) {
      const [x, y] = wardOnMap(ward, scene()).point
      const step = event.shiftKey ? 6 : ward.faelightId ? 3 : 1
      wards[index] = placeWard(ward, [clamp(x + direction[0] * step), clamp(y + direction[1] * step)], scene())
      selected = index
    } else {
      wards.splice(index, 1)
      selected = -1
    }
    write(wards)
    focus(index)
  })

  return { render, scene, contextAction, closeEditor: editor.close, clearSelection() { editor.close(); selected = -1 }, setTool(tool: string, focusCursor = false) {
    const editing = tool === "ward"
    cursor.hidden = !editing
    map.classList.toggle("ward-editing", editing)
    cursor.setAttribute("aria-label", "Colocar ward no mapa")
    if (editing && focusCursor) cursor.focus({ preventScroll: true })
    hint.textContent = "Clique no mapa para colocar uma ward. Sobre um Lume Feérico, ela mostra a visão extra."
  } }
}
