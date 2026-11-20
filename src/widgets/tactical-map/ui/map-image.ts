import { $ } from "@/shared/lib/dom"
import type { MapDeps, MapComposition } from "./map-session"

type MapImageDeps = {
  getState: () => { useImg?: boolean }
  save: (render?: boolean) => void
  mountMapSwitch: MapDeps<MapComposition>["mountMapSwitch"]
  onChange: () => void
}

/** Liga o mapa realista de fundo e a chave "Usar mapa realista". */
export function mountMapImage({ getState, save, mountMapSwitch, onChange }: MapImageDeps) {
  const image = $<HTMLImageElement>("#mapimg")
  const sync = () => {
    image.toggleAttribute("data-map-visible", getState().useImg !== false && image.complete && image.naturalWidth > 0)
    onChange()
  }
  const apply = () => {
    if (getState().useImg !== false) {
      const source = "assets/lol/map/summoners-rift-realista.jpeg"
      image.onload = sync
      image.onerror = sync
      if (image.getAttribute("src") !== source) image.src = source
    }
    sync()
  }
  const renderSwitch = () =>
    mountMapSwitch($("#map-image-control"), "Usar mapa realista", getState().useImg !== false, checked => {
      getState().useImg = checked
      save(false)
      apply()
      renderSwitch()
    })
  renderSwitch()
  apply()
}
