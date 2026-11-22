// Descartar o rascunho: volta à versão sincronizada do time (ou aos dados iniciais) depois de oferecer uma cópia.
import { STORAGE_KEYS } from "@/shared/config"
import { askChoice } from "@/shared/ui/dialog-controls"
import { KEY } from "../model/local-state"
import { parseOfficialBaseline } from "../model/saved-data"
import { downloadTeamBackup } from "./team-backup"
import { $, S, toast } from "./team-store"

const idOf = (item: unknown) => (item as { id?: string } | undefined)?.id

export function mountLocalRestore() {
  $("#clear-local").onclick = async () => {
    let rawBase: string | null
    let base: ReturnType<typeof parseOfficialBaseline>
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
      "Descartar o rascunho?",
      `As alterações ainda não enviadas serão descartadas: as composições e jogadas deste navegador voltam para ${destination}. Envios para aprovação continuam na fila.`,
      [
        { value: "backup", label: "Baixar cópia" },
        { value: "restore", label: "Descartar", destructive: true },
      ],
    )
    if (choice === "backup") {
      downloadTeamBackup()
      return
    }
    if (choice !== "restore") return

    try {
      if (localStorage.getItem(STORAGE_KEYS.officialBaseline) !== rawBase) {
        toast("A versão do time mudou. Abra o descarte novamente.")
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
      toast("Não foi possível descartar o rascunho.")
      return
    }
    window.location.reload()
  }
}
