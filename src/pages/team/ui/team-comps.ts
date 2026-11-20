// Composições nossas e adversárias: criar, trocar, renomear, duplicar, excluir e a barra de confronto.
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { createCompositionCopy } from "../model/composition"
import { enemiesOf, isEnemy, oursOf, setEnemyId, settleOwner } from "../model/composition-side"
import {
  blank,
  compositionPreview,
  draftOf,
  setChampions,
  uid,
  type Composition,
  type DraftLane,
} from "../model/local-state"
import { addMatchup, findMatchup, matchupKey, pruneMatchups } from "../model/matchups"
import { normalizeOpggLink, opggOf, setOpgg, writeTactic } from "../model/tactics"
import { mountMatchupBar } from "./matchup-bar"
import { renderGrid } from "./team-grid"
import { hooks, boardEnemy, session } from "./team-session"
import { $, cur, compById, img, S, save, toast, touch } from "./team-store"

// Comp do lado do quadro onde está o elemento; fora do quadro, a comp aberta.
export const compOf = (el: Element | null | undefined) =>
  compById((el?.closest?.("[data-comp-id]") as HTMLElement | null)?.dataset.compId) || cur()
const matchupItem = (c: Composition) => ({
  id: c.id,
  name: c.name,
  title: c.name,
  preview: compositionPreview(c).map(img).join(""),
  champions: [...Object.values(c.lanes).flat(), ...c.bans],
})

export function renderMatchup() {
  const host = $("#editor .matchup-bar")
  if (!host) return
  const c = cur(),
    r = boardEnemy()
  mountMatchupBar(host, {
    ours: oursOf(S.comps).map(matchupItem),
    enemies: enemiesOf(S.comps).map(matchupItem),
    current: matchupItem(c),
    enemy: r ? matchupItem(r) : null,
    side: draftOf(c).side,
    enemyOpgg: r ? opggOf(r) : "",
    onSelectOurs: id => {
      selectComp(id)
      focusMatchup("ours")
    },
    onSelectEnemy: handleEnemySelect,
    onSide: side => {
      draftOf(cur()).side = side
      touch()
      save()
      hooks.renderEditor()
      renderGrid()
      $(`#editor [data-side-option="${side}"]`)?.focus({ preventScroll: true })
    },
    onNew: owner => newComp(owner),
    onMove: moveComp,
    onOpgg: id => void editOpggLink(compById(id)),
    onRename: id => void renameComp(id),
    onRenameTo: handleRenameTo,
    onDuplicate: duplicateComposition,
    onDelete: id => void deleteComp(id),
  })
}
const focusMatchup = (kind: "ours" | "rival") =>
  requestAnimationFrame(() => $(`#editor [data-matchup="${kind}"]`)?.focus({ preventScroll: true }))
// Põe a adversária no draft da comp nossa e registra o confronto (a tática dele fica em Táticas › Confrontos).
export function faceEnemy(ours: Composition, enemyId: string | null) {
  setEnemyId(ours, enemyId)
  if (enemyId) addMatchup(ours, enemyId)
  touch(ours)
}
function handleEnemySelect(id: string | null) {
  faceEnemy(cur(), id)
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
  const facing = c && oursOf(S.comps).find(x => x.draft?.enemyId === c.id)
  const next = facing || S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
  if (next) {
    S.cur = next.id
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
    faceEnemy(cur(), c.id)
    session.side = "rival"
  } else {
    S.cur = c.id
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
// Nome editado direto no card do lado.
function handleRenameTo(id: string, value: unknown) {
  const c = compById(id),
    name = String(value || "").trim()
  if (!c || !name || name === c.name) return
  c.name = name
  touch(c)
  save()
  if (id === S.cur) {
    $<HTMLInputElement>("#cname").value = name
    $("#cname").title = name
  }
  hooks.renderEditor()
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
  faceEnemy(ours, c.id)
  session.side = "rival"
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  toast(`Adversária "${c.name}" criada com ${name}`)
}
async function renameComp(id: string) {
  const c = compById(id)
  if (!c) return
  const name = (await askName("Renomear composição", c.name, "Nome da composição"))?.trim()
  if (!name || name === c.name) return
  c.name = name
  touch(c)
  save()
  if (id === S.cur) {
    $<HTMLInputElement>("#cname").value = name
    $("#cname").title = name
  }
  hooks.renderEditor()
  focusMatchup(id === S.cur ? "ours" : "rival")
}
function duplicateComposition(id: string) {
  const source = compById(id)
  if (!source) return
  const copy = createCompositionCopy(source, uid(), Date.now())
  S.comps.unshift(copy)
  // Na Ordem do draft, a cópia de uma adversária vira a adversária do quadro.
  if (isEnemy(copy) && S.view === "draft" && !isEnemy(cur())) {
    faceEnemy(cur(), copy.id)
    session.side = "rival"
  } else S.cur = copy.id
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  focusMatchup(isEnemy(copy) && S.view === "draft" ? "rival" : "ours")
}
async function deleteComp(id: string) {
  const c = compById(id)
  if (!c || !(await confirmAction(`Excluir a comp "${c.name}"? As táticas dela também saem.`, "Excluir composição")))
    return false
  writeTactic(S, c.id, c.name, "", Date.now(), [])
  S.comps = S.comps.filter(x => x.id !== c.id)
  for (const x of S.comps) if (x.draft?.enemyId === c.id) setEnemyId(x, null)
  dropMatchupTactics()
  if (!S.comps.length) S.comps.push(blank())
  if (!compById(S.cur))
    S.cur = (S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0] || S.comps[0]).id
  if (!boardEnemy()) session.side = "us"
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  focusMatchup("ours")
  return true
}

function dropMatchupTactics() {
  for (const id of pruneMatchups(S.comps)) writeTactic(S, matchupKey(id), "", "", Date.now(), [])
  if (S.tacticsMatchup && !findMatchup(S.comps, S.tacticsMatchup)) S.tacticsMatchup = null
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
        faceEnemy(next, id)
        session.side = "rival"
      }
    }
  } else {
    for (const x of S.comps) if (x.draft?.enemyId === id) setEnemyId(x, null)
    dropMatchupTactics()
    if (id === S.cur) S.lastComp = id
    if (!boardEnemy()) session.side = "us"
  }
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  focusMatchup(toEnemy && boardEnemy()?.id === id ? "rival" : "ours")
  toast(toEnemy ? `"${c.name}" agora é adversária` : `"${c.name}" agora é nossa`)
}

// Botão direito no OP.GG troca o link; sem link, o clique esquerdo também pede.
// Na tática de um confronto, o OP.GG é o da adversária dele.
export const opggTarget = () => (S.tacticsMatchup ? findMatchup(S.comps, S.tacticsMatchup)?.enemy || cur() : cur())
export async function editOpggLink(target?: Composition) {
  const item = target || cur(),
    value = await askName("Link do OP.GG do time adversário", opggOf(item), "Endereço (deixe vazio para remover)")
  if (value === undefined) return
  const link = normalizeOpggLink(value)
  if (link === null) {
    toast("Link inválido. Cole o endereço completo do OP.GG.")
    return
  }
  setOpgg(item, link)
  touch(item)
  save()
  hooks.renderEditor()
  toast(link ? "Link do OP.GG salvo" : "Link do OP.GG removido")
  ;($("#editor [data-tactic-opgg]") || $("#editor [data-matchup-opgg]"))?.focus({ preventScroll: true })
}
