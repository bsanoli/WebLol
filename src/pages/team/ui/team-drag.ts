// Arrastar e soltar campeões entre as posições, os bans e as composições do editor.
import { championsOf, setChampions } from "../model/local-state"
import type { ChampionSlot } from "../model/local-state"
import { handleEnemyChampionDrop, compOf } from "./team-comps"
import { renderEditor } from "./team-editor"
import { renderGrid } from "./team-grid"
import { session } from "./team-session"
import { $, compById, cur, eventTarget, S, save, toast, touch } from "./team-store"
import type { DraftLane } from "../model/local-state"

// arrastar e soltar
type Drag = { n: string; from: ChampionSlot | null; comp: string | null; el: HTMLElement }
let drag: Drag | null = null
document.addEventListener("dragstart", e => {
  const ch = eventTarget(e).closest<HTMLElement>(".chip,.ch,.dm,.pk-target[data-n],.tx-pos-ic[data-n]")
  if (!ch) return
  drag = {
    n: ch.dataset.n ?? "",
    from: (ch.dataset.from || null) as ChampionSlot | null,
    comp: ch.closest<HTMLElement>("[data-comp-id]")?.dataset.compId || null,
    el: ch.closest<HTMLElement>(".pk,.bsq,.tx-pos-ic") || ch,
  }
  e.dataTransfer?.setData("text/plain", ch.dataset.n ?? "")
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"
  if (drag.from) requestAnimationFrame(() => drag?.el.classList.add("dragging"))
})
$("#editor").addEventListener("dragover", e => {
  const ln = eventTarget(e).closest<HTMLElement>("[data-comp-id] [data-l],[data-empty-rival][data-l]")
  if (!ln || !drag) return
  e.preventDefault()
  document.querySelectorAll(".drop").forEach(x => x !== ln && x.classList.remove("drop"))
  ln.classList.add("drop")
})
$("#editor").addEventListener("dragleave", e => {
  const ln = eventTarget(e).closest<HTMLElement>("[data-l]")
  if (ln && !ln.contains(e.relatedTarget as Node | null)) ln.classList.remove("drop")
})
$("#editor").addEventListener("drop", e => {
  const ln = eventTarget(e).closest<HTMLElement>("[data-comp-id] [data-l],[data-empty-rival][data-l]")
  if (!ln || !drag) return
  e.preventDefault()
  if (ln.hasAttribute("data-empty-rival")) {
    const n = drag.n,
      from = drag.from,
      src = drag.comp ? compById(drag.comp) : null
    drag = null
    if (from && src) {
      setChampions(
        src,
        from,
        championsOf(src, from).filter(x => x !== n),
      )
      touch(src)
    }
    handleEnemyChampionDrop(n, ln.dataset.l as DraftLane)
    return
  }
  const to = ln.dataset.l as ChampionSlot,
    c = compOf(ln),
    n = drag.n,
    source = drag.comp ? compById(drag.comp) : null
  if (drag.from && source) {
    setChampions(
      source,
      drag.from,
      championsOf(source, drag.from).filter(x => x !== n),
    )
    if (source !== c) touch(source)
  }
  const arr = championsOf(c, to).filter(x => x !== n)
  const over = eventTarget(e).closest<HTMLElement>(".chip,.dm,.tx-pos-ic")
  let idx = ln.dataset.bi != null ? Math.min(+ln.dataset.bi, arr.length) : arr.length
  if (over && over.dataset.n !== n && ln.dataset.bi == null) {
    idx = arr.indexOf(over.dataset.n ?? "")
    const r = over.getBoundingClientRect()
    // Na coluna da esquerda da visão Lane a linha é espelhada: a ordem corre da direita para a esquerda.
    const mirrored = !!over.closest(".tx-pos-col.left")
    if (mirrored ? e.clientX < r.left + r.width / 2 : e.clientX > r.left + r.width / 2) idx++
  }
  arr.splice(idx, 0, n)
  setChampions(c, to, arr)
  drag = null
  session.active = to
  session.side = c === cur() ? "us" : "rival"
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
  if (!c || !championsOf(c, d.from).includes(d.n)) return
  const lane = d.from,
    before = [...championsOf(c, lane)]
  setChampions(
    c,
    lane,
    before.filter(x => x !== d.n),
  )
  touch(c)
  save()
  renderEditor()
  renderGrid()
  toast(`${d.n} removido`, () => {
    setChampions(c, lane, before)
    touch(c)
    save()
    renderEditor()
    renderGrid()
  })
})
