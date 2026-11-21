// Item da lista de confrontos de Táticas: os principais de cada lado espelhados, com o título no lugar do "x".
import { iconMarkup } from "@/shared/ui/icon"
import { compositionPreview, type Composition } from "../model/local-state"
import { matchupTitle, type MatchupEntry } from "../model/matchups"

type MatchupRowOptions = {
  on: boolean
  img: (name: string) => string
  esc: (value: unknown) => string
}

/** Retratos das cinco rotas; sem comp ou sem campeão, o espaço fica vazio e os dois lados continuam alinhados. */
function portraits(comp: Composition | null, img: (name: string) => string, reverse: boolean) {
  const names = comp ? compositionPreview(comp) : ["", "", "", "", ""]
  const cells = names.map(name => (name ? img(name) : '<span class="av av-empty" aria-hidden="true"></span>'))
  return (reverse ? cells.reverse() : cells).join("")
}

/** O lado azul fica à esquerda e o vermelho à direita; a rota de cada lado aponta para o centro, como na visão Lane. */
export function matchupRowHTML(entry: MatchupEntry, { on, img, esc }: MatchupRowOptions) {
  const { matchup } = entry
  const title = esc(matchupTitle(entry))
  const blueIsOurs = matchup.side === "blue"
  const left = blueIsOurs ? entry.ours : entry.enemy
  const right = blueIsOurs ? entry.enemy : entry.ours
  return `<div class="tx-mx-row"><button type="button" class="dz-tab tx-mx-item${on ? " on" : ""}" data-tactic-matchup="${esc(matchup.id)}" aria-pressed="${on}" title="${title} · nossa composição no lado ${blueIsOurs ? "azul" : "vermelho"}">
      <span class="tx-mx-vs"><span class="mini" aria-hidden="true">${portraits(left, img, false)}</span><b>${title}</b><span class="mini" aria-hidden="true">${portraits(right, img, true)}</span></span></button>
      <button type="button" class="tx-mx-del" data-matchup-delete="${esc(matchup.id)}" aria-label="Excluir o confronto ${title}" title="Excluir o confronto (as composições ficam)">${iconMarkup("trash")}</button></div>`
}
