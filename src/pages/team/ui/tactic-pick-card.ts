// Card de pick compartilhado pelas visões Draft e Lane do quadro de Táticas (estilo em tactic-pick-card.css).
import type { DraftSide } from "../model/local-state"

export type PickCardOptions = {
  side: DraftSide
  /** Borda da barra do lado: `start` na borda inicial do card, `end` na final. */
  bar: "start" | "end"
  /** Classes próprias da visão (`pk mine`, `tx-pos-slot top`…). */
  className: string
  /** Atributos prontos (`data-l="top" style="…"`), já escapados. */
  attrs?: string
  /** Arte do campeão e conteúdo do card. */
  children: string
}

export function pickCardHTML({ side, bar, className, attrs = "", children }: PickCardOptions) {
  const modifiers = `tx-pick-card ${side === "red" ? "is-red" : "is-blue"} bar-${bar}`
  return `<div class="${modifiers} ${className}"${attrs ? ` ${attrs}` : ""}>${children}</div>`
}
