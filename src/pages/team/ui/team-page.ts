import { exposeFrameHandlers, navigateHost } from "@/shared/api/host-bridge"
import { initializeTheme } from "@/shared/config/theme"
import { viewFromMode } from "../model/saved-data"
import { uid, compositionPreview } from "../model/local-state"
import { isEnemy } from "../model/composition-side"
import type { Composition } from "../model/local-state"
import { mountTeamNavigation } from "./team-navigation"
import {
  clearTeamControls,
  mountMapEmpty,
  mountMapSwitch,
  mountTeamSelect,
  mountSectionTabs,
  mountToolGroup,
} from "./team-controls"
import { ensureTactics } from "../model/tactics"
import { hasCaptainAccess, renderCaptain } from "./team-captain"
import { closeChampionPicker, mountChampionGrid, renderGrid } from "./team-grid"
import { renderEditor } from "./team-editor"
import "./team-drag"
import { hooks } from "./team-session"
import { mountTeamBackup } from "./team-backup"
import { mountLocalRestore } from "./team-restore"
import { mountMatchups } from "./team-matchups"
import { mountTeamSendButton, syncTeamSendButton } from "./team-send-button"
import { $, esc, getState, img, plays, S, save, toast } from "./team-store"
initializeTheme()

mountLocalRestore()
mountMatchups()
/* ===== Grade de campeões ===== */
mountChampionGrid({ onChange: () => renderEditor() })
window.matchMedia("(min-width: 1100px)").addEventListener("change", e => {
  if (e.matches) closeChampionPicker()
})

/* ===== Exportar / Importar ===== */
mountTeamBackup({
  afterImport() {
    if (currentTeamView === "map") tacticalMap?.renderPlays()
    if (currentTeamView === "comps") renderAll()
    publishTeamRoute(currentTeamView)
  },
})

/* ===== Abas ===== */
type TeamView = "comps" | "map" | "know" | "cap"
type TacticalMap = ReturnType<typeof import("@/widgets/tactical-map").mountTacticalMap>
const teamPages: Record<TeamView, string> = { comps: "composicoes", map: "mapa", know: "conhecimento", cap: "gestao" }
const guides: Record<string, string> = { obj: "objetivos", wave: "wave" }
let currentTeamView: TeamView = "comps"
let routeRequest = 0
let tacticalMap: TacticalMap | undefined
let renderKnow: (() => void) | undefined
let compositionsMounted = false
const usesParentNavigation = window.frameElement?.id === "v-camp"
document.body.toggleAttribute("data-parent-navigation", usesParentNavigation)
const renderTeamNavigation = usesParentNavigation
  ? () => {}
  : mountTeamNavigation($("#team-navigation"), handleTeamNavigation)

function handleTeamNavigation(view: TeamView) {
  void openTeamView(view).then(opened => {
    if (opened) publishTeamRoute(view, { includeItem: false })
  })
}

function showTeamView(view: TeamView) {
  currentTeamView = view
  $<HTMLDetailsElement>("#team-files").open = false
  const filesSlot = view === "map" ? "#map-file-slot" : usesParentNavigation ? "#team-files-" + view : "#team-file-slot"
  $(filesSlot).append($("#team-files"))
  renderTeamNavigation(view, hasCaptainAccess())
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("on", section.id === "v-" + view))
  if (view === "comps") {
    if (!compositionsMounted) {
      mountTeamSelect($("#sort"))
      compositionsMounted = true
    }
    renderAll()
  }
  if (view === "map") tacticalMap?.renderPlays()
  if (view === "cap") renderCaptain()
}

function publishTeamRoute(
  view: TeamView,
  { includeItem = true, onCopy }: { includeItem?: boolean; onCopy?: () => void } = {},
) {
  $("#route-note").hidden = true
  let path = "/time/" + teamPages[view]
  if (view === "know") path += "/" + (guides[S.kTab ?? ""] || guides.obj)
  if (includeItem && view === "comps")
    path += "/" + encodeURIComponent(S.cur) + "?modo=" + (S.view === "tactics" ? "taticas" : "draft")
  if (includeItem && view === "map") path += "/" + encodeURIComponent(S.curPlay ?? "")
  navigateHost({ path, onCopy })
}

