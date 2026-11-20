// Exportar e importar o backup da Área do time (`app: "lol-comps-time"`), no formato salvo.
import { askChoice } from "@/shared/ui/dialog-controls"
import { compositionFromSaved, compositionToSaved } from "../model/composition-storage"
import { settleOwner, setEnemyId } from "../model/composition-side"
import { blank, setChampions, uid } from "../model/local-state"
import { SLOT_LIST } from "../model/champion-slots"
import { addMatchup } from "../model/matchups"
import { normalizeOpggLink, setOpgg } from "../model/tactics"
import { $, plays, S, save, toast } from "./team-store"

type SavedPlay = { id?: string; live?: unknown; steps?: unknown }
type SavedMatchup = { id?: unknown; enemy?: unknown; updated?: unknown }
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
  const comps: unknown = data.comps || data
  if (!Array.isArray(comps)) throw new Error("Formato inválido")
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
  // Ao juntar, as comps ganham ids novos; a adversária de cada draft acompanha.
  for (const b of clean) if (b.draft?.enemyId) setEnemyId(b, ids.get(b.draft.enemyId) || null)
  // Confrontos (e as táticas deles) vão junto; ao juntar, ganham ids novos para não colidir.
  clean.forEach((b, i) => {
    const saved = comps[i] as SavedComposition
    const list: SavedMatchup[] = Array.isArray(saved.matchups) ? saved.matchups : []
    for (const m of list) {
      const enemy = ids.get(m?.enemy as string)
      if (!enemy) continue
      const made = addMatchup(b, enemy, Number(m.updated) || Date.now())
      if (replace && typeof m.id === "string") made.id = m.id
    }
  })
  S.comps = replace ? clean : [...clean, ...S.comps]
  S.cur = S.comps[0].id
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
