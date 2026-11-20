// Estado da conta e do time neste navegador. Antes eram variáveis globais dos scripts clássicos
// (`TEAM`, `MEMB`, `OFF`, `ADMIN`, `KEYS`, `pendingId`…); agora há um dono só.
import type { SharedData } from "@/shared/lib/team-changes"
import type { AdminKeys, AdminRecord } from "@/shared/lib/admin-crypto"

export type Account = { id: string; admin: boolean; created?: number; solo?: boolean }
export type PreviewMode = "" | "guest" | "user" | "captain"
export type Team = { id: string; name: string; captain: string; captainId?: string; viewing?: boolean }
export type Membership = { team: string; status: "ativo" | "pendente"; riotId?: string; at?: number; teamName?: string }
export type MemberRow = { id: string; status: "ativo" | "pendente"; riotId?: string; at?: number; team?: string }
/** Histórico de versões da interface, mostrado na Administração. */
export type UiVersion = { version: string; date: string; changes: string[] }
export type LogEntry = {
  v: number
  at: number
  sid: string
  from: string
  kind: "comp" | "play" | "tactic"
  op: "add" | "edit" | "del"
  id: string
  name: string
  h: string
  status: "approved" | "rejected"
}
/** Versão oficial do time: `times/{id}/dados/oficial`. */
export type Official = {
  version: number
  at: number
  label?: string
  by?: string
  data: SharedData
  log: LogEntry[]
}

export const session = {
  /** Registro de admin do banco (`oficial/admin`). */
  admin: null as AdminRecord | null,
  /** Chaves do admin já desbloqueadas neste aparelho. */
  keys: null as AdminKeys | null,
  off: null as Official | null,
  team: null as Team | null,
  memb: null as Membership | null,
  pendingId: null as string | null,
  teamsCache: null as Team[] | null,
  /** A última leitura do banco funcionou. */
  net: false,
  /** Fecha o diálogo de login aberto, se houver. */
  dismissLogin: undefined as (() => void) | undefined,
  currentScreen: undefined as string | undefined,
  currentFrame: undefined as string | undefined,
  /** Recarrega a Área do time (iframe `v-camp`) com a cópia local atual. */
  reloadCamp: () => {},
  uiVersions: [] as UiVersion[],
}
