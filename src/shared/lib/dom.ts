// Atalhos de DOM do app principal (shell): seletor, escape de HTML, data curta e aviso temporário.
const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }

/** Elemento do shell. Os ids vêm do `main.tsx`; use `document.querySelector` quando ele puder não existir. */
export const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T

export const esc = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, char => ESCAPES[char] ?? char)

export const fmtD = (time: number) => new Date(time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })

let toastTimer: ReturnType<typeof setTimeout> | undefined
export function toast(message: string, ms = 3200) {
  const element = $("#toast")
  element.textContent = message
  element.classList.add("on")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => element.classList.remove("on"), ms)
}

/** Elemento que a tela precisa ter: lança um erro claro em vez de seguir com `null`. */
export function requireElement<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`)
  return element
}

/** Ancestral que a tela precisa ter: lança um erro claro em vez de seguir com `null`. */
export function requireClosest<T extends Element = HTMLElement>(from: Element, selector: string): T {
  const element = from.closest<T>(selector)
  if (!element) throw new Error(`Ancestral não encontrado: ${selector}`)
  return element
}
