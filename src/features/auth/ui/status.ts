// Menu da conta: texto de sincronização, botão de envio e os seletores "Ver como" e "Ver o time" do admin.
import { dbList, fb, IS_ONLINE } from "@/shared/firestore"
import type { FrameHandlers } from "@/shared/host-bridge"
import { $, esc, toast } from "@/shared/lib/dom"
import { closeModal } from "./login-dialog"
import { stepId } from "./login-steps"
import { stepTeam, enterTeam } from "./team-step"
import { renderAdmin } from "./admin"
import { captainAccess } from "./captain-panel"
import { loadMembership } from "../model/membership"
import { openRoute, routeRoots, writeRoute } from "../model/router"
import { publish, refreshTeam, sendChanges, sync, type SentChange } from "../model/sync"
import { session, type Team } from "../model/session"
import {
  BKEY,
  canPublish,
  GKEY,
  isAdminViewer,
  isCaptain,
  KEY,
  lsGet,
  lsSet,
  PBKEY,
  PKEY,
  pending,
  preview,
  realUser,
  SKEY,
  TKEY,
  user,
  VKEY,
} from "../model/identity"
import type { PreviewMode } from "../model/session"

export function setSync(text: string, state: "" | "ok" | "warn" | "bad") {
  $("#sync-label").textContent = text
  $("#sync").dataset.state = state
  const icon = { bad: "warning", ok: "check", warn: "reset", "": "reset" }[state]
  $("#sync use").setAttribute("href", `assets/icons.svg#${icon}`)
}

const roleLabel = (): string => {
  const mode = preview()
  if (mode === "user") return "Vendo como membro"
  if (mode === "captain") return "Vendo como capitão"
  if (user()?.admin) return "Admin"
  return isCaptain() ? "Capitão" : ""
}

/** Atualiza o menu da conta e os atributos do `body` que o cabeçalho React lê. */
export function updateStatus(shouldKeepChip = false) {
  const account = user()
  void renderTeamView()
  renderPreview()
  try {
    ;(
      document.querySelector<HTMLIFrameElement>("#v-camp")?.contentWindow as FrameHandlers | null | undefined
    )?.weblolTeamChanged?.()
  } catch {
    // o iframe da Área do time ainda não carregou
  }
  document.body.dataset.accountName = account?.id ?? ""
  document.body.dataset.teamManagement = String(captainAccess())
  document.body.dataset.accountRole = roleLabel()
  document.body.dataset.preview = preview()
  document.body.classList.toggle("isadmin", !!account?.admin || isCaptain())
  $("#logout").hidden = !account
  const send = $<HTMLButtonElement>("#send")
  if (!account) {
    setSync(lsGet(GKEY) || preview() ? "Sem usuário: alterações temporárias" : "Entrar na Área do time", "warn")
    $("#sync").onclick = () => stepId()
    send.hidden = true
    return
  }
  if (account.solo || !session.team) {
    const text = account.solo
      ? "Sem time: as comps não são salvas"
      : session.memb?.status === "pendente"
        ? `Aguardando o capitão do ${session.memb.teamName || "time"}`
        : "Sem time"
    setSync(text, "warn")
    $("#sync").onclick = () => void stepTeam()
    send.hidden = true
    return
  }
  $("#sync").onclick = () => void refreshTeam()
  if (!IS_ONLINE || !session.net || !session.off) {
    if (!shouldKeepChip) setSync(IS_ONLINE ? "Sincronizar com o time" : "Banco online não configurado", "warn")
    send.hidden = true
    return
  }
  if (!shouldKeepChip)
    setSync(
      `${session.team.viewing ? "Vendo " : ""}${session.team.name} · versão oficial v${session.off.version}`,
      "ok",
    )
  const changes = pending()
  const sent = new Set(lsGet<string[]>(SKEY, []))
  const unsent = changes.filter(change => !change.h || !sent.has(change.h))
  const waiting = changes.length - unsent.length
  send.hidden = !changes.length
  if (canPublish()) {
    send.dataset.variant = "default"
    send.disabled = false
    send.textContent = `Publicar minhas alterações (${changes.length})`
    send.onclick = () =>
      void publish(
        changes.map((change): SentChange => ({ ...change, sid: "capitao", from: account.id })),
        [],
        "Alterações do capitão",
      )
  } else {
    send.dataset.variant = unsent.length ? "default" : "secondary"
    send.textContent = unsent.length ? `Enviar para aprovação (${unsent.length})` : `${waiting} aguardando aprovação`
    send.disabled = !unsent.length
    send.onclick = () => void sendChanges()
  }
}

