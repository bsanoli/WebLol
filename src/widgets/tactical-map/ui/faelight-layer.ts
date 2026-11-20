import { faelights } from "../model/faelights"

export function mountFaelightLayer({
  getState,
  save,
  mountMapSwitch,
  onAvailabilityChange,
}: {
  getState: () => { showFaelights?: boolean; additionalFaelights?: boolean }
  save: () => void
  mountMapSwitch: (
    host: Element,
    label: string,
    checked: boolean,
    change: (checked: boolean) => void,
    disabled?: boolean,
  ) => void
  onAvailabilityChange: () => void
}) {
  const layer = document.querySelector<HTMLElement>("#map-faelights")!
  const toggle = document.querySelector<HTMLElement>("#map-faelight-toggle")!
  const additionalToggle = document.querySelector<HTMLElement>("#map-faelight-additional-toggle")!
  const legend = document.querySelector<HTMLElement>("#map-faelight-additional-legend")!
  const fullLegend = document.querySelector<HTMLElement>("#map-faelight-legend")!
  let previewPlacement = false
  const renderVisibility = () => {
    layer.hidden = getState().showFaelights !== true && !previewPlacement
  }

  for (const { location, minimap, realistic, additional } of faelights) {
    const marker = document.createElement("span")
    marker.className = "faelight-marker"
    marker.setAttribute("role", "img")
    marker.setAttribute("aria-label", location)
    marker.toggleAttribute("data-additional-spot", Boolean(additional))
    marker.style.setProperty("--map-x", `${minimap[0]}%`)
    marker.style.setProperty("--map-y", `${minimap[1]}%`)
    marker.style.setProperty("--realistic-x", `${realistic[0]}%`)
    marker.style.setProperty("--realistic-y", `${realistic[1]}%`)
    layer.append(marker)
  }

  function renderAdditional() {
    const visible = getState().showFaelights === true
    const additional = getState().additionalFaelights === true
    layer.toggleAttribute("data-additional", additional)
    layer.toggleAttribute("data-additional-visible", additional && visible)
    legend.hidden = !additional || !visible
    mountMapSwitch(
      additionalToggle,
      "Lumes adicionais",
      additional && visible,
      next => {
        if (getState().showFaelights !== true) return
        getState().additionalFaelights = next
        save()
        renderAdditional()
        onAvailabilityChange()
      },
      !visible,
    )
  }

  function renderToggle() {
    const checked = getState().showFaelights === true
    renderVisibility()
    fullLegend.hidden = !checked
    mountMapSwitch(toggle, "Mostrar Lumes Feéricos", checked, next => {
      getState().showFaelights = next
      save()
      renderToggle()
      renderAdditional()
    })
  }

  renderToggle()
  renderAdditional()
  return {
    refresh() {
      renderToggle()
      renderAdditional()
    },
    preview(preview: boolean) {
      previewPlacement = preview
      renderVisibility()
    },
  }
}
