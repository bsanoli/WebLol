// Aba "Gestão do time" da Área do time: pedidos, jogadores e histórico das versões oficiais.
import { KN, OPN } from "@/shared/lib/team-changes"
import { dbDel, dbList, dbSet } from "@/shared/api/firestore"
import { esc, fmtD, toast } from "@/shared/lib/dom"
import { confirmAction } from "@/shared/ui/dialog-controls"
import { isCaptain, isFirebaseAdmin, preview, user } from "../model/identity"
import { session, type LogEntry, type MemberRow, type Official } from "../model/session"
import { decorateManagementTables } from "./table-slots"
import { readOfficial } from "../model/sync"

/** Todo membro ativo do time vê a aba; só o capitão (ou admin desbloqueado) aceita pedidos e exclui jogadores. */
export const TEAM_NAME = () => session.team?.name || ""
export const captainAccess = () => !!session.team && !!user() && !user()?.solo
export const canManageTeam = () =>
  !!session.team && (isCaptain() || (!preview() && !!user()?.admin && isFirebaseAdmin()))

const logRow = (entry: LogEntry) =>
  `<tr><td>${esc(entry.from)}</td><td><span data-slot="badge" class="op ${entry.op}">${OPN[entry.op]}</span> ${KN[entry.kind]} ${esc(entry.name)}</td><td class="${entry.status === "approved" ? "ok" : "bad"}">${entry.status === "approved" ? "aprovada" : "recusada"}</td></tr>`

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

function versionsHtml(official: Official) {
  const byVersion = new Map<number, LogEntry[]>()
  for (const entry of official.log || []) byVersion.set(entry.v, [...(byVersion.get(entry.v) || []), entry])
  const versions = [...byVersion.keys()].sort((a, b) => b - a)
  if (!byVersion.has(official.version)) versions.unshift(official.version)
  const html = versions
    .map(version => {
      const entries = byVersion.get(version) || []
      const isCurrent = version === official.version
      const at = isCurrent ? official.at : entries[0]?.at
      const approved = entries.filter(entry => entry.status === "approved").length
      const rejected = entries.length - approved
      const meta = [
        at ? fmtD(at) : "",
        isCurrent && official.by ? `por ${esc(official.by)}` : "",
        isCurrent && official.label ? esc(official.label) : "",
        `${approved} ${plural(approved, "aprovada", "aprovadas")}${rejected ? `, ${rejected} ${plural(rejected, "recusada", "recusadas")}` : ""}`,
      ]
        .filter(Boolean)
        .join(" · ")
      return `<details class="cap-ver"><summary><b>v${version}</b>${isCurrent ? ' <span class="ok">atual</span>' : ""} <span class="mut">${meta}</span></summary>
     ${entries.length ? `<table data-slot="table"><tr><th>De</th><th>O quê</th><th>Status</th></tr>${entries.map(logRow).join("")}</table>` : '<p class="mut">Sem alterações registradas nesta versão.</p>'}</details>`
    })
    .join("")
  return { count: versions.length, html }
}

function requestsHtml(requests: MemberRow[]) {
  if (!requests.length) return '<span class="mut">Nenhum pedido pendente.</span>'
  const rows = requests
    .map(
      member =>
        `<tr><td>${esc(member.riotId || member.id)}</td><td>${member.at ? fmtD(member.at) : "Não informado"}</td><td class="cap-act"><button data-slot="button" data-variant="default" data-acc="${esc(member.id)}" aria-label="Aceitar pedido de ${esc(member.riotId || member.id)}">Aceitar</button> <button data-slot="button" data-variant="destructive" data-den="${esc(member.id)}" aria-label="Recusar pedido de ${esc(member.riotId || member.id)}">Recusar</button></td></tr>`,
    )
    .join("")
  return `<table data-slot="table"><tr><th>Riot ID</th><th>Pedido em</th><th></th></tr>${rows}</table>`
}

function playersHtml(players: MemberRow[], captainKey: string, isManager: boolean) {
  const rows =
    players
      .map(
        member =>
          `<tr><td>${esc(member.riotId || member.id)}</td><td>${member.id === captainKey ? "capitão" : "membro"}</td><td class="cap-since">${member.at ? fmtD(member.at) : "Não informado"}</td>${isManager ? `<td class="cap-act">${member.id === captainKey ? "" : `<button data-slot="button" data-variant="destructive" data-rm="${esc(member.id)}">Retirar do time</button>`}</td>` : ""}</tr>`,
      )
      .join("") || `<tr><td colspan="${isManager ? 4 : 3}" class="mut">Nenhum jogador ainda.</td></tr>`
  return `<table data-slot="table"><tr><th>Riot ID</th><th>Papel</th><th class="cap-since">No time desde</th>${isManager ? "<th></th>" : ""}</tr>${rows}</table>`
}

