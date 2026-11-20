// Em que time a conta está e as chaves do admin. Coleções e campos do Firestore não mudam.
import { dbGet, getJ, putJ } from "@/shared/api/firestore"
import { ADMIN_FP } from "@/shared/config/admins"
import { normId } from "@/shared/lib/account-id"
import { fingerprint, type makeSlot, unlockAdmin, type AdminRecord } from "@/shared/lib/admin-crypto"
import {
  BKEY,
  FPKEY,
  isAdminViewer,
  KEY,
  fbAdminLogin,
  lsGet,
  lsSet,
  meId,
  meKey,
  preview,
  realUser,
  SKEY,
  TKEY,
  UKEY,
  user,
  VKEY,
} from "./identity"
import { session, type Membership, type Team } from "./session"

/** Lê em que time a conta está; `session.team` só fica preenchido quando ela já foi aceita. */
export async function loadMembership() {
  const memb = (await dbGet("membros", meKey())) as Membership | null
  session.memb = memb
  const team = memb ? ((await dbGet("times", memb.team)) as Omit<Team, "id"> | null) : null
  if (memb && team) memb.teamName = team.name
  session.team = memb?.status === "ativo" && team ? { id: memb.team, ...team } : null
  // O admin pode olhar outro time (escolhido no menu da conta).
  const view = isAdminViewer() ? lsGet<string>(VKEY) : null
  if (view && view !== session.team?.id) {
    const other = (await dbGet("times", view)) as Omit<Team, "id"> | null
    if (other) session.team = { id: view, ...other, viewing: true }
    else localStorage.removeItem(VKEY)
  } else if (!isAdminViewer()) localStorage.removeItem(VKEY)
  const real = realUser()
  if (session.team && real?.solo) lsSet(UKEY, { ...real, solo: false })
  guardTeam()
}

/** As comps de um time não vazam para outro: ao trocar de time (ou de usuário) a cópia local é apagada. */
export function guardTeam() {
  const want = preview() === "guest" ? "__guest__" : user()?.solo ? "__solo__" : session.team?.id || null
  if (lsGet(TKEY) === want) return
  for (const key of [KEY, BKEY, SKEY]) localStorage.removeItem(key)
  lsSet(TKEY, want)
  session.off = null
  session.reloadCamp()
}

export function clearTeamData() {
  for (const key of [KEY, BKEY, SKEY, TKEY, VKEY]) localStorage.removeItem(key)
  session.off = null
  session.team = null
  session.memb = null
  session.teamsCache = null
}

/** Carrega a chave do admin do banco. Devolve `""` se está certa, `"noadmin"` se não existe e `"fp"` se não é a original. */
export async function loadAdminKey() {
  session.admin = await getJ("oficial", "admin")
  if (!session.admin) return "noadmin"
  const fp = await fingerprint(session.admin)
  const pin = lsGet<string>(FPKEY)
  if ((ADMIN_FP && fp !== ADMIN_FP) || (pin && pin !== fp)) {
    session.admin = null
    return "fp"
  }
  lsSet(FPKEY, fp)
  return ""
}

/** Desbloqueia as chaves do admin e entra no banco como admin (mesma senha; se a do banco for outra, usa `firebasePassword`). */
export async function adminUnlock(password: string, firebasePassword?: string) {
  if (!session.admin) throw new Error("noadmin")
  const keys = await unlockAdmin(session.admin, password, meId())
  try {
    await fbAdminLogin(firebasePassword || password)
  } catch {
    const error = new Error("fb") as Error & { keys?: typeof keys }
    error.keys = keys
    throw error
  }
  return keys
}

/** Grava (ou remove, com `slot` nulo) a fechadura de um admin no `admin.json` do banco. */
export async function setSlot(id: string, slot: Awaited<ReturnType<typeof makeSlot>> | null) {
  const current = (await getJ("oficial", "admin")) as AdminRecord | null
  if (!current || !session.admin || (await fingerprint(current)) !== (await fingerprint(session.admin)))
    throw new Error("chave do admin no banco mudou")
  if (normId(id) === normId(current.id)) throw new Error("o admin principal não pode ser alterado aqui")
  const slots = { ...current.slots }
  if (slot) slots[normId(id)] = slot
  else delete slots[normId(id)]
  current.slots = slots
  await putJ("oficial", "admin", current)
  session.admin = current
}
