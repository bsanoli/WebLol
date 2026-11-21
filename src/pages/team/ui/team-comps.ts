// Composições nossas e adversárias: criar, trocar, renomear, duplicar, excluir e a barra de confronto.
import { compositionPreviewHTML } from "./composition-preview"
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { createCompositionCopy } from "../model/composition"
import { enemiesOf, isEnemy, oursOf, settleOwner } from "../model/composition-side"
import { blank, setChampions, uid, type Composition, type DraftLane, type DraftSide } from "../model/local-state"
import {
  addMatchup,
  detachMissingComps,
  findMatchup,
  matchupsOfComp,
  matchupTitle,
  oppositeSideOf,
} from "../model/matchups"
import { normalizeOpggLink, opggOf, setOpgg, writeTactic } from "../model/tactics"
import type { Matchup } from "../model/matchups"
import { deleteComp, editOpggLink, focusMatchup, handleRenameTo, renameComp } from "./team-comp-edits"
import { mountMatchupBar } from "./matchup-bar"
import { renderGrid } from "./team-grid"
import { hooks, boardEnemy, session } from "./team-session"
import { $, activeMatchup, boardSide, cur, compById, img, S, save, toast, touch } from "./team-store"

// Comp do lado do quadro onde está o elemento; fora do quadro, a comp aberta.
export const compOf = (el: Element | null | undefined) =>
  compById((el?.closest?.("[data-comp-id]") as HTMLElement | null)?.dataset.compId) || cur()
const matchupItem = (c: Composition, side: DraftSide) => ({
  id: c.id,
  name: c.name,
  title: c.name,
  preview: compositionPreviewHTML(c, img),
  side,
  champions: [...Object.values(c.lanes).flat(), ...c.bans],
})

