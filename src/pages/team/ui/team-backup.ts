// Exportar e importar o backup da Área do time (`app: "lol-comps-time"`), no formato salvo.
import { askChoice } from "@/shared/ui/dialog-controls"
import { compositionFromSaved, compositionToSaved } from "../model/composition-storage"
import { settleOwner } from "../model/composition-side"
import { blank, setChampions, uid } from "../model/local-state"
import { SLOT_LIST } from "../model/champion-slots"
import { sanitizeMatchups, type Matchup } from "../model/matchups"
import { withOwnMatchups } from "@/shared/lib/team-changes"
import { normalizeOpggLink, setOpgg } from "../model/tactics"
import { $, plays, S, save, toast } from "./team-store"

type SavedPlay = { id?: string; live?: unknown; steps?: unknown }
type SavedComposition = Record<string, any>

export function downloadTeamBackup() {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          app: "lol-comps-time",
          version: 1,
          exported: new Date().toISOString(),
          comps: S.comps.map(compositionToSaved),
          matchups: S.matchups,
          plays: S.plays,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  )
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `comps-time-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

const asNames = (list: unknown) => (Array.isArray(list) ? list.map(String) : [])

async function importTeamBackup(file: File, afterImport: () => void) {
  const data = JSON.parse(await file.text())
  const rawComps: unknown = data.comps || data
  if (!Array.isArray(rawComps)) throw new Error("Formato inválido")
  // Backups antigos guardam os confrontos dentro da comp; a migração os leva para a lista própria.
  const migrated = withOwnMatchups({ comps: rawComps, matchups: Array.isArray(data.matchups) ? data.matchups : [] })
  const comps = migrated.comps
  if (!comps.length) throw new Error("Arquivo sem composições")
  const choice = await askChoice(
    "Importar composições",
    `O arquivo contém ${comps.length} composições. Escolha o que fazer com os dados atuais.`,
    [
      { value: "merge", label: "Juntar" },
      { value: "replace", label: "Substituir", destructive: true },
    ],
  )
  if (!choice) return
  const replace = choice === "replace"
  const ids = new Map<string, string>()
  const clean = comps.map(saved => {
    const c = compositionFromSaved(saved) as SavedComposition
    const b = blank(c.name)
    b.notes = c.notes || ""
    b.laneNotes = c.laneNotes || {}
    if (c.draft) b.draft = c.draft
    b.updated = c.updated || Date.now()
    for (const slot of SLOT_LIST) setChampions(b, slot.k, asNames(slot.k === "ban" ? c.bans : c.lanes?.[slot.k]))
    b.id = replace ? c.id || b.id : b.id
    if (c.id) ids.set(c.id, b.id)
    if (c.owner === "enemy" || c.owner === "ours" || c.tacticTeam === "enemy")
      settleOwner(b, c.owner === "ours" ? "ours" : "enemy")
    if (typeof c.opgg === "string" && c.opgg) setOpgg(b, normalizeOpggLink(c.opgg) || "")
    return b
  })
  // Confrontos acompanham as comps; ao juntar, comps e confrontos ganham ids novos para não colidir.
  const importedMatchups: Matchup[] = sanitizeMatchups(migrated.matchups)
    .map(m => {
      const made: Matchup = { ...m, id: replace ? m.id : uid() }
      const ours = m.ours && ids.get(m.ours),
        enemy = m.enemy && ids.get(m.enemy)
      if (ours) made.ours = ours
      else delete made.ours
      if (enemy) made.enemy = enemy
      else delete made.enemy
      return made
    })
    .filter(m => m.ours || m.enemy)
  S.matchups = replace ? importedMatchups : [...importedMatchups, ...S.matchups]
  S.comps = replace ? clean : [...clean, ...S.comps]
  S.cur = S.comps[0].id
  S.curMatchup = null
  if (Array.isArray(data.plays)) {
    const imported = (data.plays as SavedPlay[])
      .filter(p => p && p.live && Array.isArray(p.steps))
      .map(p => ({ ...p, id: replace ? p.id || uid() : uid() }))
    S.plays = replace ? imported : [...plays(), ...imported]
    plays()
  }
  afterImport()
  save()
  toast(`${clean.length} comp(s) importada(s)`)
}

/** Liga os botões Exportar e Importar. `afterImport` redesenha a aba aberta e publica a rota. */
export function mountTeamBackup({ afterImport }: { afterImport: () => void }) {
  const input = $<HTMLInputElement>("#imp")
  $("#exp").onclick = downloadTeamBackup
  $("#impb").onclick = () => input.click()
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      await importTeamBackup(file, afterImport)
    } catch {
      toast("Arquivo inválido. Use um .json exportado por esta página.")
    } finally {
      input.value = ""
    }
  }
}
