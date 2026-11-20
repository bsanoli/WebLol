// Quem está usando o app: conta salva, "Ver como" do admin, papel no time e alterações pendentes.
import { diff, shared } from "@/shared/lib/team-changes"
import { currentFirebase, fb } from "@/shared/api/firestore"
import { ADMINS } from "@/shared/config/admins"
import { STORAGE_KEYS } from "@/shared/config/storage-keys"
import { adminEmail, isAdminId, playerEmail, safeName } from "@/shared/lib/account-id"
import { session, type Account, type PreviewMode } from "./session"

export const KEY = STORAGE_KEYS.teamAreaState
export const GKEY = STORAGE_KEYS.guestState
export const UKEY = STORAGE_KEYS.account
export const TKEY = STORAGE_KEYS.team
export const BKEY = STORAGE_KEYS.officialBaseline
export const SKEY = STORAGE_KEYS.lastSubmission
export const FPKEY = STORAGE_KEYS.adminKeyFingerprint
export const VKEY = STORAGE_KEYS.adminViewedTeam
export const PKEY = STORAGE_KEYS.previewAs
export const PBKEY = STORAGE_KEYS.previewBackup

export function lsGet<T = unknown>(key: string, fallback: T | null = null): T | null {
  try {
    const value = localStorage.getItem(key)
    return value == null ? fallback : (JSON.parse(value) as T)
  } catch {
    return fallback
  }
}
export function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sem espaço ou armazenamento bloqueado: o app segue sem salvar
  }
}

export const realUser = () => lsGet<Account>(UKEY)
/** "Ver como" só vale para admin. */
export const preview = (): PreviewMode => (realUser()?.admin ? (lsGet<PreviewMode>(PKEY) ?? "") : "")
export function user(): Account | null {
  const real = realUser()
  const mode = preview()
  if (mode === "guest") return null
  return mode === "user" || mode === "captain" ? ({ ...real, admin: false } as Account) : real
}
export const local = () => lsGet<Record<string, unknown>>(KEY)

const fbEmail = () => currentFirebase()?.auth.currentUser?.email || ""
export const isFirebaseAdmin = () => Object.values(ADMINS).includes(fbEmail())
export const meId = () => session.pendingId || user()?.id || ""
export const meKey = () => safeName(meId())
export const isSignedInAs = (id: string) =>
  !!fbEmail() && fbEmail() === (isAdminId(id) ? adminEmail(id) : playerEmail(id))

export async function fbAdminLogin(password: string) {
  const { auth, au } = await fb()
  const email = adminEmail(meId())
  if (!email) throw new Error("sem e-mail")
  if (auth.currentUser?.email === email) return
  await au.signInWithEmailAndPassword(auth, email, password)
}

/** Alterações da Área do time que ainda não estão na versão oficial. */
export function pending() {
  const base = lsGet<{ data: Parameters<typeof diff>[1] }>(BKEY)
  if (!base) return []
  return diff(shared(local() as Parameters<typeof shared>[0]), base.data)
}

// No "Ver como" capitão o admin enxerga como capitão do time aberto; no "Ver como" membro, como membro comum.
export const isCaptain = () =>
  !!session.team && (preview() === "captain" || (!preview() && session.team.captain === meKey()))
export const isAdminViewer = () => !!user()?.admin && isFirebaseAdmin()
export const canPublish = () => (!preview() && isCaptain()) || (!preview() && !!user()?.admin && isFirebaseAdmin())
export const teamPath = (sub: string) => {
  if (!session.team) throw new Error("Sem time ativo")
  return `times/${session.team.id}/${sub}`
}