export function renderMatchup() {
  const host = $("#editor .matchup-bar")
  if (!host) return
  const c = cur(),
    r = boardEnemy(),
    active = activeMatchup(),
    side = boardSide()
  mountMatchupBar(host, {
    ours: oursOf(S.comps).map(x => matchupItem(x, side)),
    enemies: enemiesOf(S.comps).map(x => matchupItem(x, oppositeSideOf(side))),
    current: matchupItem(c, side),
    enemy: r ? matchupItem(r, oppositeSideOf(side)) : null,
    side,
    matchup: active
      ? { id: active.id, title: matchupTitle({ matchup: active, ...entryOf(active) }), named: !!active.name }
      : null,
    enemyOpgg: r ? opggOf(r) : "",
    collapsed: S.matchupBarCollapsed === true,
    onToggleCollapsed: () => {
      S.matchupBarCollapsed = S.matchupBarCollapsed !== true
      save()
      renderMatchup()
      requestAnimationFrame(() =>
        requestAnimationFrame(() => $("#editor [data-matchup-collapse]")?.focus({ preventScroll: true })),
      )
    },
    onSelectOurs: id => {
      const open = activeMatchup()
      if (open) {
        open.ours = id
        open.updated = Date.now()
        S.cur = id
        if (!isEnemy(compById(id) ?? c)) S.lastComp = id
        save()
        hooks.renderAll()
        hooks.publishRoute("comps")
      } else selectComp(id)
      focusMatchup("ours")
    },
    onSelectEnemy: handleEnemySelect,
    onSide: next => {
      setBoardSide(next)
      save()
      hooks.renderEditor()
      renderGrid()
      $(`#editor [data-side-option="${oppositeSideOf(next)}"]`)?.focus({ preventScroll: true })
    },
    onRenameMatchup: () => void renameMatchup(),
    onLeaveMatchup: leaveMatchup,
    onNew: owner => newComp(owner),
    onMove: moveComp,
    onOpgg: id => void editOpggLink(compById(id)),
    onRename: id => void renameComp(id),
    onRenameTo: handleRenameTo,
    onDuplicate: duplicateComposition,
    onDelete: id => void deleteComp(id),
  })
}
const entryOf = (matchup: Matchup) => {
  const { ours, enemy } = findMatchup(S.comps, S.matchups, matchup.id) ?? { ours: null, enemy: null }
  return { ours, enemy }
}
/** Lado da nossa comp no confronto aberto; sem confronto aberto, cria um com a comp aberta. */
function setBoardSide(next: DraftSide) {
  const open = activeMatchup() ?? openMatchupFor(cur().id)
  open.side = next
  open.updated = Date.now()
}
function openMatchupFor(oursId: string, enemyId?: string) {
  const created = addMatchup(S.matchups, { ours: oursId, enemy: enemyId })
  S.curMatchup = created.id
  return created
}
/** Põe a adversária no confronto aberto (ou cria um confronto novo com a comp aberta). `null` tira a adversária. */
export function faceEnemy(enemyId: string | null) {
  const open = activeMatchup()
  if (open) {
    if (enemyId) open.enemy = enemyId
    else delete open.enemy
    open.updated = Date.now()
  } else if (enemyId) openMatchupFor(cur().id, enemyId)
}
async function renameMatchup() {
  const open = activeMatchup()
  if (!open) return
  const title = matchupTitle({ matchup: open, ...entryOf(open) })
  const value = await askName("Renomear confronto", open.name ?? title, "Nome do confronto (vazio volta ao padrão)")
  if (value === undefined) return
  const name = value.trim()
  if (name) open.name = name
  else delete open.name
  open.updated = Date.now()
  save()
  hooks.renderEditor()
  focusMatchup("ours")
}
function leaveMatchup() {
  S.curMatchup = null
  session.side = "us"
  save()
  hooks.renderAll()
  focusMatchup("ours")
}
function handleEnemySelect(id: string | null) {
  faceEnemy(id)
  session.side = id ? "rival" : "us"
  save()
  hooks.renderEditor()
  renderGrid()
  focusMatchup("rival")
  toast(id ? `Adversária: ${compById(id)?.name}` : "Adversária removida do draft")
}
export function selectComp(id: string) {
  S.cur = id
  const picked = compById(id)
  if (picked && !isEnemy(picked)) S.lastComp = id
  // A comp reabre o confronto mais recente dela.
  S.curMatchup = matchupsOfComp(S.matchups, id).find(item => item.ours === id)?.id ?? null
  if (!boardEnemy()) session.side = "us"
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
}
// Na Ordem do draft, a comp aberta é sempre nossa; uma adversária aberta em Táticas
// leva à comp nossa que a enfrenta (ou à última usada).
export function keepOurCompositionInDraft() {
  if (S.view !== "draft") return
  const c = cur()
  if (c && !isEnemy(c)) return
  const facing = c && S.matchups.find(x => x.enemy === c.id && x.ours && findMatchup(S.comps, S.matchups, x.id)?.ours)
  const next =
    (facing && compById(facing.ours)) || S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
  if (next) {
    S.cur = next.id
    S.curMatchup = facing?.id ?? matchupsOfComp(S.matchups, next.id).find(item => item.ours === next.id)?.id ?? null
    session.side = facing ? "rival" : "us"
  }
}
export function newComp(owner: "ours" | "enemy" = "ours") {
  const enemy = owner === "enemy",
    count = (enemy ? enemiesOf(S.comps) : oursOf(S.comps)).length + 1
  const faceIt = enemy && S.view === "draft" && !isEnemy(cur())
  const name = enemy ? `Adversária ${count}` : `Comp ${count}`
  const c = blank(name)
  settleOwner(c, owner)
  S.comps.unshift(c)
  session.active = "top"
  if (faceIt) {
    faceEnemy(c.id)
    session.side = "rival"
  } else {
    S.cur = c.id
    S.curMatchup = null
    S.tacticsGeneral = false
    if (!enemy) S.lastComp = c.id
    session.side = "us"
  }
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  if (faceIt) {
    focusMatchup("rival")
    toast(`Adversária "${name}" criada. Para trocar o nome, use o lápis no card do lado.`)
  } else
    setTimeout(() => {
      $("#cname").focus()
      $<HTMLInputElement>("#cname").select()
    }, 0)
}
// Campeão solto no lado adversário vazio: cria a adversária já com ele, na rota mais provável.
export function handleEnemyChampionDrop(name: string, lane: DraftLane) {
  const ours = cur()
  if (!ours || isEnemy(ours) || boardEnemy()) return
  const c = blank(`Adversária ${enemiesOf(S.comps).length + 1}`)
  settleOwner(c, "enemy")
  S.comps.unshift(c)
  setChampions(c, lane, [name])
  session.active = lane
  faceEnemy(c.id)
  session.side = "rival"
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  toast(`Adversária "${c.name}" criada com ${name}`)
}
function duplicateComposition(id: string) {
  const source = compById(id)
  if (!source) return
  const copy = createCompositionCopy(source, uid(), Date.now())
  S.comps.unshift(copy)
  // Na Ordem do draft, a cópia de uma adversária vira a adversária do quadro.
  if (isEnemy(copy) && S.view === "draft" && !isEnemy(cur())) {
    faceEnemy(copy.id)
    session.side = "rival"
  } else {
    S.cur = copy.id
    S.curMatchup = null
  }
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  focusMatchup(isEnemy(copy) && S.view === "draft" ? "rival" : "ours")
}
// Passa a comp de uma lista para a outra (menu ⋯ da barra de confronto).
function moveComp(id: string) {
  const c = compById(id)
  if (!c) return
  const toEnemy = !isEnemy(c)
  settleOwner(c, toEnemy ? "enemy" : "ours")
  touch(c)
  if (toEnemy) {
    if (id === S.cur) {
      const next = S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
      if (next) {
        S.cur = next.id
        S.curMatchup = matchupsOfComp(S.matchups, next.id).find(item => item.ours === next.id)?.id ?? null
        faceEnemy(id)
        session.side = "rival"
      }
    }
  } else {
    if (id === S.cur) S.lastComp = id
    if (!boardEnemy()) session.side = "us"
  }
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  focusMatchup(toEnemy && boardEnemy()?.id === id ? "rival" : "ours")
  toast(toEnemy ? `"${c.name}" agora é adversária` : `"${c.name}" agora é nossa`)
}
