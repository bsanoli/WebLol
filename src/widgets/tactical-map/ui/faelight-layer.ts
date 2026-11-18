import { faelights } from "../model/faelights"

type VisionPreferences = {
  showFaelights?: boolean
  faelightTerrain?: string
}

export function mountFaelightLayer({ getState, save, mountTeamSelect, mountMapSwitch, onTerrainChange }: {
  getState: () => VisionPreferences
  save: () => void
  mountTeamSelect: (field: HTMLSelectElement) => void
  mountMapSwitch: (host: Element, label: string, checked: boolean, change: (checked: boolean) => void) => void
  onTerrainChange: () => void
}) {
  const layer = document.querySelector<HTMLElement>("#map-faelights")!
  const toggle = document.querySelector<HTMLElement>("#map-faelight-toggle")!
  const options = document.querySelector<HTMLElement>("#map-faelight-options")!
  const terrain = document.querySelector<HTMLSelectElement>("#map-faelight-terrain")!
  const legend = document.querySelector<HTMLElement>("#map-faelight-elemental-legend")!
  const fullLegend = document.querySelector<HTMLElement>("#map-faelight-legend")!
  let previewPlacement = false
  const renderVisibility = () => { layer.hidden = getState().showFaelights !== true && !previewPlacement }

  terrain.value = getState().faelightTerrain ?? terrain.options[0].value
  if (terrain.selectedIndex === -1) terrain.selectedIndex = 0
  mountTeamSelect(terrain)

  for (const { location, minimap, realistic, afterTransformation } of faelights) {
    const marker = document.createElement("span")
    marker.className = "faelight-marker"
    marker.setAttribute("role", "img")
    marker.setAttribute("aria-label", location)
    marker.toggleAttribute("data-elemental", Boolean(afterTransformation))
    marker.style.setProperty("--map-x", `${minimap[0]}%`)
    marker.style.setProperty("--map-y", `${minimap[1]}%`)
    marker.style.setProperty("--realistic-x", `${realistic[0]}%`)
    marker.style.setProperty("--realistic-y", `${realistic[1]}%`)
    layer.append(marker)
  }

  const renderTerrain = () => {
    const transformed = terrain.value !== "initial"
    layer.toggleAttribute("data-transformed", transformed)
    legend.hidden = !transformed
  }
  terrain.onchange = () => {
    getState().faelightTerrain = terrain.value
    save()
    renderTerrain()
    onTerrainChange()
  }

  function renderToggle() {
    const checked = getState().showFaelights === true
    renderVisibility()
    options.hidden = !checked
    fullLegend.hidden = !checked
    mountMapSwitch(toggle, "Mostrar Lumes Feéricos", checked, next => {
      getState().showFaelights = next
      save()
      renderToggle()
    })
  }

  renderTerrain()
  renderToggle()
  return (preview: boolean) => {
    previewPlacement = preview
    renderVisibility()
  }
}
