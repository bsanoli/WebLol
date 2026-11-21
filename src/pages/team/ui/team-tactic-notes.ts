// Bloco de notas das táticas. O editor (Tiptap) vive num elemento próprio que sobrevive às re-renderizações
// do #editor; trocar de tática recria o editor com o documento dela.
import { lolAsset } from "@/entities/champion"
import { iconMarkup } from "@/shared/ui/icon"
import { compressImage } from "../lib/compress-image"
import { printStore } from "../api/print-store"
import { CH } from "../model/champion-catalog"
import { findMatchup, isMatchupKey, matchupTitle } from "../model/matchups"
import { clearCompNotes, hasTactic, readTacticDocument, writeTacticDocument } from "../model/tactics"
import type { TacticDoc, TacticPrintAttrs } from "../model/tactic-doc"
import { openPrintSketch } from "./print-sketch"
import { $, champArt, compById, S, save, toast, touch } from "./team-store"

/** `null` é a tática geral; `m:<id>` é a de um confronto; o resto é o id da composição. */
type TacticId = string | null

let notesHost: HTMLDivElement | null = null
/** Rolagem do bloco de notas antes de redesenhar a tela, para voltar ao mesmo ponto na mesma tática. */
let notesScroll: { key: string; top: number } | null = null
let notesKey: string | null = null

/** Guarda a rolagem do bloco de notas; chame antes de tirar a tela de Táticas do lugar para redesenhar. */
export function rememberTacticNotesScroll() {
  const body = notesHost?.isConnected ? notesHost.querySelector<HTMLElement>(".tx-notes-body") : null
  notesScroll = body && notesKey ? { key: notesKey, top: body.scrollTop } : null
}

function restoreTacticNotesScroll(host: HTMLElement, key: string) {
  const saved = notesScroll
  notesScroll = null
  if (!saved || saved.key !== key || !saved.top) return
  // O editor monta de forma assíncrona: aplica agora e de novo no próximo quadro, quando o conteúdo já tem altura.
  const apply = () => {
    const body = host.querySelector<HTMLElement>(".tx-notes-body")
    if (body) body.scrollTop = saved.top
  }
  apply()
  requestAnimationFrame(() => requestAnimationFrame(apply))
}
let noteChampionList: { name: string; portrait: string }[] | null = null

const noteChampions = () =>
  (noteChampionList ||= CH.map(champion => {
    const portrait = champArt(champion.n)?.portrait
    return { name: champion.n, portrait: portrait ? lolAsset(portrait) : "" }
  }))

function markTacticTab(compId: TacticId) {
  const tab = $(
    compId === null
      ? "#editor [data-tactic-general]"
      : isMatchupKey(compId)
        ? `#editor [data-tactic-matchup="${CSS.escape(compId.slice(3))}"]`
        : `#editor .tx-tabs [data-tactic-comp="${CSS.escape(compId)}"]`,
  )
  const has = hasTactic(S, compId)
  const mark = tab?.querySelector(".tx-has")
  if (has && !mark)
    tab
      ?.querySelector("b")
      ?.insertAdjacentHTML(
        "beforeend",
        `<span class="tx-has" title="Tem anotação de tática">${iconMarkup("edit")}</span>`,
      )
  else if (!has) mark?.remove()
}

function handleTacticNotesChange(compId: TacticId, doc: TacticDoc) {
  const entry = compId !== null && isMatchupKey(compId) ? findMatchup(S.comps, S.matchups, compId.slice(3)) : null
  const comp = compId === null || entry ? null : compById(compId)
  if (compId !== null && !comp && !entry) return
  writeTacticDocument(S, compId, entry ? matchupTitle(entry) : comp?.name || "", doc, Date.now())
  // As anotações antigas da comp já estão no documento gravado.
  if (comp && clearCompNotes(comp)) touch(comp)
  save()
  markTacticTab(compId)
}

export function mountTacticNotesIn(root: HTMLElement, compId: TacticId) {
  const slot = root.querySelector("[data-tactic-notes-slot]")
  if (!slot) return
  const key = compId ?? "geral"
  notesKey = key
  if (!notesHost) {
    notesHost = document.createElement("div")
    notesHost.className = "tx-notes-host"
    notesHost.innerHTML = `<p class="tx-notes-loading">Carregando o bloco de notas…</p>`
  }
  const host = notesHost
  slot.replaceWith(host)
  const store = printStore()
  const props = {
    doc: readTacticDocument(S, compId),
    labelledBy: "tx-title",
    champions: noteChampions(),
    store,
    compressImage,
    toast,
    sketch: (attrs: TacticPrintAttrs) => openPrintSketch({ attrs, store, compressImage, toast }),
    onChange: (doc: TacticDoc) => handleTacticNotesChange(compId, doc),
  }
  void import("./tactic-notes")
    .then(({ mountTacticNotes }) => {
      if (!host.isConnected) return
      mountTacticNotes(host, key, props)
      restoreTacticNotesScroll(host, key)
    })
    .catch(() => toast("Não consegui abrir o bloco de notas. Recarregue a página."))
}
