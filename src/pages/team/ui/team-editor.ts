// Editor da composição aberta: Ordem do draft e Táticas, com os cliques e a troca de posição dos picks.
import { lolImage } from "@/entities/champion"
import { iconMarkup } from "@/shared/ui/icon"
import { revealContent } from "@/shared/lib/motion"
import { enemyOrder, isEnemy, oppositeSide } from "../model/composition-side"
import { championsOf, draftOf, setChampions } from "../model/local-state"
import type { ChampionSlot, Composition, DraftLane } from "../model/local-state"
import { adoptEnemies, allMatchups, findMatchup, matchupKey, resolveCompDrop } from "../model/matchups"
import { hasTactic } from "../model/tactics"
import { SLOT_INFO } from "../model/champion-slots"
import { draftBoardHTML } from "./draft-board"
import { tacticsHTML } from "./tactics"
import { capturePickFeedback } from "./pick-feedback"
import { bindTacticDrop } from "./tactic-drop"
import { clearTeamControls, mountDraftChampionMenu, mountSectionTabs, mountTeamSelect } from "./team-controls"
import { compOf, handleEnemyChampionDrop, keepOurCompositionInDraft, newComp, renderMatchup } from "./team-comps"
import { openPicker, placePicker, renderGrid, renderTarget, isPickerOpen } from "./team-grid"
import { hooks, boardEnemy, session, target } from "./team-session"
import type { ActiveSide } from "./team-session"
import { $, eventTarget, champArt, compById, cur, esc, img, S, save, toast, touch } from "./team-store"
import { mountTacticNotesIn } from "./team-tactic-notes"
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
  if (adoptEnemies(S.comps)) save()
  if (S.tacticsMatchup && !findMatchup(S.comps, S.tacticsMatchup)) S.tacticsMatchup = null
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
  editor.replaceChildren()
  if (tv) {
    editor.insertAdjacentHTML(
      "beforeend",
      `<div id="composition-panel" role="tabpanel" aria-labelledby="tab-tactics">${tacticsHTML(c, {
        compositions: S.comps,
        general: !!S.tacticsGeneral,
        drawer: S.tacticsDrawer !== false,
        hasTactic: id => hasTactic(S, id),
        matchupId: S.tacticsMatchup,
        slots: SLOT_INFO,
        img,
        esc,
        pickArt,
      })}</div>`,
    )
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
  ${draftBoardHTML(c, boardEnemy() ?? null, { active: session.active, activeSide: session.side, slots: SLOT_INFO, img, esc, pickArt })}
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
    if (S.tacticsMatchup || allMatchups(S.comps).some(x => x.enemy === c)) renderEditor()
    else {
      const title = $("#tx-title")?.firstChild
      if (title && !S.tacticsGeneral) title.textContent = `Táticas · ${c.name}`
    }
  } else renderMatchup()
})
$("#editor").addEventListener("change", e => {
  if (!eventTarget(e).matches("select[data-pick-position]")) return
  const enemySide = eventTarget(e).dataset.draftSide === "rival",
    owner = enemySide ? boardEnemy() : cur()
  if (!owner) return
  const order = enemySide ? enemyOrder(cur(), owner) : draftOf(owner).order[draftOf(owner).side],
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
$("#editor").addEventListener("click", e => {
  if (eventTarget(e).closest<HTMLElement>("[data-picker]")) {
    openPicker()
    return
  }
  if (eventTarget(e).closest<HTMLElement>("[data-new-rival]")) {
    newComp("enemy")
    return
  }
  if (eventTarget(e).closest<HTMLElement>("[data-choose-rival]")) {
    $('#editor .matchup-bar [data-matchup="rival"]')?.click()
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
