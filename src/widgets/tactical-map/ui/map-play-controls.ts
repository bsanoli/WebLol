import { blankPlay } from "@/entities/tactical-play"
import { $ } from "@/shared/lib/dom"
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import type { MapRuntime } from "./map-runtime"
import type { MapDeps, Play } from "./map-session"

/** Seletor de jogadas e os botões de criar, renomear e excluir jogada. */
export function mountMapPlayControls(
  { session: M, state, plays, play, save, layers, actions }: MapRuntime,
  { uid, publishTeamRoute }: Pick<MapDeps<never>, "uid" | "publishTeamRoute">,
) {
  const newPlay = (name?: string) => blankPlay(uid, name) as unknown as Play
  $("#psel").onchange = () => {
    actions.stopPlayback()
    state().curPlay = $<HTMLSelectElement>("#psel").value
    M.sel = -1
    layers.wardLayer.clearSelection()
    layers.drawing.reset()
    save(false)
    actions.renderPlays()
    publishTeamRoute("map")
  }
  $("#pnew").onclick = async () => {
    const n = await askName("Nova jogada", `Jogada ${plays().length + 1}`)
    if (n === undefined) return
    const p = newPlay(n || undefined)
    state().plays.push(p)
    state().curPlay = p.id
    M.sel = -1
    save()
    actions.renderPlays()
    publishTeamRoute("map")
  }
  $("#pren").onclick = async () => {
    const p = play(),
      n = await askName("Renomear jogada", p.name)
    if (!n) return
    p.name = n
    save()
    actions.renderPlays()
  }
  $("#pdel").onclick = async () => {
    const p = play()
    if (!(await confirmAction(`Excluir a jogada "${p.name}"?`, "Excluir jogada"))) return
    state().plays = state().plays.filter(x => x.id !== p.id)
    plays()
    M.sel = -1
    save()
    actions.renderPlays()
    publishTeamRoute("map")
  }
}
