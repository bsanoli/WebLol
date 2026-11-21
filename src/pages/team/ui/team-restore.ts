// Restaurar os dados locais: volta à versão sincronizada do time (ou aos dados iniciais) depois de oferecer uma cópia.
import { STORAGE_KEYS } from "@/shared/config"
import { askChoice } from "@/shared/ui/dialog-controls"
import { KEY } from "../model/local-state"
import { parseOfficialBaseline } from "../model/saved-data"
import { downloadTeamBackup } from "./team-backup"
import { $, eventTarget, S, localSave, toast } from "./team-store"

const idOf = (item: unknown) => (item as { id?: string } | undefined)?.id

export function mountLocalRestore() {
  document.addEventListener("click", event => {
    if (!localSave.contains(eventTarget(event)) && !eventTarget(event).closest?.('[role="alertdialog"]')) {
      localSave.open = false
    }
  })
  localSave.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !localSave.open) return
    localSave.open = false
    localSave.querySelector("summary")?.focus()
  })

  $("#clear-local").onclick = async () => {
    let rawBase, base
    try {
      rawBase = localStorage.getItem(STORAGE_KEYS.officialBaseline)
      base = parseOfficialBaseline(rawBase)
      if (base === undefined) throw new Error("Base inválida")
    } catch {
      toast("Não foi possível ler a versão salva do time.")
      return
    }

    const destination = base ? `a versão sincronizada do time (v${base.version})` : "os dados iniciais do site"
    const choice = await askChoice(
      "Restaurar dados locais?",
      `As composições e jogadas deste navegador serão substituídas por ${destination}. Envios para aprovação continuam na fila.`,
      [
        { value: "backup", label: "Baixar cópia" },
        { value: "restore", label: "Restaurar", destructive: true },
      ],
    )
    if (choice === "backup") {
      downloadTeamBackup()
      return
    }
    if (choice !== "restore") return

    try {
      if (localStorage.getItem(STORAGE_KEYS.officialBaseline) !== rawBase) {
        toast("A versão do time mudou. Abra a restauração novamente.")
        return
      }
      if (base) {
        const { comps, plays } = base.data
        const matchups = Array.isArray(base.data.matchups) ? base.data.matchups : []
        const tactics = Array.isArray(base.data.tactics) ? base.data.tactics : []
        localStorage.setItem(
          KEY,
          JSON.stringify({
            comps,
            plays,
            tactics,
            matchups,
            view: S.view,
            cur: idOf(comps.find(comp => idOf(comp) === S.cur)) ?? idOf(comps[0]),
            curPlay: idOf(plays.find(play => idOf(play) === S.curPlay)) ?? idOf(plays[0]),
          }),
        )
      } else {
        localStorage.removeItem(KEY)
      }
    } catch {
      toast("Não foi possível restaurar os dados locais.")
      return
    }
    window.location.reload()
  }
}
