// Táticas: confrontos, gaveta de composições e abas da lista, com os cliques do editor em Táticas.
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { blank, compositionPreview, draftOf } from "../model/local-state"
import type { Composition } from "../model/local-state"
import { enemiesOf, enemyCompositionOf, isEnemy, oursOf, setEnemyId, settleOwner } from "../model/composition-side"
import {
  addMatchup,
  type DraftSideKey,
  findMatchup,
  matchupKey,
  matchupTitle,
  matchupsOf,
  removeMatchup,
  resolveCompDrop,
} from "../model/matchups"
import { opggOf, writeTactic } from "../model/tactics"
import { askMatchup, NEW_ENEMY } from "./matchup-dialog"
import { bindTacticDrop } from "./tactic-drop"
import { editOpggLink, faceEnemy, newComp, opggTarget, selectComp } from "./team-comps"
import { renderEditor } from "./team-editor"
import { hooks, session } from "./team-session"
import { $, compById, cur, eventTarget, img, S, save, toast, touch } from "./team-store"

export function mountMatchups() {
  $("#editor").addEventListener("contextmenu", e => {
    if (!eventTarget(e).closest<HTMLElement>("[data-tactic-opgg]")) return
    e.preventDefault()
    void editOpggLink(opggTarget())
  })
  function handleTacticDrawerToggle(button: HTMLElement) {
    const open = S.tacticsDrawer === false
    S.tacticsDrawer = open
    save()
    const tx = button.closest(".tx"),
      aside = $("#tx-aside")
    tx?.classList.toggle("drawer-closed", !open)
    aside?.toggleAttribute("inert", !open)
    button.setAttribute("aria-expanded", String(open))
    button.title = open ? "Esconder a lista de composições e o draft" : "Mostrar a lista de composições e o draft"
  }
  // "Editar na Ordem do draft": numa adversária, abre a comp nossa que a enfrenta (ou a coloca contra a última usada).
  function handleOpenDraft() {
    const c = cur()
    S.view = "draft"
    S.tacticsGeneral = false
    if (isEnemy(c)) {
      const facing = oursOf(S.comps).find(x => enemyCompositionOf(x, S.comps) === c)
      const ours = facing || S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
      if (ours) {
        if (!facing) faceEnemy(ours, c.id)
        S.cur = ours.id
        session.side = "rival"
      }
    } else session.side = S.tacticsMatchup ? "rival" : "us"
    save()
    hooks.renderAll()
    hooks.publishRoute("comps")
    requestAnimationFrame(() => $("#editor .matchup-bar [data-matchup]")?.focus({ preventScroll: true }))
  }
  // Abre o confronto: a comp nossa com a adversária do outro lado e a tática própria dele.
  function openMatchup(id: string) {
    const entry = findMatchup(S.comps, id)
    if (!entry) return
    setEnemyId(entry.ours, entry.enemy.id)
    S.cur = entry.ours.id
    S.lastComp = entry.ours.id
    S.tacticsGeneral = false
    S.tacticsMatchup = id
    S.view = "tactics"
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
    const option = (x: Composition) => ({ id: x.id, name: x.name, preview: compositionPreview(x).map(img).join("") })
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
    openMatchupBetween(choice.ours, enemyId)
  }
  // Cria o confronto entre uma comp nossa e uma adversária (ou abre o que já existe).
  function openMatchupBetween(oursId: string, enemyId: string) {
    const ours = compById(oursId)
    if (!ours) return
    const existed = matchupsOf(ours).some(x => x.enemy === enemyId)
    const entry = addMatchup(ours, enemyId)
    touch(ours)
    openMatchup(entry.id)
    toast(existed ? "Esse confronto já existia. Abri ele." : "Confronto criado")
  }
  // Comp solta num lado do quadro da gaveta: fica nesse lado; a do time oposto, se estiver aberta, vira o par (confronto).
  function handleCompDrop(id: string, side: DraftSideKey) {
    const result = resolveCompDrop(
      S.comps,
      S.tacticsGeneral ? null : S.cur,
      S.tacticsGeneral ? null : (S.tacticsMatchup ?? null),
      id,
      side,
    )
    if (!result) return
    const placed = compById(result.place.id)
    if (placed) {
      draftOf(placed).side = result.place.side
      touch(placed)
    }
    if (result.matchup) {
      openMatchupBetween(result.matchup.ours, result.matchup.enemy)
      return
    }
    S.tacticsGeneral = false
    S.tacticsMatchup = null
    if (result.open !== S.cur) selectComp(result.open)
    else {
      save()
      renderEditor()
    }
  }
  bindTacticDrop($("#editor"), handleCompDrop)
  async function handleMatchupDelete(id: string) {
    const entry = findMatchup(S.comps, id)
    if (!entry) return
    const title = matchupTitle(entry.ours, entry.enemy)
    if (
      !(await confirmAction(
        `Excluir o confronto "${title}"? As composições ficam; só a tática dele é apagada.`,
        "Excluir confronto",
      ))
    )
      return
    removeMatchup(entry.ours, id)
    writeTactic(S, matchupKey(id), "", "", Date.now(), [])
    if (entry.ours.draft?.enemyId === entry.enemy.id) setEnemyId(entry.ours, null)
    if (S.tacticsMatchup === id) S.tacticsMatchup = null
    touch(entry.ours)
    save()
    hooks.renderAll()
    hooks.publishRoute("comps")
    $("#editor [data-tx-list=matchup]")?.click()
    $("#editor [data-tx-list=matchup]")?.focus({ preventScroll: true })
    toast(`Confronto "${title}" excluído`)
  }
  $("#editor").addEventListener("click", e => {
    const mxOpen = eventTarget(e).closest<HTMLElement>("[data-tactic-matchup]")
    if (mxOpen) {
      if (mxOpen.dataset.tacticMatchup !== S.tacticsMatchup || S.tacticsGeneral)
        openMatchup(mxOpen.dataset.tacticMatchup ?? "")
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
    const drawerToggle = eventTarget(e).closest<HTMLElement>("[data-tactic-drawer]")
    if (drawerToggle) {
      handleTacticDrawerToggle(drawerToggle)
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
        const on = b === listTab
        b.setAttribute("aria-selected", String(on))
        b.tabIndex = on ? 0 : -1
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
      const fromMatchup = !!S.tacticsMatchup
      if (general === !!S.tacticsGeneral && (general || id === S.cur) && !fromMatchup) return
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
