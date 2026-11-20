// Dados da aba Administração: envios, pedidos, jogadores e, para o admin, todas as contas e times.
import type { Change } from "@/shared/lib/team-changes"
import { dbDel, dbGet, dbList } from "@/shared/api/firestore"
import { ADMINS } from "@/shared/config/admins"
import { dispId, safeName } from "@/shared/lib/account-id"
import { parseOfficial, parseSubmission } from "./external-data"
import { teamPath } from "./identity"
import { session, type MemberRow, type Official, type Team } from "./session"

export type Submission = {
  id: string
  doc: string
  from: string
  at: number
  baseVersion: number
  changes: Change[]
}
/** Envio que não foi possível abrir (JSON quebrado). */
export type BrokenSubmission = { id: string; doc: string; from: string; isBroken: true }
export type AdminTeam = Team & { off: Official | null }
export type AdminUser = { key: string; riotId: string; hasAccount: boolean; isAdmin?: boolean; member?: MemberRow }

export type AdminData = {
  submissions: (Submission | BrokenSubmission)[]
  requests: MemberRow[]
  members: MemberRow[]
  teams: AdminTeam[]
  everyone: MemberRow[]
  users: AdminUser[]
}

type EnvelopeRow = { id: string; json?: string; from?: string }

async function readSubmissions(rows: EnvelopeRow[]) {
  const done = new Set((session.off?.log || []).map(entry => entry.sid))
  const found: (Submission | BrokenSubmission)[] = []
  for (const row of rows) {
    const parsed = parseSubmission(row.json)
    if (!parsed) {
      found.push({ id: row.id, doc: row.id, from: row.from || "", isBroken: true })
      continue
    }
    if (done.has(parsed.id)) {
      await dbDel(teamPath("envios"), row.id).catch(() => {})
      continue
    }
    found.push({ ...parsed, doc: row.id })
  }
  return found.sort((a, b) => ("at" in a ? a.at : 0) - ("at" in b ? b.at : 0))
}

async function readTeamVersion(team: Team): Promise<AdminTeam> {
  try {
    const doc = await dbGet(`times/${team.id}/dados`, "oficial")
    return { ...team, off: doc ? parseOfficial(doc.json) : null }
  } catch {
    return { ...team, off: null }
  }
}

/** Junta contas, registros de time e a lista fixa de admins numa linha por pessoa. */
function mergeUsers(accounts: { id: string; riotId?: string }[], everyone: MemberRow[]) {
  const users = new Map<string, AdminUser>()
  for (const account of accounts)
    users.set(account.id, { key: account.id, riotId: account.riotId || account.id, hasAccount: true })
  for (const member of everyone) {
    const user = users.get(member.id) || { key: member.id, riotId: member.riotId || member.id, hasAccount: false }
    user.member = member
    users.set(member.id, user)
  }
  for (const id of Object.keys(ADMINS)) {
    const key = safeName(id)
    users.set(key, { ...(users.get(key) || { key, riotId: dispId(id) }), hasAccount: true, isAdmin: true })
  }
  return [...users.values()].sort((a, b) => a.riotId.localeCompare(b.riotId))
}

export async function loadAdminData(isAdmin: boolean): Promise<AdminData> {
  const team = session.team
  let rows: EnvelopeRow[] = []
  let members: MemberRow[] = []
  if (team) {
    const [envelopes, teamMembers] = await Promise.all([dbList(teamPath("envios")), dbList("membros", "team", team.id)])
    rows = envelopes as unknown as EnvelopeRow[]
    members = teamMembers as unknown as MemberRow[]
  }
  let accounts: { id: string; riotId?: string }[] = []
  let teams: AdminTeam[] = []
  let everyone: MemberRow[] = []
  if (isAdmin) {
    const [allAccounts, allTeams, allMembers] = await Promise.all([
      dbList("contas"),
      dbList("times"),
      dbList("membros"),
    ])
    accounts = allAccounts as unknown as typeof accounts
    everyone = allMembers as unknown as MemberRow[]
    teams = await Promise.all((allTeams as unknown as Team[]).map(readTeamVersion))
    teams.sort((a, b) => a.name.localeCompare(b.name))
  }
  return {
    submissions: await readSubmissions(rows),
    requests: members.filter(member => member.status === "pendente"),
    members: members.filter(member => member.status === "ativo"),
    teams,
    everyone,
    users: mergeUsers(accounts, everyone),
  }
}