function historyHtml(official: Official | null) {
  if (!official) return '<span class="mut">O time ainda não tem versão oficial.</span>'
  const comps = official.data?.comps?.length || 0
  const plays = official.data?.plays?.length || 0
  const versions = versionsHtml(official)
  return `<p>Versão oficial atual: <b>v${official.version}</b> <span class="mut">· ${comps} ${plural(comps, "comp", "comps")} · ${plays} ${plural(plays, "jogada", "jogadas")}${official.at ? ` · ${fmtD(official.at)}` : ""}${official.by ? ` · por ${esc(official.by)}` : ""}</span></p>
    <details class="cap-hist"><summary>Ver o histórico inteiro (${versions.count} ${plural(versions.count, "versão", "versões")})</summary>${versions.html}</details>`
}

/** Ações do capitão: aceitar, recusar e retirar. Cada uma recarrega o painel. */
function bindActions(region: HTMLElement, members: MemberRow[], teamName: string) {
  const again = () => void renderCaptainPanel(region)
  const who = (id: string) => members.find(member => member.id === id)?.riotId || id
  const bind = (attribute: string, handle: (id: string) => Promise<"done" | "cancelled">) => {
    for (const button of region.querySelectorAll<HTMLButtonElement>(`[${attribute}]`))
      button.onclick = async () => {
        const id = button.getAttribute(attribute) || ""
        button.disabled = true
        const result = await handle(id)
        if (result === "cancelled") {
          button.disabled = false
          return
        }
        again()
      }
  }
  const attempt = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action()
      toast(message)
    } catch (error) {
      toast(`Erro: ${(error as Error).message}`)
    }
  }
  bind("data-acc", async id => {
    await attempt(
      () => dbSet("membros", id, { status: "ativo", at: Date.now() }, true),
      `${who(id)} entrou no ${teamName}`,
    )
    return "done"
  })
  bind("data-den", async id => {
    if (!(await confirmAction(`Recusar o pedido de ${who(id)}?`))) return "cancelled"
    await attempt(() => dbDel("membros", id), "Pedido recusado")
    return "done"
  })
  bind("data-rm", async id => {
    if (!(await confirmAction(`Retirar ${who(id)} do ${teamName}? O jogador perde o acesso às composições do time.`)))
      return "cancelled"
    await attempt(() => dbDel("membros", id), `${who(id)} saiu do time`)
    return "done"
  })
}

export async function renderCaptainPanel(region: HTMLElement | null) {
  if (!region) return
  if (!captainAccess()) {
    region.innerHTML = `<div class="wl-panel card">Entre em um time para ver os jogadores e o histórico.</div>`
    return
  }
  const team = session.team
  if (!team) return
  const isManager = canManageTeam()
  const isLocked = !!preview()
  region.innerHTML = `<p class="mut" role="status">Carregando…</p>`
  let loadError = ""
  const [rows, read] = await Promise.all([
    dbList("membros", "team", team.id).catch((error: Error) => {
      loadError = error.message
      return []
    }),
    readOfficial().catch(() => ({ off: undefined })),
  ])
  if (session.team !== team) return
  const members = rows as unknown as MemberRow[]
  const official = ("off" in read && read.off) || session.off
  const requests = members.filter(member => member.status === "pendente").sort((a, b) => (a.at || 0) - (b.at || 0))
  const players = members
    .filter(member => member.status === "ativo")
    .sort(
      (a, b) =>
        Number(b.id === team.captain) - Number(a.id === team.captain) ||
        String(a.riotId || a.id).localeCompare(String(b.riotId || b.id)),
    )
  const captainName = players.find(member => member.id === team.captain)?.riotId || team.captainId || team.captain
  const lockedNote = isLocked
    ? `<div class="wl-panel card mut cap-note">Você está vendo como ${isManager ? "capitão" : "membro"} do ${esc(team.name)}. ${isManager ? "Os botões ficam desativados nesta visão." : ""}</div>`
    : ""
  const people = loadError
    ? '<p data-slot="alert" role="alert" class="bad">Não foi possível carregar os pedidos e jogadores. Reabra Gestão do time para tentar novamente.</p>'
    : `${isManager ? `<h2>Pedidos para entrar (${requests.length})</h2><div class="wl-panel card">${requestsHtml(requests)}</div>` : ""}
   <h2>Jogadores do time (${players.length})</h2>
   <div class="wl-panel card">${isManager ? "" : `<p class="mut">Capitão: ${esc(captainName)}. Só o capitão aceita pedidos e tira jogadores do time.</p>`}${playersHtml(players, team.captain, isManager)}</div>`
  region.innerHTML = `${lockedNote}${people}
   <h2>Histórico das comps</h2>
   <div class="wl-panel card">${historyHtml(official || null)}</div>`
  decorateManagementTables(region)
  if (isLocked) {
    for (const button of region.querySelectorAll<HTMLButtonElement>("[data-acc],[data-den],[data-rm]"))
      button.disabled = true
    return
  }
  if (isManager) bindActions(region, members, team.name)
}
