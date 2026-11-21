// Migração única para times (o time antigo vira o Fraldinha) e backup completo do banco para o admin.
import { dbDel, dbGet, dbList, dbSet, getJ } from "@/shared/firestore"
import { ADMINS } from "@/shared/config"
import { dispId, safeName } from "@/shared/lib/account-id"
import { unseal, verifyObj } from "@/shared/lib/admin-crypto"
import { parseOfficial } from "./external-data"
import { loadAdminKey } from "./membership"
import { session, type Official } from "./session"

const FIRST_TEAM = { id: "fraldinha", name: "Fraldinha", captainId: "brunoltz#LTZ" }
const legacyId = (id: string) => (id.includes("#") ? id : id.replace(/_([^_]*)$/, "#$1"))
const emptyOfficial = (): Official => ({
  version: 0,
  at: 0,
  data: { comps: [], plays: [], tactics: [], matchups: [] },
  log: [],
})

type TeamRow = { id: string; name: string; captain: string }

/** Devolve `true` se a migração rodou agora e `false` se já tinha sido feita. */
export async function migrateToTeams() {
  if (await dbGet("oficial", "migracao")) return false
  if (!session.admin) await loadAdminKey()
  const raw = await getJ("oficial", "dados")
  const old = (raw && session.admin ? await verifyObj(session.admin, raw) : null) as Official | null
  // usa o Fraldinha do capitão se ele já existir (ex.: criado à mão), senão cria
  const captain = safeName(FIRST_TEAM.captainId)
  const teams = (await dbList("times")) as unknown as TeamRow[]
  const own = teams.find(
    team => team.captain === captain && team.name.trim().toLowerCase() === FIRST_TEAM.name.toLowerCase(),
  )
  const teamId = own?.id || FIRST_TEAM.id
  if (!own)
    await dbSet("times", teamId, {
      name: FIRST_TEAM.name,
      captain,
      captainId: FIRST_TEAM.captainId,
      created: Date.now(),
    })
  const members = new Map<string, string>()
  for (const id of Object.keys(ADMINS)) members.set(safeName(id), dispId(id))
  for (const row of (await dbList("usuarios").catch(() => [])) as { user?: string }[])
    if (row.user) {
      const id = dispId(legacyId(row.user))
      members.set(safeName(id), id)
    }
  for (const [key, id] of members)
    if (!(await dbGet("membros", key)))
      await dbSet("membros", key, { team: teamId, status: "ativo", riotId: id, at: Date.now() })
  const official = old || emptyOfficial()
  const current = await dbGet(`times/${teamId}/dados`, "oficial")
  const parsedCurrent = current ? parseOfficial(current.json) : null
  if (current && !parsedCurrent) throw new Error("A versão oficial atual não pôde ser lida; nada foi alterado.")
  const currentData = parsedCurrent?.data ?? null
  if (!currentData || (!currentData.comps.length && !currentData.plays.length))
    await dbSet(`times/${teamId}/dados`, "oficial", {
      json: JSON.stringify({ ...official, label: official.label || "Versão inicial do time" }),
      at: Date.now(),
    })
  // envios antigos (criptografados para o admin) passam para a fila do capitão do Fraldinha
  if (session.keys) {
    const done = new Set((official.log || []).map(entry => entry.sid))
    for (const row of (await dbList("envios").catch(() => [])) as { id: string; enc: string }[]) {
      try {
        const sent = (await unseal(session.keys, JSON.parse(row.enc))) as { id: string; from: string; at: number }
        if (!done.has(sent.id))
          await dbSet(`times/${teamId}/envios`, sent.id, {
            from: safeName(sent.from),
            at: sent.at,
            json: JSON.stringify(sent),
          })
        await dbDel("envios", row.id)
      } catch {
        // envio ilegível: fica onde está para o admin conferir
      }
    }
  }
  await dbSet("oficial", "migracao", { team: teamId, at: Date.now() })
  return true
}

/** Baixa uma cópia completa de todos os times, para guardar na pasta Admin do OneDrive. */
export async function exportBackup() {
  const times = (await dbList("times")) as unknown as TeamRow[]
  const membros = await dbList("membros")
  const dados: Record<string, unknown> = {}
  for (const team of times) {
    const doc = await dbGet(`times/${team.id}/dados`, "oficial")
    dados[team.id] = doc ? JSON.parse(String(doc.json)) : null
  }
  const backup = { fmt: "lol-times-backup", at: Date.now(), admin: session.admin, times, membros, dados }
  const link = document.createElement("a")
  link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" }))
  link.download = `backup-times-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
}
