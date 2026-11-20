import { isSide, sideLabel, type Side } from "../model/battlefield"

type Composition = { id: string; name: string; champions: string[] }

export function mountMapCompositions({
  read,
  selected,
  choose,
  portrait,
}: {
  read: () => Composition[]
  selected: (side: Side) => string | undefined
  choose: (side: Side, id: string) => void
  portrait: (champion: string) => string
}) {
  const panel = document.querySelector<HTMLElement>("#panel-map-comps")!
  const list = panel.querySelector<HTMLElement>("#map-composition-list")!
  const sides = [...panel.querySelectorAll<HTMLButtonElement>("[data-composition-side]")]
  let side: Side = "b"
  let disabled = false
  let buttons: HTMLButtonElement[] = []

  function syncSelection() {
    const id = selected(side)
    const active = buttons.find(button => button.dataset.composition === id) ?? buttons[0]
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button === active))
      button.disabled = disabled
    }
  }

  for (const button of sides) {
    button.onclick = () => {
      const next = button.dataset.compositionSide
      if (!isSide(next) || next === side) return
      side = next
      for (const item of sides) item.setAttribute("aria-pressed", String(item === button))
      list.setAttribute("aria-label", `Composições para o lado ${sideLabel[side]}`)
      syncSelection()
    }
  }

  function render() {
    const compositions = read()
    buttons = [{ id: "", name: "Só o ícone da rota", champions: [] }, ...compositions].map(composition => {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "map-composition"
      button.dataset.composition = composition.id
      const name = document.createElement("span")
      name.className = "map-composition-name"
      name.textContent = composition.name.trim() || "Composição sem nome"
      name.title = name.textContent
      button.append(name)
      if (composition.champions.length) {
        const portraits = document.createElement("span")
        portraits.className = "mini"
        portraits.setAttribute("aria-hidden", "true")
        portraits.innerHTML = composition.champions.map(portrait).join("")
        button.setAttribute("aria-description", composition.champions.join(", "))
        button.append(portraits)
      } else if (composition.id) {
        const empty = document.createElement("small")
        empty.textContent = "Sem campeões"
        button.append(empty)
      }
      button.onclick = () => {
        choose(side, composition.id)
        syncSelection()
      }
      return button
    })
    list.replaceChildren(...buttons)
    if (!compositions.length) {
      const empty = document.createElement("p")
      empty.className = "map-ward-hint"
      empty.textContent = "Nenhuma composição salva."
      list.append(empty)
    }
    syncSelection()
  }

  return {
    render,
    setDisabled(value: boolean) {
      disabled = value
      syncSelection()
    },
  }
}
