// HTML da aba Administração: a parte do capitão (envios e pedidos) e a parte só do admin.
import { describe, itemName, KN, OPN, type Change } from "@/shared/lib/team-changes"
import { ADMINS } from "@/shared/config"
import { dispId, normId } from "@/shared/lib/account-id"
import { slotOf } from "@/shared/lib/admin-crypto"
import { esc, fmtD } from "@/shared/lib/dom"
import type { AdminData, AdminTeam, AdminUser, BrokenSubmission, Submission } from "../model/admin-data"
import { meKey } from "../model/identity"
import { session, type Account } from "../model/session"

const details = (title: string, body: string, isOpen = false) =>
  `<details class="wl-panel card"${isOpen ? " open" : ""}><summary>${title}</summary><div>${body}</div></details>`

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)
const GOLD = "color:var(--gold)"

const changeLine = (change: Change) =>
  `<span data-slot="badge" class="op ${change.op}">${OPN[change.op]}</span> ${KN[change.kind]} <b>${esc(itemName(change))}</b><div class="det">${describe(change)}</div>`

function submissionHtml(sent: Submission | BrokenSubmission, index: number) {
  if ("isBroken" in sent)
    return `<div class="wl-panel card"><span class="bad">Não consegui abrir o envio ${esc(sent.id)} de ${esc(sent.from)}.</span> <button data-slot="button" data-variant="destructive" data-delf="${index}">Apagar envio</button></div>`
  const official = session.off
  const outdated =
    official && sent.baseVersion < official.version
      ? ` <span style="${GOLD}">(versão oficial agora é v${official.version})</span>`
      : ""
  const lines = sent.changes
    .map(
      (change, changeIndex) =>
        `<label class="chg"><input type="checkbox" data-s="${index}" data-c="${changeIndex}" checked><div>${changeLine(change)}</div></label>`,
    )
    .join("")
  return `
    <div class="wl-panel card"><div class="hd"><b>${esc(sent.from)}</b><span class="mut">${fmtD(sent.at)} · baseado na v${sent.baseVersion}${outdated}</span></div>
     ${lines}
     <div class="btns"><button data-slot="button" data-variant="default" data-ap="${index}">✓ Aprovar marcadas</button><button data-slot="button" data-variant="destructive" data-rj="${index}">✕ Recusar tudo</button></div></div>`
}

function requestsTable(data: AdminData) {
  if (!data.requests.length) return '<span class="mut">Nenhum pedido pendente.</span>'
  const rows = data.requests
    .map(
      member =>
        `<tr><td>${esc(member.riotId || member.id)}</td><td>${member.at ? fmtD(member.at) : ""}</td><td><button data-slot="button" data-variant="default" data-acc="${esc(member.id)}">Aceitar</button> <button data-slot="button" data-variant="destructive" data-den="${esc(member.id)}">Recusar</button></td></tr>`,
    )
    .join("")
  return `<table data-slot="table"><tr><th>Riot ID</th><th>Pedido em</th><th></th></tr>${rows}</table>`
}

function historyTable() {
  const rows =
    [...(session.off?.log || [])]
      .reverse()
      .slice(0, 150)
      .map(
        entry =>
          `<tr><td>v${entry.v}</td><td>${fmtD(entry.at)}</td><td>${esc(entry.from)}</td><td><span data-slot="badge" class="op ${entry.op}">${OPN[entry.op]}</span> ${KN[entry.kind]} ${esc(entry.name)}</td><td class="${entry.status === "approved" ? "ok" : "bad"}">${entry.status === "approved" ? "aprovada" : "recusada"}</td></tr>`,
      )
      .join("") || '<tr><td colspan="5" class="mut">Ainda sem histórico.</td></tr>'
  return `<table data-slot="table"><tr><th>Versão</th><th>Data</th><th>De</th><th>O quê</th><th>Status</th></tr>${rows}</table>`
}

