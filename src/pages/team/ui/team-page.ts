// @ts-nocheck -- O editor legado ainda depende de estado dinâmico vindo do armazenamento local.
import { askChoice, askName, confirmAction, showDialog } from "@/shared/ui/dialog-controls"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { lolAsset, lolChampion, lolImage } from "@/entities/champion"
import { ensureTeamPlays } from "@/entities/tactical-play"
import {
  clearTeamControls,
  mountDraftChampionMenu,
  mountMapEmpty,
  mountMapSwitch,
  mountTeamSelect,
  mountSectionTabs,
  mountToolGroup,
} from "./team-controls"
import { initializeTheme } from "@/shared/config/theme"
import { revealContent } from "@/shared/lib/motion"

import { CH } from "../model/champion-catalog"
import { createCompositionCopy } from "../model/composition"
import WS from "../api/worlds-champion-stats.json"
import { KEY, uid, blank, loadTeamState, compositionPreview, draftOf } from "../model/local-state"
import { PICKNAME } from "../model/draft-order"
import {
  enemiesOf,
  isEnemy,
  oppositeSide,
  oursOf,
  rivalOf,
  rivalOrder,
  setRival,
  settleTeam,
  teamOf,
} from "../model/composition-side"
import { draftBoardHTML } from "./draft-board"
import { mountMatchupBar } from "./matchup-bar"
import { mountTeamNavigation } from "./team-navigation"
import { tacticsHTML } from "./tactics"
import { bindTacticDrop } from "./tactic-drop"
import {
  adoptRivals,
  addMatchup,
  allMatchups,
  findMatchup,
  isMatchupKey,
  matchupKey,
  matchupTitle,
  matchupsOf,
  pruneMatchups,
  removeMatchup,
  resolveCompDrop,
} from "../model/matchups"
import { askMatchup, NEW_ENEMY } from "./matchup-dialog"
import {
  clearCompNotes,
  ensureTactics,
  hasTactic,
  normalizeOpggLink,
  opggOf,
  readTacticDocument,
  setOpgg,
  writeTactic,
  writeTacticDocument,
} from "../model/tactics"
import { compressImage } from "../lib/compress-image"
import { printStore } from "../api/print-store"
import { openPrintSketch } from "./print-sketch"
import { capturePickFeedback } from "./pick-feedback"
import { mountTeamSendButton, syncTeamSendButton } from "./team-send-button"
initializeTheme()

const LANES = [
  { k: "top", n: "Top", c: "--top" },
  { k: "jg", n: "Jungle", c: "--jg" },
  { k: "mid", n: "Mid", c: "--mid" },
  { k: "adc", n: "ADC", c: "--adc" },
  { k: "sup", n: "Suporte", c: "--sup" },
  { k: "ban", n: "Bans", c: "--ban" },
]
const LN = Object.fromEntries(LANES.map(l => [l.k, l]))
const $ = s => document.querySelector(s)
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
const ini = n =>
  n
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || n.slice(0, 2)
const byName = n => CH.find(c => c.n === n)
const champArt = n => lolChampion(byName(n)?.id || n)
const img = n => `<span class="av">${esc(ini(n))}${lolImage(champArt(n)?.portrait, "champ-portrait")}</span>`

/* ===== Estado / armazenamento ===== */
let S
const getState = () => S
const plays = () => ensureTeamPlays(S, uid)
const savedStatus = $("#saved")
const localSave = $("#local-save")

function setSaveStatus(message, failed = false) {
  if (savedStatus.textContent !== message) savedStatus.textContent = message
  localSave.toggleAttribute("data-save-error", failed)
  const description = $("#local-save-description")
  const help = failed
    ? "O navegador não conseguiu gravar as edições. Use Exportar para guardar uma cópia."
    : "As edições são salvas automaticamente neste navegador."
  if (description.textContent !== help) description.textContent = help
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S))
    setSaveStatus("Salvo neste navegador")
  } catch {
    setSaveStatus("Falha ao salvar", true)
  }
}

const cur = () => S.comps.find(c => c.id === S.cur)
document.addEventListener("click", event => {
  if (!localSave.contains(event.target) && !event.target.closest?.('[role="alertdialog"]')) {
    localSave.open = false
  }
})
localSave.addEventListener("keydown", event => {
  if (event.key !== "Escape" || !localSave.open) return
  localSave.open = false
  localSave.querySelector("summary").focus()
})

$("#clear-local").onclick = async () => {
  let rawBase, base
  try {
    rawBase = localStorage.getItem("lol-base")
    base = JSON.parse(rawBase)
    if (rawBase !== null && (!Array.isArray(base?.data?.comps) || !Array.isArray(base?.data?.plays))) {
      throw new Error("Base inválida")
    }
  } catch {
    toast("Não foi possível ler a versão salva do time.")
    return
  }

  const destination = base ? `a versão sincronizada do time (v${base.version})` : "os dados iniciais do site"
  const choice = await askChoice(
    "Restaurar dados locais?",
    `As composições e jogadas deste navegador serão substituídas por ${destination}. Envios para aprovação continuam na fila.`,
    [
      { value: "backup", label: "Baixar cópia" },
      { value: "restore", label: "Restaurar", destructive: true },
    ],
  )
  if (choice === "backup") {
    downloadTeamBackup()
    return
  }
  if (choice !== "restore") return

  try {
    if (localStorage.getItem("lol-base") !== rawBase) {
      toast("A versão do time mudou. Abra a restauração novamente.")
      return
    }
    if (base) {
      const { comps, plays } = base.data
      const tactics = Array.isArray(base.data.tactics) ? base.data.tactics : []
      localStorage.setItem(
        KEY,
        JSON.stringify({
          comps,
          plays,
          tactics,
          view: S.view,
          cur: comps.find(comp => comp.id === S.cur)?.id ?? comps[0]?.id,
          curPlay: plays.find(play => play.id === S.curPlay)?.id ?? plays[0]?.id,
        }),
      )
    } else {
      localStorage.removeItem(KEY)
    }
  } catch {
    toast("Não foi possível restaurar os dados locais.")
    return
  }
  window.location.reload()
}
let active = "top"
// Lado do quadro em edição: a comp aberta ("us") ou a adversária escolhida ("rival").
let activeSide = "us"

