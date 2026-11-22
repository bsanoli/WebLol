import { isEmbedded, navigateHost } from "@/shared/host-bridge"
import { DATASET } from "@/shared/dataset"

/** Troca entre Worlds e SoloQ mantendo a ficha aberta: `pathFor` monta a rota da outra fonte. */
export function switchBuildSource(event: Event, pathFor: (source: string) => string) {
  const source = (event.target as Element).closest<HTMLElement>("[data-build-source]")?.dataset.buildSource
  if (!source || source === DATASET.source) return
  const path = pathFor(source)
  if (isEmbedded()) navigateHost({ path, focusSource: true })
  else location.assign(`./#${path}`)
}