/** Envios, pedidos e alterações do capitão no time dele. */
export function teamSectionHtml(data: AdminData, mine: Change[]) {
  const team = session.team
  if (!team)
    return `<div class="wl-panel card mut">Você não está em um time. Os envios e pedidos aparecem aqui quando você for capitão de um time.</div>`
  const name = esc(team.name)
  const members = data.members
    .map(
      member =>
        `<tr><td>${esc(member.riotId || member.id)}</td><td>${member.id === team.captain ? "capitão" : "membro"}</td><td>${member.id === team.captain ? "" : `<button data-slot="button" data-variant="destructive" data-den="${esc(member.id)}">Tirar do time</button>`}</td></tr>`,
    )
    .join("")
  const mineHtml = mine.length
    ? `${mine.map(change => `<div class="chg"><div>${changeLine(change)}</div></div>`).join("")}<div class="btns"><button data-slot="button" data-variant="default" id="pubmine">Publicar como nova versão</button></div>`
    : '<span class="mut">Você não tem alterações locais além da versão oficial.</span>'
  return `
   <h2>Pedidos para entrar no ${name} (${data.requests.length})</h2>
   <div class="wl-panel card">${requestsTable(data)}</div>
   <h2>Envios aguardando aprovação (${data.submissions.length})</h2>
   ${data.submissions.length ? data.submissions.map(submissionHtml).join("") : '<div class="wl-panel card mut">Nenhum envio pendente.</div>'}
   <h2>Minhas alterações</h2>
   <div class="wl-panel card">${mineHtml}</div>
   ${details(`Membros do ${name} (${data.members.length})`, `<table data-slot="table"><tr><th>Riot ID</th><th>Papel</th><th></th></tr>${members}</table>`)}
   ${details(`Histórico da versão oficial do ${name} (v${session.off?.version ?? "-"})`, historyTable())}`
}

function userStatus(user: AdminUser, team: AdminTeam | undefined) {
  if (!user.hasAccount) return '<span class="mut">ainda não criou a senha</span>'
  if (user.member?.status === "pendente") return `<span style="${GOLD}">pedido pendente</span>`
  if (team && team.captain === user.key) return "capitão"
  return user.member ? "membro" : '<span class="mut">sem time</span>'
}

function usersTable(data: AdminData) {
  const byId = new Map(data.teams.map(team => [team.id, team]))
  const options = (selected: string) =>
    `<option value="">Sem time</option>${data.teams.map(team => `<option value="${esc(team.id)}"${team.id === selected ? " selected" : ""}>${esc(team.name)}</option>`).join("")}`
  const rows =
    data.users
      .map(user => {
        const team = user.member?.team ? byId.get(user.member.team) : undefined
        const isCaptain = !!team && team.captain === user.key
        const lock = isCaptain ? ' disabled title="Capitão: troque o capitão do time antes"' : ""
        const action =
          user.isAdmin || user.key === meKey()
            ? ""
            : `<button data-slot="button" data-variant="destructive" data-delu="${esc(user.key)}">Excluir</button>`
        return `<tr><td>${esc(user.riotId)}${user.isAdmin ? ' <small class="mut">admin</small>' : ""}</td><td><select data-slot="select" data-team="${esc(user.key)}" aria-label="Time de ${esc(user.riotId)}"${lock}>${options(user.member?.team || "")}</select></td><td>${userStatus(user, team)}</td><td>${action}</td></tr>`
      })
      .join("") || '<tr><td colspan="4" class="mut">Nenhum usuário ainda.</td></tr>'
  return `<table data-slot="table"><tr><th>Riot ID</th><th>Time</th><th>Situação</th><th></th></tr>${rows}</table>
    <p class="mut">Excluir tira o usuário do time e apaga o cadastro dele. Se ele entrar de novo, volta sem time e precisa ser aceito outra vez.</p>`
}

function teamsTable(data: AdminData) {
  const rows = data.teams
    .map(team => {
      const official = team.off
      const comps = official?.data?.comps?.length || 0
      const active = data.everyone.filter(member => member.team === team.id && member.status === "ativo").length
      const version = official
        ? `<b>v${official.version}</b> <span class="mut">· ${comps} ${plural(comps, "comp", "comps")}${official.at ? ` · ${fmtD(official.at)}` : ""}${official.by ? ` · por ${esc(official.by)}` : ""}</span>`
        : '<span class="mut">sem versão ainda</span>'
      return `<tr><td>${esc(team.name)}</td><td>${esc(team.captainId || team.captain)}</td><td>${active}</td><td>${version}</td></tr>`
    })
    .join("")
  return `<table data-slot="table"><tr><th>Time</th><th>Capitão</th><th>Membros</th><th>Versão das comps</th></tr>${rows}</table>`
}

