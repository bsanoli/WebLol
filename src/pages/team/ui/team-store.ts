// Estado e utilidades que as partes da Área do time compartilham: o estado salvo, o aviso de gravação, o toast
// e os helpers de DOM e de campeão.
import { lolChampion, lolImage } from "@/entities/champion"
import { ensureTeamPlays } from "@/entities/tactical-play"
import { CH } from "../model/champion-catalog"
import { teamStateToSaved } from "../model/composition-storage"
import { settleOwner } from "../model/composition-side"
import {
  KEY,
  loadTeamState,
  storedStateHasLegacyBans,
  uid,
  type Composition,
  type DraftSide,
} from "../model/local-state"
import type { Matchup } from "../model/matchups"

export const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }
export const esc = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, char => ESCAPES[char])

const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2)
const byName = (name: string) => CH.find(champion => champion.n === name)
export const champArt = (name: string) => lolChampion(byName(name)?.id || name)
export const img = (name: string) =>
  `<span class="av" aria-hidden="true">${esc(initials(name))}${lolImage(champArt(name)?.portrait, "champ-portrait")}</span>`

/** Estado salvo da Área do time; é carregado uma vez e alterado no lugar. */
const hadLegacyBans = storedStateHasLegacyBans()
export const S = loadTeamState()
export const getState = () => S
export const plays = () => ensureTeamPlays(S, uid)
/** Composição aberta. O estado carregado sempre tem ao menos uma, e `S.cur` aponta para uma delas. */
export const cur = () => S.comps.find(comp => comp.id === S.cur) as Composition
/** Marca a composição como editada agora e confirma de quem ela é. */
export const touch = (comp: Composition | undefined = cur()) => {
  if (!comp) return
  comp.updated = Date.now()
  settleOwner(comp)
}
export const compById = (id: string | undefined): Composition | undefined => S.comps.find(comp => comp.id === id)
/** Confronto aberto na Ordem do draft: vale enquanto a comp aberta é a nossa dele (ou a única que ele tem). */
export const activeMatchup = (): Matchup | null => {
  const found = S.curMatchup ? S.matchups.find(item => item.id === S.curMatchup) : undefined
  return found && (found.ours === S.cur || (!found.ours && found.enemy === S.cur)) ? found : null
}
/** Lado da nossa comp no quadro: o do confronto aberto; sem confronto, azul. */
export const boardSide = (): DraftSide => activeMatchup()?.side ?? "blue"

const savedStatus = $("#saved")
export const localSave = $<HTMLDetailsElement>("#local-save")

function setSaveStatus(message: string, failed = false) {
  if (savedStatus.textContent !== message) savedStatus.textContent = message
  localSave.toggleAttribute("data-save-error", failed)
  const description = $("#local-save-description")
  const help = failed
    ? "O navegador não conseguiu gravar as edições. Use Exportar para guardar uma cópia."
    : "As edições são salvas automaticamente neste navegador."
  if (description.textContent !== help) description.textContent = help
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(teamStateToSaved(S)))
    setSaveStatus("Salvo neste navegador")
  } catch {
    setSaveStatus("Falha ao salvar", true)
  }
}

// Composições salvas com `lanes.ban` passam para `bans` na primeira abertura, sem esperar uma edição (ADR 0007).
if (hadLegacyBans) save()

let toastTimer = 0
export function toast(message: string, undo?: () => void) {
  const element = $("#toast")
  element.textContent = message
  if (undo) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "toast-action"
    button.textContent = "Desfazer"
    button.setAttribute("data-slot", "button")
    button.setAttribute("data-variant", "ghost")
    button.setAttribute("data-size", "sm")
    button.addEventListener("click", () => {
      undo()
      element.classList.remove("on")
    })
    element.append(" ", button)
  }
  element.classList.toggle("has-action", !!undo)
  element.classList.add("on")
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => element.classList.remove("on"), undo ? 6000 : 2200)
}

/** O elemento que recebeu o evento, para os tratadores que só leem o DOM. */
export const eventTarget = <T extends HTMLElement = HTMLElement>(event: Event) => event.target as T
