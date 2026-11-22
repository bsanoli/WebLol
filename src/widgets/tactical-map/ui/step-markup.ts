import { iconMarkup } from "@/shared/ui/icon"
import type { Play, Step } from "./map-session"

type Escape = (text: string) => string

/** Opções do seletor de jogadas, com a contagem de passos como descrição. */
export const playOptionsMarkup = (plays: Play[], currentId: string, esc: Escape) =>
  plays
    .map(
      x =>
        `<option value="${x.id}"${x.id === currentId ? " selected" : ""} data-description="${x.steps.length} ${x.steps.length === 1 ? "passo" : "passos"}">${esc(x.name)}</option>`,
    )
    .join("")

/** Lista de passos da jogada; sem passos, só o espaço do estado vazio. */
export const stepListMarkup = (
  steps: Step[],
  selected: number,
  shouldHighlight: boolean,
  isEditable: boolean,
  esc: Escape,
) =>
  steps
    .map((step, index) => {
      const number = index + 1
      const isCurrent = index === selected
      const name = esc(step.label || `Passo ${number}`)
      return `<li data-i="${index}"${isCurrent ? ' class="on"' : ""}${isCurrent && shouldHighlight ? " data-step-highlight" : ""}>
      <button type="button" class="map-step-select" data-slot="button" data-variant="ghost" data-size="icon-sm" data-step-select="${index}" aria-label="Selecionar passo ${number}"${isCurrent ? ' aria-current="step"' : ""}>${number}</button>
      <input ${isEditable ? "" : "readonly"} data-slot="input" data-lab="${index}" value="${name}" aria-label="Nome do passo ${number}" title="Renomear passo">
      <button ${isEditable ? "" : "disabled"} data-slot="button" data-variant="destructive" data-size="icon-sm" data-sdel="${index}" aria-label="Apagar passo ${number}">${iconMarkup("close")}</button>
    </li>`
    })
    .join("") || '<li class="none" data-team-control></li>'

/** Ícone e mensagem da faixa de status sob a lista de passos. */
export function stepStatus({
  steps,
  sel,
  playing,
  edit,
}: {
  steps: Step[]
  sel: number
  playing: boolean
  edit: boolean
}) {
  if (playing) return { icon: "play", message: "Reproduzindo..." }
  if (edit) {
    const isEditing = Boolean(steps[sel])
    return {
      icon: "edit",
      message: isEditing
        ? `Editando o <b>passo ${sel + 1}</b>. <span class="ok">${iconMarkup("check")} salvo</span>`
        : "Selecione um passo para editar.",
    }
  }
  return { icon: "", message: steps.length ? "" : "Salve o mapa em <b>Novo passo</b>." }
}
