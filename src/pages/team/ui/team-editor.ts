// Editor da composição aberta: Ordem do draft e Táticas, com os cliques e a troca de posição dos picks.
import { lolImage } from "@/entities/champion"
import { iconMarkup } from "@/shared/ui/icon"
import { revealContent } from "@/shared/lib/motion"
import { enemyOrder, isEnemy, oppositeSide } from "../model/composition-side"
import { championsOf, draftOf, setChampions } from "../model/local-state"
import type { ChampionSlot, Composition, DraftLane } from "../model/local-state"
import { allMatchups, findMatchup, matchupKey } from "../model/matchups"
import { SLOT_INFO } from "../model/champion-slots"
import { draftBoardHTML } from "./draft-board"
import { savedListHeight } from "./tactic-list-resize"
import { tacticsHTML } from "./tactics"
import { capturePickFeedback } from "./pick-feedback"
import { bindTacticDrop } from "./tactic-drop"
import { CHOOSE_EVENT } from "./matchup-picker"
import { clearTeamControls, mountDraftChampionMenu, mountSectionTabs, mountTeamSelect } from "./team-controls"
import { compOf, handleEnemyChampionDrop, keepOurCompositionInDraft, newComp, renderMatchup } from "./team-comps"
import { openPicker, placePicker, renderGrid, renderTarget, isPickerOpen } from "./team-grid"
import { hooks, boardEnemy, session, target } from "./team-session"
import type { ActiveSide } from "./team-session"
import {
  $,
  boardSide,
  eventTarget,
  champArt,
  compById,
  cur,
  esc,
  hasUndo,
  img,
  S,
  save,
  toast,
  touch,
} from "./team-store"
import { mountTacticNotesIn, rememberTacticNotesScroll } from "./team-tactic-notes"
// Arte em alta (1215×717) direto do Data Dragon; se não carregar, usa a cópia local menor.
function pickArt(name: string) {
  const local = name ? champArt(name)?.splash : ""
  if (!local) return ""
  const id = local.match(/splash\/(.+)\.webp$/)?.[1]
  if (!id) return lolImage(local, "pick-splash")
  return `<img alt="" class="pick-splash" loading="lazy" src="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg" onerror="this.onerror=()=>this.remove();this.src='assets/${local}'">`
}