function adminsTable(account: Account) {
  const record = session.admin
  const rows = Object.entries(ADMINS)
    .map(([id, email]) => {
      const slot = slotOf(record, id)
      const isMain = !!record && normId(id) === normId(record.id)
      const isMe = normId(id) === normId(account.id)
      const status = isMain
        ? "principal"
        : !slot
          ? '<span class="mut">não liberado</span>'
          : slot.temp
            ? `<span style="${GOLD}">aguardando o 1º acesso</span>`
            : '<span class="ok">ativo</span>'
      const grant =
        isMain || isMe || !email
          ? ""
          : `<button data-slot="button" data-variant="outline" data-adm="${esc(id)}">${slot ? "Nova senha provisória" : "Liberar admin"}</button>`
      const remove =
        slot && !isMain && !isMe
          ? ` <button data-slot="button" data-variant="destructive" data-rmadm="${esc(id)}">Remover</button>`
          : ""
      return `<tr><td>${esc(dispId(id))}</td><td>${email ? esc(email) : '<span class="bad">falta o e-mail no app</span>'}</td><td>${status}</td><td>${grant}${remove}</td></tr>`
    })
    .join("")
  return `<table data-slot="table"><tr><th>Riot ID</th><th>E-mail no banco</th><th>Situação</th><th></th></tr>${rows}</table>
    <div id="admform" hidden><p>Para liberar <b id="admwho"></b>, cadastre a conta em Authentication › Usuários no Firebase. Informe aqui a mesma senha provisória. A pessoa troca a senha no primeiro acesso.</p>
     <div class="admin-form"><div data-slot="field"><label for="admmy">Sua senha de administrador</label><input data-slot="input" type="password" id="admmy" autocomplete="current-password"></div>
     <div data-slot="field"><label for="admtmp">Senha provisória da outra pessoa</label><input data-slot="input" type="password" id="admtmp" autocomplete="new-password"></div>
     <div class="bad" id="admerr" role="alert"></div><button data-slot="button" data-variant="default" id="admok">Liberar acesso</button></div></div>`
}

function versionsPanel() {
  const versions = session.uiVersions
  const current = versions[0] ? ` <span class="mut">(atual: v${esc(versions[0].version)})</span>` : ""
  const body =
    versions
      .map(
        item =>
          `<div style="margin-top:10px"><b>v${esc(item.version)}</b> <span class="mut">${esc(item.date.split("-").reverse().join("/"))}</span><ul style="margin:4px 0 0;padding-left:20px">${item.changes.map(change => `<li>${esc(change)}</li>`).join("")}</ul></div>`,
      )
      .join("") || '<span class="mut">Sem histórico.</span>'
  return details(`Versões da interface${current}`, body)
}

/** Parte só do admin: usuários, times, admins, backup e versões da interface. */
export function adminSectionHtml(data: AdminData, account: Account) {
  return `
   ${details(`Usuários (${data.users.length})`, usersTable(data))}
   ${details(`Times (${data.teams.length})`, teamsTable(data))}
   <h2>Admins</h2>
   <div class="wl-panel card">${adminsTable(account)}</div>
   <h2>Banco e backup</h2><div class="wl-panel card"><span class="mut">Chave do admin: ${esc(session.keys?.fp || "")}</span>
    <div class="btns"><button data-slot="button" data-variant="outline" id="exp">Baixar backup completo</button><button data-slot="button" data-variant="outline" id="lock">Bloquear admin neste aparelho</button><button data-slot="button" data-variant="outline" id="refresh">Atualizar</button></div>
    <p class="mut">Guarde o backup completo na pasta Admin do OneDrive de tempos em tempos.</p></div>
   ${versionsPanel()}`
}
