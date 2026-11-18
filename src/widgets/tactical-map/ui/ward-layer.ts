import { editWards, getWardType, readWards, wardOnMap, wardTypes, type WardScene } from "../model/wards"
import type { MapPoint } from "../model/faelights"

const directions = new Map<string, MapPoint>([
  ["ArrowLeft", [-1, 0]], ["ArrowRight", [1, 0]], ["ArrowUp", [0, -1]], ["ArrowDown", [0, 1]],
])
const clamp = (axis: number) => Math.min(100, Math.max(0, axis))
const mapWidthInUnits = 15000
const wardShapes = {
  stealth: '<circle r="1.65"/>',
  control: '<path d="M0 -2 L2 0 L0 2 L-2 0 Z"/>',
  farsight: '<rect x="-1.55" y="-1.55" width="3.1" height="3.1" rx=".45"/>',
}

export function mountWardLayer({ read, write, getTool, isPlaying, pointFromEvent, mountTeamSelect }: {
  read: () => unknown
  write: (wards: ReturnType<typeof readWards>) => void
  getTool: () => string
  isPlaying: () => boolean
  pointFromEvent: (event: MouseEvent) => MapPoint
  mountTeamSelect: (field: HTMLSelectElement) => void
}) {
  const map = document.querySelector<HTMLElement>("#map")!
  const layer = map.querySelector<SVGSVGElement>("#map-wards")!
  const realistic = map.querySelector("#mapimg")!
  const spots = map.querySelector("#map-faelights")!
  const cursor = map.querySelector<HTMLButtonElement>("#map-ward-cursor")!
  const hint = document.querySelector<HTMLElement>("#map-ward-hint")!
  const legend = document.querySelector<HTMLElement>("#map-ward-legend")!
  const typeLegend = document.querySelector<HTMLElement>("#map-ward-types")!
  const bonusLegend = document.querySelector<HTMLElement>("#map-ward-bonus-legend")!
  const clear = document.querySelector<HTMLButtonElement>("#map-clear-wards")!
  const options = document.querySelector<HTMLElement>("#map-ward-options")!
  const typeSelect = document.querySelector<HTMLSelectElement>("#map-ward-type")!
  for (const { id, label, sight } of wardTypes) {
    const option = new Option(label, id)
    option.dataset.description = `${sight} unidades de visão`
    typeSelect.add(option)
  }
  mountTeamSelect(typeSelect)
  let cursorPosition: MapPoint = [50, 50]

  const scene = (): WardScene => ({
    style: realistic.hasAttribute("data-map-visible") ? "realistic" : "minimap",
    transformed: spots.hasAttribute("data-transformed"),
  })

  function render() {
    const view = scene()
    const wards = readWards(read()).map(ward => wardOnMap(ward, view))
    clear.disabled = wards.length === 0 || isPlaying()
    legend.hidden = wards.length === 0
    bonusLegend.hidden = !wards.some(ward => ward.faelight)
    const placedTypes = new Set(wards.map(ward => ward.type.id))
    typeLegend.innerHTML = wardTypes.filter(type => placedTypes.has(type.id)).map(({ id, label }) => `
      <li><svg class="ward-marker" data-ward-type="${id}" viewBox="-2.5 -2.5 5 5" aria-hidden="true">${wardShapes[id]}</svg>${label}</li>
    `).join("")
    const coverage = wards.map(({ point: [x, y], faelight, type, sight }) => `
      ${faelight ? `<path class="ward-vision-bonus" data-faelight="${faelight.id}" d="${faelight.bonusPath}"
        transform="translate(${x - faelight.minimap[0]} ${y - faelight.minimap[1]})"/>` : ""}
      <circle class="ward-vision-range" data-ward-type="${type.id}" cx="${x}" cy="${y}" r="${sight * 100 / mapWidthInUnits}"/>
    `).join("")
    const markers = wards.map(({ point: [x, y], faelight, type, sight }) => `
      <g class="ward-marker" data-ward-type="${type.id}" transform="translate(${x} ${y})"
        role="img" aria-label="${type.label}, ${sight} unidades de visão${faelight ? `, Lume Feérico em ${faelight.location}` : ""}">
        ${wardShapes[type.id]}<use href="assets/icons.svg#ward" x="-1.2" y="-1.2" width="2.4" height="2.4"/>
      </g>`).join("")
    layer.innerHTML = `<g aria-hidden="true">${coverage}</g>${markers}`
  }

  function handleWardAction(point: MapPoint) {
    const tool = getTool()
    if (isPlaying() || (tool !== "ward" && tool !== "remove-ward")) return
    const wards = readWards(read())
    const next = editWards(wards, tool, point, scene(), getWardType(typeSelect.value).id)
    if (next !== wards) write(next)
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

  return { render, setTool(tool: string) {
    const editing = tool === "ward" || tool === "remove-ward"
    options.hidden = tool !== "ward"
    cursor.hidden = hint.hidden = !editing
    map.classList.toggle("ward-editing", editing)
    const action = tool === "ward" ? "Colocar ward" : "Remover ward"
    cursor.setAttribute("aria-label", `${action} no mapa`)
    if (editing) cursor.focus({ preventScroll: true })
    hint.textContent = tool === "ward"
      ? "Clique no mapa para colocar uma ward. Sobre um Lume Feérico, ela mostra a visão extra."
      : "Clique em uma ward para removê-la."
  } }
}