/* ===== admin: ver o site como outra pessoa ===== */
function renderPreview() {
  let box = document.querySelector<HTMLLabelElement>("#preview-box")
  if (!realUser()?.admin) {
    if (box) box.hidden = true
    return
  }
  if (!box) {
    box = document.createElement("label")
    box.id = "preview-box"
    box.className = "team-view"
    box.innerHTML = `<span>Ver como</span><select id="preview-as" data-slot="select"><option value="">Admin (minha visão)</option><option value="captain">Capitão do time</option><option value="user">Membro do time (não capitão)</option><option value="guest">Sem conta cadastrada</option></select>`
    $("#sync").before(box)
    $<HTMLSelectElement>("#preview-as").onchange = event =>
      void setPreview((event.target as HTMLSelectElement).value as PreviewMode)
  }
  box.hidden = false
  $<HTMLSelectElement>("#preview-as").value = preview()
}

const PREVIEW_NOTES: Record<PreviewMode, string> = {
  user: "Vendo como membro do time, sem admin. Nada que você enviar será salvo.",
  captain: "Vendo como capitão do time. Os botões aparecem, mas ficam desativados nesta visão.",
  guest: "Vendo como quem não tem conta. As comps do admin foram guardadas e voltam ao sair desta visão.",
  "": "De volta à visão de admin.",
}

async function setPreview(mode: PreviewMode) {
  const was = preview()
  if (mode === was) return
  // sem conta: guarda as comps do admin e mostra a Área do time vazia, como um visitante veria
  if (mode === "guest" && was !== "guest") {
    lsSet(PBKEY, Object.fromEntries([KEY, BKEY, SKEY, TKEY].map(key => [key, localStorage.getItem(key)])))
    for (const key of [KEY, BKEY, SKEY]) localStorage.removeItem(key)
    lsSet(TKEY, "__guest__")
  }
  if (was === "guest" && mode !== "guest") {
    const backup = lsGet<Record<string, string | null>>(PBKEY) || {}
    for (const [key, value] of Object.entries(backup)) {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    }
    localStorage.removeItem(PBKEY)
  }
  if (mode) lsSet(PKEY, mode)
  else localStorage.removeItem(PKEY)
  closeModal()
  session.reloadCamp()
  updateStatus()
  if (session.currentScreen === "admin" && mode && mode !== "captain") {
    writeRoute(routeRoots.camp)
    openRoute()
  }
  if (mode !== "guest") {
    try {
      await fb()
      await enterTeam()
    } catch {
      // sem rede: fica com o que já está carregado
    }
  } else updateStatus()
  if (session.currentScreen === "admin") void renderAdmin()
  toast(PREVIEW_NOTES[mode], 5000)
}

/* ===== admin: trocar o time que está vendo ===== */
async function renderTeamView() {
  let box = document.querySelector<HTMLLabelElement>("#team-view-box")
  if (!isAdminViewer()) {
    if (box) box.hidden = true
    return
  }
  if (!box) {
    box = document.createElement("label")
    box.id = "team-view-box"
    box.className = "team-view"
    box.innerHTML = `<span>Ver o time</span><select id="team-view" data-slot="select"></select>`
    $("#sync").before(box)
    $<HTMLSelectElement>("#team-view").onchange = event =>
      void switchViewTeam((event.target as HTMLSelectElement).value)
  }
  box.hidden = false
  if (!session.teamsCache) {
    try {
      const teams = (await dbList("times")) as unknown as Team[]
      session.teamsCache = teams.sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      session.teamsCache = []
    }
  }
  const own = session.memb?.status === "ativo" ? session.memb.team : ""
  const select = $<HTMLSelectElement>("#team-view")
  select.innerHTML =
    (own ? "" : `<option value="">Sem time</option>`) +
    session.teamsCache
      .map(team => `<option value="${esc(team.id)}">${esc(team.name)}${team.id === own ? " (meu time)" : ""}</option>`)
      .join("")
  select.value = session.team?.id || ""
}

async function switchViewTeam(id: string) {
  const own = session.memb?.status === "ativo" ? session.memb.team : ""
  if (
    pending().length &&
    !confirm(
      "Você tem alterações não publicadas neste time. Trocar de time descarta essas alterações neste navegador. Continuar?",
    )
  ) {
    void renderTeamView()
    return
  }
  if (!id || id === own) localStorage.removeItem(VKEY)
  else lsSet(VKEY, id)
  setSync("Trocando de time…", "")
  try {
    await loadMembership()
  } catch {
    // sem rede: o `sync` abaixo mostra o aviso
  }
  await sync()
  if (session.currentScreen === "admin") void renderAdmin()
  toast(session.team?.viewing ? `Vendo o time ${session.team.name}` : `De volta ao ${session.team?.name || "seu time"}`)
}