let toastTimer = 0
function toast(m, undo) {
  const t = $("#toast")
  t.textContent = m
  if (undo) {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "toast-action"
    b.textContent = "Desfazer"
    b.setAttribute("data-slot", "button")
    b.setAttribute("data-variant", "ghost")
    b.setAttribute("data-size", "sm")
    b.addEventListener("click", () => {
      undo()
      t.classList.remove("on")
    })
    t.append(" ", b)
  }
  t.classList.toggle("has-action", !!undo)
  t.classList.add("on")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove("on"), undo ? 6000 : 2200)
}

/* ===== Comps: nossas e adversárias ===== */
const compById = id => S.comps.find(c => c.id === id)
const rival = () => rivalOf(cur(), S.comps)
// Comp que recebe as edições do quadro e da grade de campeões.
function target() {
  if (S.view !== "map" && activeSide === "rival") {
    const r = rival()
    if (r) return r
    activeSide = "us"
  }
  return cur()
}
// Comp do lado do quadro onde está o elemento; fora do quadro, a comp aberta.
const compOf = el => compById(el?.closest?.("[data-comp-id]")?.dataset.compId) || cur()
const touch = (comp = cur()) => {
  comp.updated = Date.now()
  settleTeam(comp)
}
const matchupItem = c => ({
  id: c.id,
  name: c.name,
  title: c.name,
  preview: compositionPreview(c).map(img).join(""),
  champions: Object.values(c.lanes).flat(),
})

function renderMatchup() {
  const host = $("#editor .matchup-bar")
  if (!host) return
  const c = cur(),
    r = rival()
  mountMatchupBar(host, {
    ours: oursOf(S.comps).map(matchupItem),
    enemies: enemiesOf(S.comps).map(matchupItem),
    current: matchupItem(c),
    rival: r ? matchupItem(r) : null,
    side: draftOf(c).side,
    rivalOpgg: r ? opggOf(r) : "",
    onSelectOurs: id => {
      selectComp(id)
      focusMatchup("ours")
    },
    onSelectRival: handleRivalSelect,
    onSide: side => {
      draftOf(cur()).side = side
      touch()
      save()
      renderEditor()
      renderGrid()
      $(`#editor [data-side-option="${side}"]`)?.focus({ preventScroll: true })
    },
    onNew: team => newComp(team),
    onMove: moveComp,
    onOpgg: id => void editOpggLink(compById(id)),
    onRename: id => void renameComp(id),
    onRenameTo: handleRenameTo,
    onDuplicate: duplicateComposition,
    onDelete: id => void deleteComp(id),
  })
}
const focusMatchup = kind =>
  requestAnimationFrame(() => $(`#editor [data-matchup="${kind}"]`)?.focus({ preventScroll: true }))
// Põe a adversária no draft da comp nossa e registra o confronto (a tática dele fica em Táticas › Confrontos).
function faceEnemy(ours, enemyId) {
  setRival(ours, enemyId)
  if (enemyId) addMatchup(ours, enemyId)
  touch(ours)
}
function handleRivalSelect(id) {
  faceEnemy(cur(), id)
  activeSide = id ? "rival" : "us"
  save()
  renderEditor()
  renderGrid()
  focusMatchup("rival")
  toast(id ? `Adversária: ${compById(id)?.name}` : "Adversária removida do draft")
}
function selectComp(id) {
  S.cur = id
  if (!isEnemy(compById(id))) S.lastComp = id
  if (!rival()) activeSide = "us"
  save(false)
  renderAll()
  publishTeamRoute("comps")
}
// Na Ordem do draft, a comp aberta é sempre nossa; uma adversária aberta em Táticas
// leva à comp nossa que a enfrenta (ou à última usada).
function keepOurCompositionInDraft() {
  if (S.view !== "draft") return
  const c = cur()
  if (c && !isEnemy(c)) return
  const facing = c && oursOf(S.comps).find(x => x.draft?.rival === c.id)
  const next = facing || S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
  if (next) {
    S.cur = next.id
    activeSide = facing ? "rival" : "us"
  }
}
function newComp(team = "mine") {
  const enemy = team === "enemy",
    count = (enemy ? enemiesOf(S.comps) : oursOf(S.comps)).length + 1
  const faceIt = enemy && S.view === "draft" && !isEnemy(cur())
  const name = enemy ? `Adversária ${count}` : `Comp ${count}`
  const c = blank(name)
  settleTeam(c, team)
  S.comps.unshift(c)
  active = "top"
  if (faceIt) {
    faceEnemy(cur(), c.id)
    activeSide = "rival"
  } else {
    S.cur = c.id
    S.tacticsGeneral = false
    if (!enemy) S.lastComp = c.id
    activeSide = "us"
  }
  save()
  renderAll()
  publishTeamRoute("comps")
  if (faceIt) {
    focusMatchup("rival")
    toast(`Adversária "${name}" criada. Para trocar o nome, use o lápis no card do lado.`)
  } else
    setTimeout(() => {
      $("#cname").focus()
      $("#cname").select()
    }, 0)
}
// Nome editado direto no card do lado.
function handleRenameTo(id, value) {
  const c = compById(id),
    name = String(value || "").trim()
  if (!c || !name || name === c.name) return
  c.name = name
  touch(c)
  save()
  if (id === S.cur) {
    $("#cname").value = name
    $("#cname").title = name
  }
  renderEditor()
}
// Campeão solto no lado adversário vazio: cria a adversária já com ele, na rota mais provável.
function handleRivalChampionDrop(name, lane) {
  const ours = cur()
  if (!ours || isEnemy(ours) || rival()) return
  const c = blank(`Adversária ${enemiesOf(S.comps).length + 1}`)
  settleTeam(c, "enemy")
  S.comps.unshift(c)
  c.lanes[lane] = [name]
  active = lane
  faceEnemy(ours, c.id)
  activeSide = "rival"
  save()
  renderAll()
  publishTeamRoute("comps")
  toast(`Adversária "${c.name}" criada com ${name}`)
}
async function renameComp(id) {
  const c = compById(id)
  if (!c) return
  const name = (await askName("Renomear composição", c.name, "Nome da composição"))?.trim()
  if (!name || name === c.name) return
  c.name = name
  touch(c)
  save()
  if (id === S.cur) {
    $("#cname").value = name
    $("#cname").title = name
  }
  renderEditor()
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
    activeSide = "rival"
  } else S.cur = copy.id
  save()
  renderAll()
  publishTeamRoute("comps")
  focusMatchup(isEnemy(copy) && S.view === "draft" ? "rival" : "ours")
}
async function deleteComp(id) {
  const c = compById(id)
  if (!c || !(await confirmAction(`Excluir a comp "${c.name}"? As táticas dela também saem.`, "Excluir composição")))
    return false
  writeTactic(S, c.id, c.name, "", Date.now(), [])
  S.comps = S.comps.filter(x => x.id !== c.id)
  for (const x of S.comps) if (x.draft?.rival === c.id) setRival(x, null)
  dropMatchupTactics()
  if (!S.comps.length) S.comps.push(blank())
  if (!compById(S.cur))
    S.cur = (S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0] || S.comps[0]).id
  if (!rival()) activeSide = "us"
  save()
  renderAll()
  publishTeamRoute("comps")
  focusMatchup("ours")
  return true
}