export function renderEditor() {
  if (S.view !== "tactics") S.view = "draft"
  if (S.tacticsMatchup && !findMatchup(S.comps, S.matchups, S.tacticsMatchup)) S.tacticsMatchup = null
  keepOurCompositionInDraft()
  const editor = $("#editor")
  const previousComposition = editor.dataset.motionComposition
  const previousView = editor.dataset.motionView
  const c = cur(),
    tv = S.view === "tactics",
    view = S.view
  $("#v-comps").classList.toggle("draft-view", !tv)
  $("#v-comps").classList.toggle("tactics-view", tv)
  const showPickFeedback =
    previousComposition === c.id && previousView === view ? capturePickFeedback(editor) : undefined
  const nameInput = $<HTMLInputElement>("#cname")
  nameInput.value = c.name
  nameInput.title = c.name
  mountSectionTabs(
    $(".editor-controls .vtog"),
    "Modo da composição",
    S.view,
    [
      { value: "draft", label: "Ordem do draft", panel: "composition-panel" },
      { value: "tactics", label: "Táticas", panel: "composition-panel" },
    ],
    value => {
      S.view = value as typeof S.view
      save()
      hooks.renderAll()
      hooks.publishRoute("comps")
    },
    "navigation",
  )
  const catalog = $("#champ-picker"),
    gridScroll = $("#grid").scrollTop,
    tabsScroll = editor.querySelector(".tx-tabs")?.scrollTop || 0
  if (editor.contains(catalog)) $("#comps").append(catalog)
  clearTeamControls(editor)
  rememberTacticNotesScroll()
  editor.replaceChildren()
  if (tv) {
    editor.insertAdjacentHTML(
      "beforeend",
      `<div id="composition-panel" role="tabpanel" aria-labelledby="tab-tactics">${tacticsHTML(c, {
        compositions: S.comps,
        matchups: S.matchups,
        general: !!S.tacticsGeneral,
        drawer: S.tacticsDrawer !== false,
        listCollapsed: S.tacticsListCollapsed === true,
        listHeight: savedListHeight(S.tacticsListHeight),
        canUndo: hasUndo(),
        boardView: S.tacticsBoard === "positions" ? "positions" : "draft",
        matchupId: S.tacticsMatchup,
        slots: SLOT_INFO,
        img,
        esc,
        pickArt,
      })}</div>`,
    )
    editor.querySelectorAll<HTMLSelectElement>("select[data-pick-position]").forEach(field => mountTeamSelect(field))
    mountTacticNotesIn(editor, S.tacticsGeneral ? null : S.tacticsMatchup ? matchupKey(S.tacticsMatchup) : c.id)
    const txTabs = editor.querySelector(".tx-tabs")
    if (txTabs) txTabs.scrollTop = tabsScroll
    editor.dataset.motionComposition = c.id
    editor.dataset.motionView = view
    if (previousView !== view) revealContent(editor, true)
    if (isPickerOpen()) renderTarget()
    return
  }
  if (isEnemy(c)) {
    // Só há adversárias: a Ordem do draft precisa de uma comp nossa.
    editor.insertAdjacentHTML(
      "beforeend",
      `<div id="composition-panel" role="tabpanel" aria-labelledby="tab-draft"><div class="draft-no-ours" role="status">
      <p>Nenhuma composição nossa ainda. Crie uma para montar o draft contra as adversárias.</p>
      <button type="button" data-slot="button" data-variant="default" data-size="sm" data-comp-new="ours">${iconMarkup("plus")} Nova composição nossa</button></div></div>`,
    )
    editor.dataset.motionComposition = c.id
    editor.dataset.motionView = view
    return
  }
  editor.insertAdjacentHTML(
    "beforeend",
    `
  <div id="composition-panel" role="tabpanel" aria-labelledby="tab-draft">
  <div class="matchup-bar" data-team-control></div>
  <button data-slot="button" data-variant="default" type="button" class="jump-picker" data-picker>${iconMarkup("plus")} Adicionar campeão</button>
  ${draftBoardHTML(c, boardEnemy() ?? null, { side: boardSide(), active: session.active, activeSide: session.side, slots: SLOT_INFO, img, esc, pickArt })}
  <p class="help">Selecione o retrato para torná-lo principal. Para remover, abra o menu do retrato com o botão direito ou Shift+F10.</p></div>`,
  )
  renderMatchup()
  editor.querySelectorAll<HTMLElement>(".dchip").forEach(host => {
    const { n = "", from = "" } = host.dataset
    mountDraftChampionMenu(host, n, () => removeChampion(n, from as ChampionSlot, compOf(host)))
  })
  editor.querySelectorAll<HTMLSelectElement>("select[data-pick-position]").forEach(field => mountTeamSelect(field))
  placePicker()
  $("#grid").scrollTop = gridScroll
  renderTarget()
  editor.dataset.motionComposition = c.id
  editor.dataset.motionView = view
  if (previousComposition !== c.id) revealContent(editor)
  else if (previousView !== view) revealContent(editor, true)
  else showPickFeedback?.()
}
const focusDraftTarget = (lane: string, side: ActiveSide = session.side) =>
  $(`#editor [data-draft-target="${lane}"][data-draft-side="${side}"]`)?.focus({ preventScroll: true })
