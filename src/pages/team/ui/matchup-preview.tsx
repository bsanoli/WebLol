// Peças das listas de composições da barra de confronto: a bolinha do lado e os retratos.
import type { DraftSide } from "../model/local-state"

/** Composição como aparece nas listas da barra: nome, prévia (HTML dos retratos) e campeões para a busca. */
export type MatchupItem = {
  id: string
  name: string
  title: string
  preview: string
  champions: string[]
  /** Lado salvo na comp, mostrado como bolinha azul ou vermelha antes dos retratos. */
  side: DraftSide
}

/** Bolinha do lado da composição, à esquerda dos retratos nas listas de escolha. */
export function SideMark({ side }: { side: DraftSide }) {
  const label = side === "blue" ? "Lado azul" : "Lado vermelho"
  return <span className={`side-dot ${side} comp-side-mark`} role="img" aria-label={label} title={label} />
}

export function Preview({ html }: { html: string }) {
  return html ? (
    <span className="mini matchup-preview" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span className="mini matchup-preview">
      <small>vazia</small>
    </span>
  )
}

/** Linha da lista de escolha: nome à esquerda; bolinha do lado e retratos à direita. */
export function MatchupOption({
  item,
  selected,
  onChoose,
}: {
  item: MatchupItem
  selected: boolean
  onChoose: (id: string) => void
}) {
  return (
    <button type="button" className="matchup-item" aria-pressed={selected} onClick={() => onChoose(item.id)}>
      <b title={item.title}>{item.title}</b>
      <span className="matchup-item-end">
        <SideMark side={item.side} />
        <Preview html={item.preview} />
      </span>
    </button>
  )
}
