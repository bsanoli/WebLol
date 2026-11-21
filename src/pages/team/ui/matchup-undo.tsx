import { Icon } from "./team-controls"

/** Desfazer fixo ao lado de "Trocar lados"; o clique é tratado por `[data-undo-last]` no editor. */
export function UndoButton({ visible }: { visible: boolean }) {
  return (
    <button
      type="button"
      className="matchup-undo"
      data-undo-last
      data-slot="button"
      data-variant="outline"
      data-size="sm"
      hidden={!visible}
      title="Desfazer a última mudança (Ctrl+Z)"
    >
      <Icon name="undo" /> Desfazer
    </button>
  )
}