$("#v-comps").addEventListener("input", e => {
  if (eventTarget(e).id !== "cname") return
  const c = cur()
  c.name = eventTarget<HTMLInputElement>(e).value
  eventTarget(e).title = c.name
  touch()
  save()
  if (S.view === "tactics") {
    const label = $(`#editor [data-tactic-comp="${CSS.escape(c.id)}"] b`)?.firstChild
    if (label) label.textContent = c.name
    if (S.tacticsMatchup || allMatchups(S.comps, S.matchups).some(x => x.enemy === c)) renderEditor()
    else {
      const title = $("#tx-title")?.firstChild
      if (title && !S.tacticsGeneral) title.textContent = `Táticas · ${c.name}`
    }
  } else renderMatchup()
})
$("#editor").addEventListener("change", e => {
  if (!eventTarget(e).matches("select[data-pick-position]")) return
  // Em Táticas a troca de posição é tratada em tactic-lane-order.ts.
  if (S.view === "tactics") return
  const enemySide = eventTarget(e).dataset.draftSide === "rival",
    owner = enemySide ? boardEnemy() : cur()
  if (!owner) return
  const order = enemySide ? enemyOrder(owner, boardSide()) : draftOf(owner).order[boardSide()],
    i = Number(eventTarget(e).dataset.pickPosition)
  const lane = eventTarget<HTMLSelectElement>(e).value as DraftLane,
    j = order.indexOf(lane)
  ;[order[i], order[j]] = [lane, order[i]]
  session.active = lane
  session.side = enemySide ? "rival" : "us"
  touch(owner)
  save()
  renderEditor()
  const side = enemySide ? "rival" : "us"
  requestAnimationFrame(() =>
    $(`[data-pick-position="${i}"][data-draft-side="${side}"] + .team-select button`)?.focus({ preventScroll: true }),
  )
})
function reorderChampion(name: string, lane: ChampionSlot, comp: Composition = target()) {
  const champions = championsOf(comp, lane),
    index = champions.indexOf(name)
  if (index < 0) return
  champions.splice(index, 1)
  champions.unshift(name)
  session.active = lane
  session.side = comp === cur() ? "us" : "rival"
  touch(comp)
  save()
  renderEditor()
  renderGrid()
  focusDraftTarget(lane)
}
function removeChampion(name: string, lane: ChampionSlot, comp: Composition = target()) {
  setChampions(
    comp,
    lane,
    championsOf(comp, lane).filter(champion => champion !== name),
  )
  touch(comp)
  save()
  renderEditor()
  renderGrid()
  focusDraftTarget(lane, comp === cur() ? "us" : "rival")
}
// Abre a lista de adversárias junto do botão clicado.
function requestChoose(anchor: HTMLElement) {
  document.dispatchEvent(new CustomEvent(CHOOSE_EVENT, { detail: { kind: "rival", anchor } }))
}
$("#editor").addEventListener("click", e => {
  if (eventTarget(e).closest<HTMLElement>("[data-picker]")) {
    openPicker()
    return
  }
  if (eventTarget(e).closest<HTMLElement>("[data-new-rival]")) {
    newComp("enemy")
    return
  }
  const chooseRival = eventTarget(e).closest<HTMLElement>("[data-choose-rival]")
  if (chooseRival) {
    requestChoose(chooseRival)
    return
  }
  const priority = eventTarget(e).closest<HTMLElement>("[data-priority]")
  if (priority) {
    reorderChampion(priority.dataset.priority ?? "", priority.dataset.lane as ChampionSlot, compOf(priority))
    return
  }
  const rm = eventTarget(e).closest<HTMLElement>("[data-rm]")
  if (rm) {
    removeChampion(rm.dataset.rm ?? "", rm.closest<HTMLElement>("[data-l]")?.dataset.l as ChampionSlot, compOf(rm))
    return
  }

  // Em Táticas, o campeão principal (e o ban) já escolhido não abre a lista: ela abre pelo "+" ou pela linha vazia.
  if (S.view === "tactics" && eventTarget(e).closest(".tx-pos-ic.main, .tx-pos-ic.ban")) return

  const draftTarget = eventTarget(e).closest<HTMLElement>("[data-draft-target]")
  if (draftTarget) {
    session.active = draftTarget.dataset.draftTarget as ChampionSlot
    session.side = (draftTarget.dataset.draftSide || "us") as ActiveSide
    if (S.view === "tactics") {
      renderEditor()
      openTacticsPicker()
      return
    }
    renderEditor()
    renderGrid()
    focusDraftTarget(session.active)
    return
  }
  if (
    eventTarget(e).closest<HTMLElement>("details,[data-team-control]") ||
    ["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(eventTarget(e).tagName)
  )
    return
  const ln = eventTarget(e).closest<HTMLElement>("[data-comp-id] [data-l]")
  const side = ln?.closest<HTMLElement>("[data-board-side]")?.dataset.boardSide
  if (ln && (ln.dataset.l !== session.active || side !== session.side)) {
    session.active = ln.dataset.l as ChampionSlot
    session.side = (side || "us") as ActiveSide
    renderEditor()
    renderGrid()
  }
  if (ln && S.view === "tactics") openTacticsPicker()
})
// Em Táticas o seletor abre em diálogo e mostra o slot escolhido.
function openTacticsPicker() {
  openPicker()
  renderGrid()
  renderTarget()
}
