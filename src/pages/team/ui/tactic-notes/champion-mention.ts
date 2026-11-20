import Mention from "@tiptap/extension-mention"
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion"

export type NoteChampion = { name: string; portrait: string }

type MentionItem = NoteChampion
type MentionCommand = { id: string; label: string }

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "")

function findChampions(champions: NoteChampion[], query: string) {
  const q = normalize(query)
  if (!q) return champions.slice(0, 8)
  const starts = champions.filter(ch => normalize(ch.name).startsWith(q))
  const contains = champions.filter(ch => !starts.includes(ch) && normalize(ch.name).includes(q))
  return [...starts, ...contains].slice(0, 8)
}

/** Lista de sugestões do `@`: aparece junto ao cursor e é controlada pelas setas, Enter e Esc. */
function createSuggestionMenu() {
  let element: HTMLDivElement | null = null
  let unmount: (() => void) | null = null
  let props: SuggestionProps<MentionItem, MentionCommand> | null = null
  let index = 0

  const choose = (i: number) => {
    const item = props?.items[i]
    if (item) props?.command({ id: item.name, label: item.name })
  }

  const draw = () => {
    if (!element || !props) return
    element.replaceChildren()
    if (!props.items.length) {
      const empty = document.createElement("p")
      empty.className = "tx-mention-empty"
      empty.textContent = "Nenhum campeão encontrado"
      element.append(empty)
      return
    }
    props.items.forEach((item, i) => {
      const option = document.createElement("button")
      option.type = "button"
      option.className = "tx-mention-option"
      option.setAttribute("role", "option")
      option.setAttribute("aria-selected", String(i === index))
      option.id = `tx-mention-option-${i}`
      const icon = document.createElement("img")
      icon.src = item.portrait
      icon.alt = ""
      option.append(icon, item.name)
      option.addEventListener("mousedown", event => event.preventDefault())
      option.addEventListener("click", () => choose(i))
      element!.append(option)
    })
    element.setAttribute("aria-activedescendant", `tx-mention-option-${index}`)
  }

  return {
    onStart(next: SuggestionProps<MentionItem, MentionCommand>) {
      props = next
      index = 0
      element = document.createElement("div")
      element.className = "chip-menu tx-mention-menu"
      element.setAttribute("role", "listbox")
      element.setAttribute("aria-label", "Campeões")
      unmount = next.mount(element)
      draw()
    },
    onUpdate(next: SuggestionProps<MentionItem, MentionCommand>) {
      props = next
      index = 0
      draw()
    },
    onKeyDown({ event }: SuggestionKeyDownProps) {
      const count = props?.items.length ?? 0
      if (!count) return false
      if (event.key === "ArrowDown") {
        index = (index + 1) % count
        draw()
        return true
      }
      if (event.key === "ArrowUp") {
        index = (index + count - 1) % count
        draw()
        return true
      }
      if (event.key === "Enter" || event.key === "Tab") {
        choose(index)
        return true
      }
      return false
    },
    onExit() {
      unmount?.()
      unmount = null
      element = null
      props = null
    },
  }
}

/** `@` seguido do nome insere o campeão com o ícone; no texto puro vira "@Nome". */
export function championMention(champions: NoteChampion[]) {
  const portraits = new Map(champions.map(ch => [ch.name, ch.portrait]))
  return Mention.configure({
    HTMLAttributes: { class: "tx-mention" },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    renderHTML: ({ options, node }) => {
      const name = String(node.attrs.label ?? node.attrs.id ?? "")
      const portrait = portraits.get(String(node.attrs.id))
      return [
        "span",
        { ...options.HTMLAttributes, "data-champion": node.attrs.id },
        ...(portrait ? [["img", { src: portrait, alt: "", class: "tx-mention-icon" }]] : []),
        name,
      ]
    },
    suggestion: {
      char: "@",
      items: ({ query }) => findChampions(champions, query),
      render: createSuggestionMenu,
    },
  })
}