/* ===== Gestão do time (todo o time vê; só o capitão e admins agem; os dados vêm do app principal) ===== */
let wantCaptain = false // link para a gestão aberto antes de o time carregar
exposeFrameHandlers({ weblolTeamChanged })
function weblolTeamChanged() {
  syncTeamSendButton($("#team-send"))
  const ok = hasCaptainAccess()
  renderTeamNavigation(currentTeamView, ok)
  if (ok && wantCaptain) {
    wantCaptain = false
    void openTeamView("cap")
    return
  }
  if ($("#v-cap").classList.contains("on")) {
    if (ok) renderCaptain()
    else {
      handleTeamNavigation("comps")
    }
  }
}
exposeFrameHandlers({
  applyWebLolRoute([page, item], params) {
    const view = (Object.keys(teamPages) as TeamView[]).find(key => teamPages[key] === page) || "comps"
    return openTeamView(view, item, params)
  },
})

async function openTeamView(view: TeamView, item?: string, params?: URLSearchParams) {
  const request = ++routeRequest
  wantCaptain = false
  if (view === "cap" && !hasCaptainAccess()) {
    view = "comps"
    wantCaptain = true
  }
  const note = $("#route-note")
  if ((view === "map" && !tacticalMap) || (view === "know" && !renderKnow)) {
    note.textContent = "Carregando esta seção…"
    note.hidden = false
    try {
      if (view === "map") {
        const { mountTacticalMap } = await import("@/widgets/tactical-map")
        if (request !== routeRequest) return false
        tacticalMap = mountTacticalMap({
          getState,
          save,
          publishTeamRoute,
          toast,
          uid,
          img,
          esc,
          compositionPreview,
          mountTeamSelect,
          mountMapEmpty,
          mountMapSwitch,
          mountToolGroup,
          mountSectionTabs,
          clearTeamControls,
        })
      } else {
        const { mountKnowledge } = await import("@/widgets/team-knowledge")
        if (request !== routeRequest) return false
        renderKnow = mountKnowledge({ getState, save, publishTeamRoute, mountSectionTabs })
      }
    } catch {
      if (request === routeRequest)
        note.textContent = "Não foi possível carregar esta seção. Recarregue a página para tentar novamente."
      return false
    }
  }
  let missing = ""
  const matches = (entry: { id: string }) => encodeURIComponent(entry.id) === item
  if (view === "comps") {
    if (item) {
      const comp = S.comps.find(matches)
      if (comp) {
        S.cur = comp.id
        if (!isEnemy(comp)) S.lastComp = comp.id
      } else
        missing =
          "A composição deste link não está disponível neste navegador. Conecte a pasta do time para carregar a versão oficial."
    }
    // "lane" era a antiga aba Opções por posição; agora abre a Ordem do draft.
    const mode = viewFromMode(params?.get("modo"))
    if (mode) S.view = mode
  } else if (view === "map" && item) {
    const selected = plays().find(matches)
    if (selected) tacticalMap?.selectPlay(selected.id)
    if (!selected)
      missing =
        "A jogada deste link não está disponível neste navegador. Conecte a pasta do time para carregar a versão oficial."
  } else if (view === "know") {
    if (item) S.kTab = item === "wave" ? "wave" : "obj"
    renderKnow?.()
  }
  note.textContent = missing
  note.hidden = !missing
  showTeamView(view)
  return true
}

function wireCopyButton(button: HTMLButtonElement, view: "comps" | "map") {
  const icon = button.querySelector("use")
  if (!icon) return
  const original = icon.getAttribute("href") ?? ""
  let request = 0
  let resetTimer: number
  const reset = () => {
    icon.setAttribute("href", original)
    button.removeAttribute("data-link-copied")
  }
  button.onclick = () => {
    const attempt = ++request
    clearTimeout(resetTimer)
    reset()
    publishTeamRoute(view, {
      onCopy: () => {
        if (attempt !== request) return
        icon.setAttribute("href", "assets/icons.svg#check")
        button.setAttribute("data-link-copied", "")
        resetTimer = window.setTimeout(reset, 1600)
      },
    })
  }
}
wireCopyButton($("#copy-comp"), "comps")
mountTeamSendButton($("#team-send"))
wireCopyButton($("#copy-play"), "map")

hooks.renderEditor = () => renderEditor()
hooks.renderAll = () => renderAll()
hooks.publishRoute = view => publishTeamRoute(view)

/* ===== Início ===== */
ensureTactics(S)
if (S.view !== "tactics") S.view = "draft"
function renderAll() {
  renderEditor()
  renderGrid()
}
plays()
if (!usesParentNavigation) void openTeamView("comps")
