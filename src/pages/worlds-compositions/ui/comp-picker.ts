import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover"
import { ExistingContent } from "@/shared/ui/dialog-controls"
import { iconMarkup } from "@/shared/ui/icon"
import { lolKey } from "@/entities/champion"
import { esc } from "@/entities/match"
import { $ } from "@/shared/lib/dom"
export type PopoverRoot = Root & { dismiss?: () => void }
const part = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => root.querySelector(selector) as T
export const compositionPopovers: PopoverRoot[] = []
export function wireFloatingPicker(trigger: HTMLElement, picker: HTMLElement, search: () => HTMLInputElement) {
  const anchor = document.createElement("span")
  anchor.className = "comp-picker-host"
  trigger.before(anchor)
  const root: PopoverRoot = createRoot(anchor)
  compositionPopovers.push(root)
  picker.remove()
  picker.hidden = false
  let open = false
  const setOpen = (next: boolean) => {
    if (next)
      for (const other of compositionPopovers) {
        if (other !== root) other.dismiss?.()
      }
    open = next
    trigger.setAttribute("aria-expanded", String(open))
    root.render(
      createElement(
        Popover,
        { open, onOpenChange: setOpen },
        createElement(PopoverAnchor, { virtualRef: { current: trigger } }),
        createElement(
          PopoverContent,
          {
            align: "start",
            className: "wl-composition-popover",
            "aria-label": picker.getAttribute("aria-label") ?? undefined,
            onOpenAutoFocus: event => {
              event.preventDefault()
              search().focus()
            },
            onCloseAutoFocus: event => event.preventDefault(),
            onInteractOutside: event => {
              if (trigger.contains(event.target as Node | null)) event.preventDefault()
            },
            onEscapeKeyDown: () => trigger.focus(),
          },
          createElement(ExistingContent, { element: picker }),
        ),
      ),
    )
  }
  root.dismiss = () => {
    if (open) setOpen(false)
  }
  trigger.onclick = () => setOpen(!open)
  return () => {
    setOpen(false)
    trigger.focus()
  }
}
export type PickerConfig = {
  id: string
  label: string
  value: string
  hint?: string
  options: Iterable<[string, string]>
  image: (name: string) => string
  search: string
  empty: string
  clear: string
  category: {
    label: string
    all: string
    values: string[]
    icon?: (name: string) => string
    forName: (name: string) => string[]
  }
}
export function compPicker({ id, label, value, hint, options, image, search, empty, clear, category }: PickerConfig) {
  return `<div class="comp-picker-field"><span>${label}</span>
    <button id="${id}" class="comp-picker-trigger" type="button" data-slot="button" data-variant="outline" aria-haspopup="dialog" aria-expanded="false"${hint ? ` aria-describedby="${hint}"` : ""}>
      <span class="comp-picker-value">${value}</span>${iconMarkup("descending")}
    </button>
    <div id="${id}-picker" class="comp-picker" role="group" aria-label="Filtro de ${label.toLowerCase()}" hidden>
      <input data-slot="input" class="comp-picker-search" type="search" aria-label="${search}" placeholder="${search}">
      <div class="comp-picker-categories" role="group" aria-label="${category.label}">
        <button type="button" data-category="" data-slot="button" data-variant="outline" aria-pressed="true">${category.all}</button>
        ${category.values.map(name => `<button type="button" data-category="${esc(name)}" data-slot="button" data-variant="outline" aria-label="${esc(name)}" title="${esc(name)}" aria-pressed="false">${category.icon ? category.icon(name) : esc(name)}</button>`).join("")}
      </div>
      <div class="comp-picker-grid" role="group" aria-label="${label} disponíveis">
        ${[...options].map(([key, name]) => `<button type="button" data-option="${esc(key)}" data-categories="${esc(category.forName(name).join(","))}" aria-label="${esc(name)}" aria-pressed="false" title="${esc(name)}">${image(name)}<span class="comp-picker-check">${iconMarkup("check")}</span></button>`).join("")}
      </div>
      <p class="comp-filter-hint" role="status" hidden>${empty}</p>
      <div class="comp-picker-actions">
        <button type="button" data-picker-clear data-slot="button" data-variant="ghost">${iconMarkup("reset")} ${clear}</button>
      </div>
    </div>
  </div>`
}
export function wireCompPicker(
  id: string,
  {
    isSelected,
    onSelect,
    onClear,
  }: { isSelected: (key: string) => boolean; onSelect: (key: string) => void; onClear: () => void },
) {
  const trigger = $(`#${id}`)
  const picker = $(`#${id}-picker`)
  const search = part<HTMLInputElement>(picker, "input")
  const grid = part(picker, ".comp-picker-grid")
  const categories = part(picker, ".comp-picker-categories")
  let category = ""
  const empty = part(picker, '[role="status"]')
  const clear = part(picker, "[data-picker-clear]")
  const options = [...grid.querySelectorAll<HTMLButtonElement>("button")].map(button => ({
    button,
    name: lolKey(button.getAttribute("aria-label") ?? ""),
    code: button.querySelector<HTMLElement>("[data-team]")?.dataset.team || "",
    categories: (button.dataset.categories ?? "").split(","),
  }))
  const close = wireFloatingPicker(trigger, picker, () => search)
  const filterOptions = () => {
    const query = lolKey(search.value)
    for (const option of options) {
      const matchesCategory = !category || option.categories.includes(category)
      option.button.hidden = !matchesCategory || !(option.name.includes(query) || option.code.includes(query))
    }
    empty.hidden = options.some(({ button }) => !button.hidden)
    grid.scrollTop = 0
  }
  const setCategory = (value: string) => {
    category = value
    for (const chip of categories.querySelectorAll<HTMLElement>("button")) {
      chip.setAttribute("aria-pressed", String(chip.dataset.category === category))
    }
    filterOptions()
  }
  categories.onclick = e => {
    const chip = (e.target as Element).closest<HTMLElement>("button[data-category]")
    if (chip) setCategory(chip.dataset.category ?? "")
  }
  search.oninput = filterOptions
  grid.onclick = e => {
    const option = (e.target as Element).closest<HTMLElement>("button[data-option]")
    if (option) onSelect(option.dataset.option ?? "")
  }
  clear.onclick = () => {
    if (clear.getAttribute("aria-disabled") !== "true") onClear()
  }
  return {
    trigger,
    close,
    resetBrowseFilters() {
      search.value = ""
      setCategory("")
    },
    sync() {
      let hasSelection = false
      for (const { button } of options) {
        const selected = isSelected(button.dataset.option ?? "")
        button.setAttribute("aria-pressed", String(selected))
        hasSelection ||= selected
      }
      clear.setAttribute("aria-disabled", String(!hasSelection))
    },
  }
}
