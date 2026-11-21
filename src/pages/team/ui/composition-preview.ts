import { compositionPreview } from "../model/local-state"
import type { Composition } from "../model/local-state"

/** Retratos das cinco lanes em posições fixas: uma lane sem campeão deixa o espaço vazio, sem deslocar as outras. */
export function compositionPreviewHTML(composition: Composition, img: (name: string) => string) {
  const names = compositionPreview(composition)
  if (!names.some(Boolean)) return ""
  return names.map(name => (name ? img(name) : '<span class="av av-empty" aria-hidden="true"></span>')).join("")
}
