import { faelights } from "../model/faelights"
import { requireElement } from "@/shared/lib/dom"

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
  const layer = requireElement<HTMLElement>("#map-faelights")
  const toggle = requireElement<HTMLElement>("#map-faelight-toggle")
  const additionalToggle = requireElement<HTMLElement>("#map-faelight-additional-toggle")
  const legend = requireElement<HTMLElement>("#map-faelight-additional-legend")
  const fullLegend = requireElement<HTMLElement>("#map-faelight-legend")
  let isPlacementPreview = false
  const renderVisibility = () => {
    layer.hidden = getState().showFaelights !== true && !isPlacementPreview
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
    const isVisible = getState().showFaelights === true
    const hasAdditional = getState().additionalFaelights === true
    layer.toggleAttribute("data-additional", hasAdditional)
    layer.toggleAttribute("data-additional-visible", hasAdditional && isVisible)
    legend.hidden = !hasAdditional || !isVisible
    mountMapSwitch(
      additionalToggle,
      "Lumes adicionais",
      hasAdditional && isVisible,
      next => {
        if (getState().showFaelights !== true) return
        getState().additionalFaelights = next
        save()
        renderAdditional()
        onAvailabilityChange()
      },
      !isVisible,
    )
  }

  function renderToggle() {
    const isChecked = getState().showFaelights === true
    renderVisibility()
    fullLegend.hidden = !isChecked
    mountMapSwitch(toggle, "Mostrar Lumes Feéricos", isChecked, next => {
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
    preview(isPreviewed: boolean) {
      isPlacementPreview = isPreviewed
      renderVisibility()
    },
  }
}