function dropMatchupTactics() {
  for (const id of pruneMatchups(S.comps)) writeTactic(S, matchupKey(id), "", "", Date.now(), [])
  if (S.tacticsMatchup && !findMatchup(S.comps, S.tacticsMatchup)) S.tacticsMatchup = null
}
// Passa a comp de uma lista para a outra (menu ⋯ da barra de confronto).
function moveComp(id) {
  const c = compById(id)
  if (!c) return
  const toEnemy = !isEnemy(c)
  settleTeam(c, toEnemy ? "enemy" : "mine")
  touch(c)
  if (toEnemy) {
    if (id === S.cur) {
      const next = S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
      if (next) {
        S.cur = next.id
        faceEnemy(next, id)
        activeSide = "rival"
      }
    }
  } else {
    for (const x of S.comps) if (x.draft?.rival === id) setRival(x, null)
    dropMatchupTactics()
    if (id === S.cur) S.lastComp = id
    if (!rival()) activeSide = "us"
  }
  save()
  renderAll()
  publishTeamRoute("comps")
  focusMatchup(toEnemy && rival()?.id === id ? "rival" : "ours")
  toast(toEnemy ? `"${c.name}" agora é adversária` : `"${c.name}" agora é nossa`)
}

/* ===== Editor ===== */
// Arte em alta (1215×717) direto do Data Dragon; se não carregar, usa a cópia local menor.
function pickArt(name) {
  const local = name ? champArt(name)?.splash : ""
  if (!local) return ""
  const id = local.match(/splash\/(.+)\.webp$/)?.[1]
  if (!id) return lolImage(local, "pick-splash")
  return `<img alt="" class="pick-splash" loading="lazy" src="https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg" onerror="this.onerror=()=>this.remove();this.src='assets/${local}'">`
}

