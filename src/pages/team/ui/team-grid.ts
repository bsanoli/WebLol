// Grade de campeões: o catálogo que preenche a posição (ou os bans) em edição, no centro do draft ou num diálogo.
import { showDialog } from "@/shared/ui/dialog-controls"
import { laneIconMarkup } from "@/shared/ui/icon"
import WS from "../api/worlds-champion-stats.json"
import { CH } from "../model/champion-catalog"
import { SLOT_LIST, type SlotInfo } from "../model/champion-slots"
import { enemyOrder, oppositeSide } from "../model/composition-side"
import { PICKNAME } from "../model/draft-order"
import { championsOf, draftOf, setChampions } from "../model/local-state"
import type { DraftLane } from "../model/local-state"
import { session, target } from "./team-session"
import { $, boardSide, cur, esc, img, S, save, touch } from "./team-store"

type WorldsStats = { c: Record<string, number[]> }
const stats = (WS as WorldsStats).c
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "")

let role = "all"
let closePicker: (() => void) | undefined
let afterChange: () => void = () => {}
const picker = $("#champ-picker")

export const isPickerOpen = () => closePicker !== undefined
export const closeChampionPicker = () => closePicker?.()

const ROLE_BUTTONS = [{ k: "all", n: "Todos" }, ...SLOT_LIST.filter(slot => slot.k !== "ban")]

const resetGrid = () => {
  renderGrid()
  $("#grid").scrollTop = 0
}

/** Diz na tela qual posição (e de qual composição) recebe o próximo campeão. */
export function renderTarget() {
  const comp = target()
  const ours = cur()
  if (!comp || !ours) return
  const enemySide = comp !== ours
  for (const button of $("#grid").querySelectorAll<HTMLElement>(".ch"))
    button.setAttribute("aria-pressed", String(championsOf(comp, session.active).includes(button.dataset.n ?? "")))
  // Qual slot recebe o campeão: no lado adversário, os picks seguem a ordem dele.
  const oursSide = boardSide(),
    side = enemySide ? oppositeSide(oursSide) : oursSide
  const team = side[0].toUpperCase()
  const order = enemySide ? enemyOrder(comp, oursSide) : draftOf(ours).order[side]
  const position = SLOT_LIST.find(slot => slot.k === session.active)
  const slot =
    session.active === "ban" || !position
      ? "Bans"
      : `${PICKNAME[team + (order.indexOf(session.active) + 1)]} · ${position.n}`
  const heading = $("#target")
  heading.hidden = false
  heading.className = `draft-editing-target ${side}`
  heading.setAttribute("aria-live", "polite")
  heading.textContent = `Editando: ${slot} · ${comp.name}`
}

export function renderGrid() {
  if (S.view === "tactics" && !closePicker) return
  const comp = target()
  if (!comp) return
  const query = normalize($<HTMLInputElement>("#search").value)
  const sort = $<HTMLSelectElement>("#sort").value
  const where: Record<string, SlotInfo[]> = {}
  for (const slot of SLOT_LIST) for (const name of championsOf(comp, slot.k)) (where[name] ||= []).push(slot)
  const list = CH.filter(
    champion =>
      (!query || normalize(champion.n).includes(query)) && (role === "all" || champion.r.includes(role as DraftLane)),
  )
  const score = (name: string, index: number) => (stats[name] || [0, 0, 0])[index]
  if (sort === "ws") list.sort((a, b) => score(b.n, 0) - score(a.n, 0) || a.n.localeCompare(b.n))
  else if (sort === "wsb") list.sort((a, b) => score(b.n, 2) - score(a.n, 2) || a.n.localeCompare(b.n))
  else list.sort((a, b) => a.n.localeCompare(b.n))
  $("#grid").innerHTML =
    list
      .map(champion => {
        const worlds = stats[champion.n]
        const slots = where[champion.n]
        return `<button class="ch${slots ? " in" : ""}" aria-pressed="${championsOf(comp, session.active).includes(champion.n)}" draggable="true" data-n="${esc(champion.n)}">${img(champion.n)}
      ${slots ? `<span class="tag" style="--lc:var(${slots[0].c})">${slots.map(slot => slot.n.slice(0, 3).toUpperCase()).join("/")}</span>` : ""}
      ${sort !== "az" && worlds ? `<span class="ws">${sort === "ws" ? worlds[0] : worlds[2]}</span>` : ""}
      <span class="nm">${esc(champion.n)}</span></button>`
      })
      .join("") || '<p class="composition-empty" role="status">Nenhum campeão encontrado.</p>'
  $("#gfoot").textContent = ""
}

export function openPicker() {
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
      document.querySelector<HTMLElement>("[data-picker]")?.focus({ preventScroll: true })
    },
  })
}

// Na ordem do draft em tela larga, o catálogo fica no centro, entre os dois lados.
export function placePicker() {
  if (closePicker) return
  const slot = document.querySelector("#editor .dz-slot")
  if (slot && window.matchMedia("(min-width: 1100px)").matches) {
    if (picker.parentElement !== slot) slot.append(picker)
  } else if (picker.parentElement !== $("#comps")) $("#comps").append(picker)
}

/** Liga a grade. `onChange` redesenha o editor depois de um campeão entrar ou sair. */
export function mountChampionGrid({ onChange }: { onChange: () => void }) {
  afterChange = onChange
  $("#roles").innerHTML = ROLE_BUTTONS.map(
    ({ k, n }) =>
      `<button data-slot="button" data-variant="ghost" data-size="sm" data-r="${k}" aria-pressed="${k === "all"}" class="${k === "all" ? "on" : ""}"><span class="lane-label">${laneIconMarkup(k)}${n}</span></button>`,
  ).join("")
  $("#roles").onclick = event => {
    const button = (event.target as HTMLElement).closest("button")
    if (!button) return
    role = button.dataset.r ?? "all"
    for (const other of document.querySelectorAll("#roles button")) {
      other.classList.toggle("on", other === button)
      other.setAttribute("aria-pressed", String(other === button))
    }
    resetGrid()
  }
  $("#search").oninput = resetGrid
  $("#sort").onchange = resetGrid
  $("#grid").onclick = event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>(".ch")
    const comp = target()
    if (!button || !comp) return
    const name = button.dataset.n ?? ""
    const names = championsOf(comp, session.active)
    setChampions(comp, session.active, names.includes(name) ? names.filter(other => other !== name) : [...names, name])
    touch(comp)
    save()
    afterChange()
    renderGrid()
    for (const next of $("#grid").querySelectorAll<HTMLElement>(".ch"))
      if (next.dataset.n === name) next.focus({ preventScroll: true })
  }
  $("#close-picker").onclick = () => closePicker?.()
  window.matchMedia("(min-width: 1100px)").addEventListener("change", () => placePicker())
}
