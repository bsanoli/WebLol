import { createRoot, type Root } from "react-dom/client"
import { TacticNotes, type TacticNotesProps } from "./TacticNotes"

export type { NoteChampion } from "./champion-mention"
export type { TacticNotesProps }

const roots = new WeakMap<Element, Root>()

/** Monta (ou atualiza) o bloco de notas. Trocar `key` recria o editor com o documento de outra tática. */
export function mountTacticNotes(host: HTMLElement, key: string, props: TacticNotesProps) {
  let root = roots.get(host)
  if (!root) {
    root = createRoot(host)
    roots.set(host, root)
  }
  root.render(<TacticNotes key={key} {...props} />)
}