function renderEditor() {
  if (S.view !== "tactics") S.view = "draft"
  if (adoptRivals(S.comps)) save(false)
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
  const nameInput = $("#cname")
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
      S.view = value
      save(false)
      renderAll()
      publishTeamRoute("comps")
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
        LN,
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
    if (closePicker) renderTarget()
    return
  }
  if (isEnemy(c)) {
    // Só há adversárias: a Ordem do draft precisa de uma comp nossa.
    editor.insertAdjacentHTML(
      "beforeend",
      `<div id="composition-panel" role="tabpanel" aria-labelledby="tab-draft"><div class="draft-no-ours" role="status">
      <p>Nenhuma composição nossa ainda. Crie uma para montar o draft contra as adversárias.</p>
      <button type="button" data-slot="button" data-variant="default" data-size="sm" data-comp-new="mine">${iconMarkup("plus")} Nova composição nossa</button></div></div>`,
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
  ${draftBoardHTML(c, rival(), { active, activeSide, LN, img, esc, pickArt })}
  <p class="help">Selecione o retrato para torná-lo principal. Para remover, abra o menu do retrato com o botão direito ou Shift+F10.</p></div>`,
  )
  renderMatchup()
  editor.querySelectorAll(".dchip").forEach(host => {
    const { n, from } = host.dataset
    mountDraftChampionMenu(host, n, () => removeChampion(n, from, compOf(host)))
  })
  editor.querySelectorAll("select[data-pick-position]").forEach(mountTeamSelect)
  placePicker()
  $("#grid").scrollTop = gridScroll
  renderTarget()
  editor.dataset.motionComposition = c.id
  editor.dataset.motionView = view
  if (previousComposition !== c.id) revealContent(editor)
  else if (previousView !== view) revealContent(editor, true)
  else showPickFeedback?.()
}
const focusDraftTarget = (lane, side = activeSide) =>
  $(`#editor [data-draft-target="${lane}"][data-draft-side="${side}"]`)?.focus({ preventScroll: true })
$("#v-comps").addEventListener("input", e => {
  if (e.target.id !== "cname") return
  const c = cur()
  c.name = e.target.value
  e.target.title = c.name
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
  if (!e.target.matches("select[data-pick-position]")) return
  const rivalSide = e.target.dataset.draftSide === "rival",
    owner = rivalSide ? rival() : cur()
  if (!owner) return
  const order = rivalSide ? rivalOrder(cur(), owner) : draftOf(owner).order[draftOf(owner).side],
    i = Number(e.target.dataset.pickPosition)
  const lane = e.target.value,
    j = order.indexOf(lane)
  ;[order[i], order[j]] = [lane, order[i]]
  active = lane
  activeSide = rivalSide ? "rival" : "us"
  touch(owner)
  save()
  renderEditor()
  const side = rivalSide ? "rival" : "us"
  requestAnimationFrame(() =>
    $(`[data-pick-position="${i}"][data-draft-side="${side}"] + .team-select button`)?.focus({ preventScroll: true }),
  )
})
function reorderChampion(name, lane, comp = target()) {
  const champions = comp.lanes[lane],
    index = champions.indexOf(name)
  if (index < 0) return
  champions.splice(index, 1)
  champions.unshift(name)
  active = lane
  activeSide = comp === cur() ? "us" : "rival"
  touch(comp)
  save()
  renderEditor()
  renderGrid()
  focusDraftTarget(lane)
}
function removeChampion(name, lane, comp = target()) {
  comp.lanes[lane] = comp.lanes[lane].filter(champion => champion !== name)
  touch(comp)
  save()
  renderEditor()
  renderGrid()
  focusDraftTarget(lane, comp === cur() ? "us" : "rival")
}
$("#editor").addEventListener("click", e => {
  if (e.target.closest("[data-picker]")) {
    openPicker()
    return
  }
  if (e.target.closest("[data-new-rival]")) {
    newComp("enemy")
    return
  }
  if (e.target.closest("[data-choose-rival]")) {
    $('#editor .matchup-bar [data-matchup="rival"]')?.click()
    return
  }
  const priority = e.target.closest("[data-priority]")
  if (priority) {
    reorderChampion(priority.dataset.priority, priority.dataset.lane, compOf(priority))
    return
  }
  const rm = e.target.closest("[data-rm]")
  if (rm) {
    removeChampion(rm.dataset.rm, rm.closest("[data-l]").dataset.l, compOf(rm))
    return
  }

  const draftTarget = e.target.closest("[data-draft-target]")
  if (draftTarget) {
    active = draftTarget.dataset.draftTarget
    activeSide = draftTarget.dataset.draftSide || "us"
    if (S.view === "tactics") {
      renderEditor()
      openTacticsPicker()
      return
    }
    renderEditor()
    renderGrid()
    focusDraftTarget(active)
    return
  }
  if (
    e.target.closest("details,[data-team-control]") ||
    ["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(e.target.tagName)
  )
    return
  const ln = e.target.closest("[data-comp-id] [data-l]")
  const side = ln?.closest("[data-board-side]")?.dataset.boardSide
  if (ln && (ln.dataset.l !== active || side !== activeSide)) {
    active = ln.dataset.l
    activeSide = side || "us"
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
// arrastar e soltar
let drag = null
document.addEventListener("dragstart", e => {
  const ch = e.target.closest(".chip,.ch,.dm,.pk-target[data-n]")
  if (!ch) return
  drag = {
    n: ch.dataset.n,
    from: ch.dataset.from || null,
    comp: ch.closest("[data-comp-id]")?.dataset.compId || null,
    el: ch.closest(".pk,.bsq") || ch,
  }
  e.dataTransfer.setData("text/plain", ch.dataset.n)
  e.dataTransfer.effectAllowed = "move"
  if (drag.from) requestAnimationFrame(() => drag?.el.classList.add("dragging"))
})
$("#editor").addEventListener("dragover", e => {
  const ln = e.target.closest("[data-comp-id] [data-l],[data-empty-rival][data-l]")
  if (!ln || !drag) return
  e.preventDefault()
  document.querySelectorAll(".drop").forEach(x => x !== ln && x.classList.remove("drop"))
  ln.classList.add("drop")
})
$("#editor").addEventListener("dragleave", e => {
  const ln = e.target.closest("[data-l]")
  if (ln && !ln.contains(e.relatedTarget)) ln.classList.remove("drop")
})
$("#editor").addEventListener("drop", e => {
  const ln = e.target.closest("[data-comp-id] [data-l],[data-empty-rival][data-l]")
  if (!ln || !drag) return
  e.preventDefault()
  if (ln.hasAttribute("data-empty-rival")) {
    const n = drag.n,
      from = drag.from,
      src = drag.comp ? compById(drag.comp) : null
    drag = null
    if (from && src) {
      src.lanes[from] = src.lanes[from].filter(x => x !== n)
      touch(src)
    }
    handleRivalChampionDrop(n, ln.dataset.l)
    return
  }
  const to = ln.dataset.l,
    c = compOf(ln),
    n = drag.n,
    source = drag.comp ? compById(drag.comp) : null
  if (drag.from && source) {
    source.lanes[drag.from] = source.lanes[drag.from].filter(x => x !== n)
    if (source !== c) touch(source)
  }
  const arr = c.lanes[to].filter(x => x !== n)
  const over = e.target.closest(".chip,.dm")
  let idx = ln.dataset.bi != null ? Math.min(+ln.dataset.bi, arr.length) : arr.length
  if (over && over.dataset.n !== n && ln.dataset.bi == null) {
    idx = arr.indexOf(over.dataset.n)
    const r = over.getBoundingClientRect()
    if (e.clientX > r.left + r.width / 2) idx++
  }
  arr.splice(idx, 0, n)
  c.lanes[to] = arr
  drag = null
  active = to
  activeSide = c === cur() ? "us" : "rival"
  touch(c)
  save()
  renderEditor()
  renderGrid()
})
// Campeão arrastado de um card e solto fora dos cards: sai da lista, com Desfazer. Cancelar (Esc) ou soltar fora da janela não remove.
document.addEventListener("dragend", e => {
  const d = drag
  drag = null
  document.querySelectorAll(".drop,.dragging").forEach(x => x.classList.remove("drop", "dragging"))
  const inside = e.clientX > 0 && e.clientY > 0 && e.clientX < innerWidth && e.clientY < innerHeight
  if (!d || !d.from || !d.comp || !inside) return
  const c = compById(d.comp)
  if (!c || !c.lanes[d.from]?.includes(d.n)) return
  const lane = d.from,
    before = [...c.lanes[lane]]
  c.lanes[lane] = before.filter(x => x !== d.n)
  touch(c)
  save()
  renderEditor()
  renderGrid()
  toast(`${d.n} removido`, () => {
    c.lanes[lane] = before
    touch(c)
    save()
    renderEditor()
    renderGrid()
  })
})

/* ===== Grade de campeões ===== */
let role = "all"
const ROLEBTN = [{ k: "all", n: "Todos" }, ...LANES.filter(l => l.k !== "ban")]
$("#roles").innerHTML = ROLEBTN.map(
  ({ k, n }) =>
    `<button data-slot="button" data-variant="ghost" data-size="sm" data-r="${k}" aria-pressed="${k === "all"}" class="${k === "all" ? "on" : ""}"><span class="lane-label">${laneIconMarkup(k)}${n}</span></button>`,
).join("")
$("#roles").onclick = e => {
  const b = e.target.closest("button")
  if (!b) return
  role = b.dataset.r
  document.querySelectorAll("#roles button").forEach(x => {
    x.classList.toggle("on", x === b)
    x.setAttribute("aria-pressed", String(x === b))
  })
  resetGrid()
}
const resetGrid = () => {
  renderGrid()
  $("#grid").scrollTop = 0
}
$("#search").oninput = resetGrid
$("#sort").onchange = resetGrid
function renderTarget() {
  const c = target(),
    us = cur(),
    rivalSide = c !== us
  $("#grid")
    .querySelectorAll(".ch")
    .forEach(button => button.setAttribute("aria-pressed", c.lanes[active].includes(button.dataset.n)))
  // Qual slot recebe o campeão: no lado adversário, os picks seguem a ordem dele.
  const side = rivalSide ? oppositeSide(draftOf(us).side) : draftOf(us).side,
    team = side[0].toUpperCase()
  const order = rivalSide ? rivalOrder(us, c) : draftOf(us).order[side]
  const pos = LANES.find(p => p.k === active)
  const slot = active === "ban" || !pos ? "Bans" : `${PICKNAME[team + (order.indexOf(active) + 1)]} · ${pos.n}`
  const heading = $("#target")
  heading.hidden = false
  heading.className = `draft-editing-target ${side}`
  heading.setAttribute("aria-live", "polite")
  heading.textContent = `Editando: ${slot} · ${c.name}`
}
function renderGrid() {
  if (S.view === "tactics" && !closePicker) return
  const q = $("#search")
      .value.toLowerCase()
      .replace(/[^a-z]/g, ""),
    c = target(),
    srt = $("#sort").value
  const where = {}
  for (const l of LANES) for (const n of c.lanes[l.k]) (where[n] = where[n] || []).push(l)
  let L = CH.filter(
    ch =>
      (!q ||
        ch.n
          .toLowerCase()
          .replace(/[^a-z]/g, "")
          .includes(q)) &&
      (role === "all" || ch.r.includes(role)),
  )
  if (srt === "ws") L.sort((a, b) => (WS.c[b.n] || [0])[0] - (WS.c[a.n] || [0])[0] || a.n.localeCompare(b.n))
  else if (srt === "wsb")
    L.sort((a, b) => (WS.c[b.n] || [0, 0, 0])[2] - (WS.c[a.n] || [0, 0, 0])[2] || a.n.localeCompare(b.n))
  else L.sort((a, b) => a.n.localeCompare(b.n))
  $("#grid").innerHTML =
    L.map(ch => {
      const w = WS.c[ch.n],
        wh = where[ch.n]
      return `<button class="ch${wh ? " in" : ""}" aria-pressed="${c.lanes[active].includes(ch.n)}" draggable="true" data-n="${esc(ch.n)}" aria-label="${esc(ch.n)}">${img(ch.n)}
      ${wh ? `<span class="tag" style="--lc:var(${wh[0].c})">${wh.map(l => l.n.slice(0, 3).toUpperCase()).join("/")}</span>` : ""}
      ${srt !== "az" && w ? `<span class="ws">${srt === "ws" ? w[0] : w[2]}</span>` : ""}
      <span class="nm">${esc(ch.n)}</span></button>`
    }).join("") || '<p class="composition-empty" role="status">Nenhum campeão encontrado.</p>'
  $("#gfoot").textContent = ""
}
$("#grid").onclick = e => {
  const ch = e.target.closest(".ch")
  if (!ch) return
  const n = ch.dataset.n,
    c = target(),
    a = c.lanes[active]
  if (a.includes(n)) c.lanes[active] = a.filter(x => x !== n)
  else a.push(n)
  touch(c)
  save()
  renderEditor()
  renderGrid()
  ;[...$("#grid").querySelectorAll(".ch")].find(button => button.dataset.n === n)?.focus({ preventScroll: true })
}

let closePicker
const picker = $("#champ-picker")
function openPicker() {
  if (closePicker) return
  closePicker = showDialog({
    title: "Campeões",
    children: picker,
    id: "picker-dialog",
    className: "wl-picker-dialog wl-panel",
    initialFocus: () => $("#search"),
    onClose: () => {
      closePicker = undefined
      $("#comps").append(picker)
      placePicker()
      document.querySelector("[data-picker]")?.focus({ preventScroll: true })
    },
  })
}
$("#close-picker").onclick = () => closePicker?.()
// Na ordem do draft em tela larga, o catálogo fica no centro, entre os dois lados.
function placePicker() {
  const catalog = picker
  if (closePicker) return
  const slot = document.querySelector("#editor .dz-slot")
  if (slot && window.matchMedia("(min-width: 1100px)").matches) {
    if (catalog.parentElement !== slot) slot.append(catalog)
  } else if (catalog.parentElement !== $("#comps")) $("#comps").append(catalog)
}
window.matchMedia("(min-width: 1100px)").addEventListener("change", () => placePicker())
/* ===== Táticas ===== */
// Botão direito no OP.GG troca o link; sem link, o clique esquerdo também pede.
// Na tática de um confronto, o OP.GG é o da adversária dele.
const opggTarget = () => (S.tacticsMatchup ? findMatchup(S.comps, S.tacticsMatchup)?.enemy || cur() : cur())
async function editOpggLink(target) {
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
  renderEditor()
  toast(link ? "Link do OP.GG salvo" : "Link do OP.GG removido")
  ;($("#editor [data-tactic-opgg]") || $("#editor [data-matchup-opgg]"))?.focus({ preventScroll: true })
}
$("#editor").addEventListener("contextmenu", e => {
  if (!e.target.closest("[data-tactic-opgg]")) return
  e.preventDefault()
  void editOpggLink(opggTarget())
})
/* ===== Bloco de notas das táticas ===== */
// O editor (Tiptap) vive num elemento próprio que sobrevive às re-renderizações do #editor;
// trocar de tática recria o editor com o documento dela.
let notesHost = null,
  noteChampionList = null
const noteChampions = () =>
  (noteChampionList ||= CH.map(ch => ({
    name: ch.n,
    portrait: champArt(ch.n)?.portrait ? lolAsset(champArt(ch.n).portrait) : "",
  })))
function markTacticTab(compId) {
  const tab = $(
    compId === null
      ? "#editor [data-tactic-general]"
      : isMatchupKey(compId)
        ? `#editor [data-tactic-matchup="${CSS.escape(compId.slice(3))}"]`
        : `#editor .tx-tabs [data-tactic-comp="${CSS.escape(compId)}"]`,
  )
  const has = hasTactic(S, compId),
    mark = tab?.querySelector(".tx-has")
  if (has && !mark)
    tab
      ?.querySelector("b")
      ?.insertAdjacentHTML(
        "beforeend",
        `<span class="tx-has" title="Tem anotação de tática">${iconMarkup("edit")}</span>`,
      )
  else if (!has) mark?.remove()
}
function handleTacticNotesChange(compId, doc) {
  const entry = isMatchupKey(compId) ? findMatchup(S.comps, compId.slice(3)) : null
  const comp = compId === null || entry ? null : compById(compId)
  if (compId !== null && !comp && !entry) return
  writeTacticDocument(S, compId, entry ? matchupTitle(entry.ours, entry.enemy) : comp?.name || "", doc, Date.now())
  // As anotações antigas da comp já estão no documento gravado.
  if (comp && clearCompNotes(comp)) touch(comp)
  save()
  markTacticTab(compId)
}
function mountTacticNotesIn(root, compId) {
  const slot = root.querySelector("[data-tactic-notes-slot]")
  if (!slot) return
  const key = compId ?? "geral"
  if (!notesHost) {
    notesHost = document.createElement("div")
    notesHost.className = "tx-notes-host"
    notesHost.innerHTML = `<p class="tx-notes-loading">Carregando o bloco de notas…</p>`
  }
  slot.replaceWith(notesHost)
  const store = printStore()
  const props = {
    doc: readTacticDocument(S, compId),
    labelledBy: "tx-title",
    champions: noteChampions(),
    store,
    compressImage,
    toast,
    sketch: attrs => openPrintSketch({ attrs, store, compressImage, toast }),
    onChange: doc => handleTacticNotesChange(compId, doc),
  }
  void import("./tactic-notes")
    .then(({ mountTacticNotes }) => {
      if (notesHost.isConnected) mountTacticNotes(notesHost, key, props)
    })
    .catch(() => toast("Não consegui abrir o bloco de notas. Recarregue a página."))
}
function handleTacticDrawerToggle(button) {
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
    const facing = oursOf(S.comps).find(x => rivalOf(x, S.comps) === c)
    const ours = facing || S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0]
    if (ours) {
      if (!facing) faceEnemy(ours, c.id)
      S.cur = ours.id
      activeSide = "rival"
    }
  } else activeSide = S.tacticsMatchup ? "rival" : "us"
  save()
  renderAll()
  publishTeamRoute("comps")
  requestAnimationFrame(() => $("#editor .matchup-bar [data-matchup]")?.focus({ preventScroll: true }))
}
// Abre o confronto: a comp nossa com a adversária do outro lado e a tática própria dele.
function openMatchup(id) {
  const entry = findMatchup(S.comps, id)
  if (!entry) return
  setRival(entry.ours, entry.enemy.id)
  S.cur = entry.ours.id
  S.lastComp = entry.ours.id
  S.tacticsGeneral = false
  S.tacticsMatchup = id
  S.view = "tactics"
  save()
  renderAll()
  publishTeamRoute("comps")
  $("#editor [data-tactic-matchup][aria-pressed=true]")?.focus({ preventScroll: true })
}
async function handleNewMatchup() {
  const ours = oursOf(S.comps),
    enemies = enemiesOf(S.comps)
  if (!ours.length) {
    toast("Crie uma composição nossa antes de montar um confronto")
    return
  }
  const option = x => ({ id: x.id, name: x.name, preview: compositionPreview(x).map(img).join("") })
  const choice = await askMatchup(ours.map(option), enemies.map(option), isEnemy(cur()) ? ours[0].id : cur().id)
  if (!choice) return
  let enemyId = choice.enemy
  if (enemyId === NEW_ENEMY) {
    const name = (
      await askName("Nova composição adversária", `Adversária ${enemies.length + 1}`, "Nome da composição adversária")
    )?.trim()
    if (!name) return
    const created = blank(name)
    settleTeam(created, "enemy")
    S.comps.unshift(created)
    enemyId = created.id
  }
  openMatchupBetween(choice.ours, enemyId)
}
// Cria o confronto entre uma comp nossa e uma adversária (ou abre o que já existe).
function openMatchupBetween(oursId, enemyId) {
  const mine = compById(oursId),
    existed = matchupsOf(mine).some(x => x.enemy === enemyId)
  const entry = addMatchup(mine, enemyId)
  touch(mine)
  openMatchup(entry.id)
  toast(existed ? "Esse confronto já existia. Abri ele." : "Confronto criado")
}
// Comp solta num lado do quadro da gaveta: fica nesse lado; a do time oposto, se estiver aberta, vira o par (confronto).
function handleCompDrop(id, side) {
  const result = resolveCompDrop(
    S.comps,
    S.tacticsGeneral ? null : S.cur,
    S.tacticsGeneral ? null : S.tacticsMatchup,
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
async function handleMatchupDelete(id) {
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
  if (entry.ours.draft?.rival === entry.enemy.id) setRival(entry.ours, null)
  if (S.tacticsMatchup === id) S.tacticsMatchup = null
  touch(entry.ours)
  save()
  renderAll()
  publishTeamRoute("comps")
  $("#editor [data-tx-list=matchup]")?.click()
  $("#editor [data-tx-list=matchup]")?.focus({ preventScroll: true })
  toast(`Confronto "${title}" excluído`)
}
$("#editor").addEventListener("click", e => {
  const mxOpen = e.target.closest("[data-tactic-matchup]")
  if (mxOpen) {
    if (mxOpen.dataset.tacticMatchup !== S.tacticsMatchup || S.tacticsGeneral) openMatchup(mxOpen.dataset.tacticMatchup)
    return
  }
  const mxDelete = e.target.closest("[data-matchup-delete]")
  if (mxDelete) {
    void handleMatchupDelete(mxDelete.dataset.matchupDelete)
    return
  }
  if (e.target.closest("[data-matchup-new]")) {
    void handleNewMatchup()
    return
  }
  const drawerToggle = e.target.closest("[data-tactic-drawer]")
  if (drawerToggle) {
    handleTacticDrawerToggle(drawerToggle)
    return
  }
  if (e.target.closest("[data-tactic-opgg]")) {
    const link = opggOf(opggTarget())
    if (link) window.open(link, "_blank", "noopener")
    else void editOpggLink(opggTarget())
    return
  }
  if (e.target.closest("[data-open-draft]")) {
    handleOpenDraft()
    return
  }
  const listTab = e.target.closest("[data-tx-list]")
  if (listTab) {
    const wrap = listTab.closest(".tx-tabs")
    wrap.querySelectorAll("[data-tx-list]").forEach(b => {
      const on = b === listTab
      b.setAttribute("aria-selected", String(on))
      b.tabIndex = on ? 0 : -1
    })
    wrap.querySelectorAll(".tx-group").forEach(g => {
      g.hidden = g.id !== `tx-list-${listTab.dataset.txList}`
    })
    return
  }
  const tacticTab = e.target.closest("[data-tactic-comp],[data-tactic-general]")
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
    } else if (id !== S.cur) selectComp(id)
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
  const create = e.target.closest("[data-comp-new]")
  if (create) void newComp(create.dataset.compNew || "mine")
})
window.matchMedia("(min-width: 1100px)").addEventListener("change", e => {
  if (e.matches) closePicker?.()
})

/* ===== Exportar / Importar ===== */
function downloadTeamBackup() {
  const blob = new Blob(
    [
      JSON.stringify(
        { app: "lol-comps-time", version: 1, exported: new Date().toISOString(), comps: S.comps, plays: S.plays },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  )
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `comps-time-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
$("#exp").onclick = downloadTeamBackup
$("#impb").onclick = () => $("#imp").click()
$("#imp").onchange = async e => {
  const f = e.target.files[0]
  if (!f) return
  try {
    const d = JSON.parse(await f.text())
    const comps = d.comps || d
    if (!Array.isArray(comps)) throw 0
    if (!comps.length) throw new Error("Arquivo sem composições")
    const choice = await askChoice(
      "Importar composições",
      `O arquivo contém ${comps.length} composições. Escolha o que fazer com os dados atuais.`,
      [
        { value: "merge", label: "Juntar" },
        { value: "replace", label: "Substituir", destructive: true },
      ],
    )
    if (!choice) return
    const replace = choice === "replace"
    const ids = new Map()
    const clean = comps.map(c => {
      const b = blank(c.name)
      b.notes = c.notes || ""
      b.laneNotes = c.laneNotes || {}
      if (c.draft) b.draft = c.draft
      b.updated = c.updated || Date.now()
      for (const l of LANES) b.lanes[l.k] = Array.isArray(c.lanes?.[l.k]) ? c.lanes[l.k].map(String) : []
      b.id = replace ? c.id || b.id : b.id
      if (c.id) ids.set(c.id, b.id)
      if (c.team === "enemy" || c.team === "mine" || c.tacticTeam === "enemy")
        settleTeam(b, c.team === "mine" ? "mine" : "enemy")
      if (typeof c.opgg === "string" && c.opgg) setOpgg(b, normalizeOpggLink(c.opgg) || "")
      return b
    })
    // Ao juntar, as comps ganham ids novos; a adversária de cada draft acompanha.
    for (const b of clean) if (b.draft?.rival) setRival(b, ids.get(b.draft.rival) || null)
    // Confrontos (e as táticas deles) vão junto; ao juntar, ganham ids novos para não colidir.
    clean.forEach((b, i) => {
      const list = Array.isArray(comps[i].matchups) ? comps[i].matchups : []
      for (const m of list) {
        const enemy = ids.get(m?.enemy)
        if (!enemy) continue
        const made = addMatchup(b, enemy, Number(m.updated) || Date.now())
        if (replace && typeof m.id === "string") made.id = m.id
      }
    })
    S.comps = replace ? clean : [...clean, ...S.comps]
    S.cur = S.comps[0].id
    if (Array.isArray(d.plays)) {
      const ps = d.plays
        .filter(p => p && p.live && Array.isArray(p.steps))
        .map(p => ({ ...p, id: replace ? p.id || uid() : uid() }))
      S.plays = replace ? ps : [...plays(), ...ps]
      plays()
    }
    if (currentTeamView === "map") tacticalMap.renderPlays()
    if (currentTeamView === "comps") renderAll()
    save()
    publishTeamRoute(currentTeamView)
    toast(`${clean.length} comp(s) importada(s)`)
  } catch {
    toast("Arquivo inválido. Use um .json exportado por esta página.")
  } finally {
    e.target.value = ""
  }
}

/* ===== Abas ===== */
const teamPages = { comps: "composicoes", map: "mapa", know: "conhecimento", cap: "gestao" }
const guides = { obj: "objetivos", wave: "wave" }
let currentTeamView = "comps"
let routeRequest = 0
let tacticalMap
let renderKnow
let compositionsMounted = false
const usesParentNavigation = window.frameElement?.id === "v-camp"
document.body.toggleAttribute("data-parent-navigation", usesParentNavigation)
const renderTeamNavigation = usesParentNavigation
  ? () => {}
  : mountTeamNavigation($("#team-navigation"), handleTeamNavigation)

function handleTeamNavigation(view) {
  void openTeamView(view).then(opened => {
    if (opened) publishTeamRoute(view, { includeItem: false })
  })
}

function showTeamView(view) {
  currentTeamView = view
  $("#team-files").open = false
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
  if (view === "map") tacticalMap.renderPlays()
  if (view === "cap") renderCaptain()
}

function publishTeamRoute(view, { includeItem = true, onCopy = undefined } = {}) {
  $("#route-note").hidden = true
  let path = "/time/" + teamPages[view]
  if (view === "know") path += "/" + (guides[S.kTab] || guides.obj)
  if (includeItem && view === "comps")
    path += "/" + encodeURIComponent(S.cur) + "?modo=" + (S.view === "tactics" ? "taticas" : "draft")
  if (includeItem && view === "map") path += "/" + encodeURIComponent(S.curPlay)
  window.frameElement?.dispatchEvent(new CustomEvent("weblol:navigate", { detail: { path, onCopy } }))
}

/* ===== Gestão do time (todo o time vê; só o capitão e admins agem; os dados vêm do app principal) ===== */
const host = window.parent as any
let wantCaptain = false // link para a gestão aberto antes de o time carregar
const hasCaptainAccess = () => {
  try {
    return !!host?.captainAccess?.()
  } catch {
    return false
  }
}
function renderCaptain() {
  const name = (() => {
    try {
      return host.TEAM_NAME?.() || ""
    } catch {
      return ""
    }
  })()
  const manage = (() => {
    try {
      return !!host.canManageTeam?.()
    } catch {
      return false
    }
  })()
  if (name)
    $("#cap-sub").textContent = manage
      ? `${name}: aceite pedidos, gerencie os jogadores e veja o histórico das comps do time.`
      : `${name}: jogadores do time e histórico das comps.`
  host?.renderCaptainPanel?.($("#cap"))
}
;(window as any).weblolTeamChanged = () => {
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
window.applyWebLolRoute = ([page, item], params) => {
  const view = Object.keys(teamPages).find(key => teamPages[key] === page) || "comps"
  return openTeamView(view, item, params)
}

async function openTeamView(view, item, params) {
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
  const matches = entry => encodeURIComponent(entry.id) === item
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
    const mode = params?.get("modo")
    // "lane" era a antiga aba Opções por posição; agora abre a Ordem do draft.
    if (mode) S.view = mode === "taticas" ? "tactics" : "draft"
  } else if (view === "map" && item) {
    const selected = plays().find(matches)
    if (selected) tacticalMap.selectPlay(selected.id)
    if (!selected)
      missing =
        "A jogada deste link não está disponível neste navegador. Conecte a pasta do time para carregar a versão oficial."
  } else if (view === "know") {
    if (item) S.kTab = item === "wave" ? "wave" : "obj"
    renderKnow()
  }
  note.textContent = missing
  note.hidden = !missing
  showTeamView(view)
  return true
}

function wireCopyButton(button: HTMLButtonElement, view: "comps" | "map") {
  const icon = button.querySelector("use")
  const original = icon.getAttribute("href")
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

/* ===== Início ===== */
S = loadTeamState()
ensureTactics(S)
if (S.view !== "tactics") S.view = "draft"
function renderAll() {
  renderEditor()
  renderGrid()
}
plays()
if (!usesParentNavigation) void openTeamView("comps")
