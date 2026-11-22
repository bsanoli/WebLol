// Táticas: confrontos, gaveta de composições e abas da lista, com os cliques do editor em Táticas.
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { blank, compositionPreview } from "../model/local-state"
import type { Composition, DraftSide } from "../model/local-state"
import { enemiesOf, isEnemy, oursOf, settleOwner } from "../model/composition-side"
import {
  addMatchup,
  findMatchup,
  matchupKey,
  matchupsOfComp,
  matchupTitle,
  removeMatchup,
  resolveCompDrop,
  swapMatchupSides,
  type Matchup,
} from "../model/matchups"
import { opggOf, writeTactic } from "../model/tactics"
import { askMatchup, NEW_ENEMY } from "./matchup-dialog"
import { bindTacticDrop } from "./tactic-drop"
import { editOpggLink, opggTarget } from "./team-comp-edits"
import { faceEnemy, newComp, selectComp } from "./team-comps"
import { renderEditor } from "./team-editor"
import { hooks, session } from "./team-session"
import { $, compById, cur, eventTarget, hasUndo, didRunUndo, S, save, setUndo, toast, touch } from "./team-store"

export function mountMatchups() {
  $("#editor").addEventListener("contextmenu", e => {
    if (!eventTarget(e).closest<HTMLElement>("[data-tactic-opgg]")) return
    e.preventDefault()
    void editOpggLink(opggTarget())
  })
  function handleTacticDrawerToggle(button: HTMLElement) {
    const isOpen = S.tacticsDrawer === false
    S.tacticsDrawer = isOpen
    save()
    const tx = button.closest(".tx"),
      aside = $("#tx-aside")
    tx?.classList.toggle("drawer-closed", !isOpen)
    aside?.toggleAttribute("inert", !isOpen)
    button.setAttribute("aria-expanded", String(isOpen))
    button.title = isOpen ? "Esconder a lista de composições e o draft" : "Mostrar a lista de composições e o draft"
  }
  function handleTacticListToggle(button: HTMLElement) {
    const isCollapsed = S.tacticsListCollapsed !== true
    S.tacticsListCollapsed = isCollapsed
    save()
    button.closest(".tx-tabs")?.classList.toggle("list-collapsed", isCollapsed)
    button.setAttribute("aria-expanded", String(!isCollapsed))
    button.title = isCollapsed ? "Mostrar a lista" : "Recolher a lista"
  }
  // "Editar na Ordem do draft": abre o confronto da tática (ou, numa adversária, o confronto dela com a última nossa usada).
  function handleOpenDraft() {
    const c = cur()
    const open = S.tacticsGeneral ? null : findMatchup(S.comps, S.matchups, S.tacticsMatchup)
    S.view = "draft"
    S.tacticsGeneral = false
    if (open?.ours) {
      S.cur = open.ours.id
      S.curMatchup = open.matchup.id
      session.side = "rival"
    } else if (isEnemy(c)) {
      const facing = matchupsOfComp(S.matchups, c.id).find(
        item => item.enemy === c.id && item.ours && compById(item.ours),
      )
      const ours =
        (facing && compById(facing.ours)) || S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
      if (ours) {
        S.cur = ours.id
        S.curMatchup = facing?.id ?? null
        if (!facing) faceEnemy(c.id)
        session.side = "rival"
      }
    } else session.side = "us"
    save()
    hooks.renderAll()
    hooks.publishRoute("comps")
    requestAnimationFrame(() => $("#editor .matchup-bar [data-matchup]")?.focus({ preventScroll: true }))
  }
  // Abre o confronto: a comp nossa com a adversária do outro lado e a tática própria dele.
  function openMatchup(id: string) {
    const entry = findMatchup(S.comps, S.matchups, id)
    if (!entry) return
    if (entry.ours) {
      S.cur = entry.ours.id
      S.lastComp = entry.ours.id
    }
    S.curMatchup = id
    S.tacticsGeneral = false
    S.tacticsMatchup = id
    if (S.view !== "draft") S.view = "tactics"
    save()
    hooks.renderAll()
    hooks.publishRoute("comps")
    $("#editor [data-tactic-matchup][aria-pressed=true]")?.focus({ preventScroll: true })
  }
  async function handleNewMatchup() {
    const ours = oursOf(S.comps),
      enemies = enemiesOf(S.comps)
    if (!ours.length) {
      toast("Crie uma composição nossa antes de montar um confronto")
      return
    }
    const option = (x: Composition) => ({ id: x.id, name: x.name, preview: compositionPreview(x) })
    const choice = await askMatchup(ours.map(option), enemies.map(option), isEnemy(cur()) ? ours[0].id : cur().id)
    if (!choice) return
    let enemyId = choice.enemy
    if (enemyId === NEW_ENEMY) {
      const name = (
        await askName("Nova composição adversária", `Adversária ${enemies.length + 1}`, "Nome da composição adversária")
      )?.trim()
      if (!name) return
      const created = blank(name)
      settleOwner(created, "enemy")
      S.comps.unshift(created)
      enemyId = created.id
    }
    const created = addMatchup(S.matchups, { ours: choice.ours, enemy: enemyId, side: choice.side })
    touch(compById(choice.ours) ?? cur())
    openMatchup(created.id)
    toast("Confronto criado")
  }
  // Comp solta num lado do quadro da gaveta: ocupa esse lado do confronto aberto (ou de um novo, com a comp aberta).
  function handleCompDrop(id: string, side: DraftSide) {
    const c = cur()
    let openId = S.tacticsGeneral ? null : (S.tacticsMatchup ?? null)
    let precreated: Matchup | null = null
    if (!openId && !S.tacticsGeneral && c && c.id !== id) {
      precreated = addMatchup(S.matchups, isEnemy(c) ? { enemy: c.id, side: "blue" } : { ours: c.id, side: "blue" })
      openId = precreated.id
    }
    const before = openId ? { ...(S.matchups.find(m => m.id === openId) as Matchup) } : null
    const result = resolveCompDrop(S.comps, S.matchups, openId, id, side)
    if (!result) {
      if (precreated) removeMatchup(S.matchups, precreated.id)
      return
    }
    touch(compById(id) ?? c)
    openMatchup(result.matchup.id)
    if (result.swapped && before) {
      const swappedTo = result.matchup.side
      toast(`Lados trocados: Nossa no ${swappedTo === "blue" ? "azul" : "vermelho"}`, () => {
        const m = S.matchups.find(item => item.id === result.matchup.id)
        if (!m) return
        m.side = before.side
        m.ours = before.ours
        m.enemy = before.enemy
        save()
        renderEditor()
      })
    }
  }
  bindTacticDrop($("#editor"), handleCompDrop)
  function handleMatchupSwap() {
    const matchup = S.matchups.find(item => item.id === S.tacticsMatchup)
    if (!matchup) return
    const before = matchup.side
    const id = matchup.id
    swapMatchupSides(matchup)
    save()
    setUndo(() => {
      const target = S.matchups.find(item => item.id === id)
      if (!target) return
      target.side = before
      target.updated = Date.now()
      save()
      renderEditor()
    })
    renderEditor()
    $("#editor [data-matchup-swap]")?.focus({ preventScroll: true })
  }
  async function handleMatchupDelete(id: string) {
    const entry = findMatchup(S.comps, S.matchups, id)
    if (!entry) return
    const title = matchupTitle(entry)
    if (
      !(await confirmAction(
        `Excluir o confronto "${title}"? As composições ficam; só a tática dele é apagada.`,
        "Excluir confronto",
      ))
    )
      return
    removeMatchup(S.matchups, id)
    writeTactic(S, matchupKey(id), "", "", Date.now(), [])
    if (S.tacticsMatchup === id) S.tacticsMatchup = null
    if (S.curMatchup === id) S.curMatchup = null
    save()
    hooks.renderAll()
    hooks.publishRoute("comps")
    $("#editor [data-tx-list=matchup]")?.click()
    $("#editor [data-tx-list=matchup]")?.focus({ preventScroll: true })
    toast(`Confronto "${title}" excluído`)
  }
  // Ctrl+Z desfaz a última mudança do quadro, exceto quando o foco está num campo de texto (que tem o próprio desfazer).
  document.addEventListener("keydown", e => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return
    const target = e.target as HTMLElement | null
    if (e.defaultPrevented || e.isComposing || target?.isContentEditable) return
    if (target?.closest("input, textarea, select, [role=dialog], [data-radix-popper-content-wrapper]")) return
    if (S.view === "map" || !hasUndo()) return
    e.preventDefault()
    didRunUndo()
  })
  $("#editor").addEventListener("click", e => {
    const mxOpen = eventTarget(e).closest<HTMLElement>("[data-tactic-matchup]")
    if (mxOpen) {
      if (mxOpen.dataset.tacticMatchup !== S.tacticsMatchup || S.tacticsGeneral)
        openMatchup(mxOpen.dataset.tacticMatchup ?? "")
      return
    }
    if (eventTarget(e).closest<HTMLElement>("[data-matchup-swap]")) {
      handleMatchupSwap()
      return
    }
    const mxDelete = eventTarget(e).closest<HTMLElement>("[data-matchup-delete]")
    if (mxDelete) {
      void handleMatchupDelete(mxDelete.dataset.matchupDelete ?? "")
      return
    }
    if (eventTarget(e).closest<HTMLElement>("[data-matchup-new]")) {
      void handleNewMatchup()
      return
    }
    if (eventTarget(e).closest("[data-undo-last]")) {
      didRunUndo()
      return
    }
    const drawerToggle = eventTarget(e).closest<HTMLElement>("[data-tactic-drawer]")
    if (drawerToggle) {
      handleTacticDrawerToggle(drawerToggle)
      return
    }
    const listToggle = eventTarget(e).closest<HTMLElement>("[data-tactic-list-toggle]")
    if (listToggle) {
      handleTacticListToggle(listToggle)
      return
    }
    const boardView = eventTarget(e).closest<HTMLElement>("[data-tactic-board]")
    if (boardView) {
      const next = boardView.dataset.tacticBoard === "positions" ? "positions" : "draft"
      if (next === (S.tacticsBoard ?? "draft")) return
      S.tacticsBoard = next
      save()
      renderEditor()
      $(`#editor [data-tactic-board="${next}"]`)?.focus({ preventScroll: true })
      return
    }
    if (eventTarget(e).closest<HTMLElement>("[data-tactic-opgg]")) {
      const link = opggOf(opggTarget())
      if (link) window.open(link, "_blank", "noopener")
      else void editOpggLink(opggTarget())
      return
    }
    if (eventTarget(e).closest<HTMLElement>("[data-open-draft]")) {
      handleOpenDraft()
      return
    }
    const listTab = eventTarget(e).closest<HTMLElement>("[data-tx-list]")
    if (listTab) {
      const wrap = listTab.closest(".tx-tabs")
      if (!wrap) return
      wrap.querySelectorAll<HTMLElement>("[data-tx-list]").forEach(b => {
        const isOn = b === listTab
        b.setAttribute("aria-selected", String(isOn))
        b.tabIndex = isOn ? 0 : -1
      })
      wrap.querySelectorAll<HTMLElement>(".tx-group").forEach(g => {
        g.hidden = g.id !== `tx-list-${listTab.dataset.txList}`
      })
      return
    }
    const tacticTab = eventTarget(e).closest<HTMLElement>("[data-tactic-comp],[data-tactic-general]")
    if (tacticTab) {
      const general = tacticTab.hasAttribute("data-tactic-general"),
        id = tacticTab.dataset.tacticComp
      const isFromMatchup = !!S.tacticsMatchup
      if (general === !!S.tacticsGeneral && (general || id === S.cur) && !isFromMatchup) return
      S.tacticsGeneral = general
      S.tacticsMatchup = null
      if (general) {
        save()
        renderEditor()
      } else if (id && id !== S.cur) selectComp(id)
      else {
        save()
        renderEditor()
      }
      ;(tacticTab.closest(".tx-scope")
        ? $("#editor .tx-scope [aria-pressed=true]")
        : $("#editor .tx-tabs [aria-pressed=true]")
      )?.focus({ preventScroll: true })
      return
    }
    const create = eventTarget(e).closest<HTMLElement>("[data-comp-new]")
    if (create) void newComp(create.dataset.compNew === "enemy" ? "enemy" : "ours")
  })
}
