const tabs = [
  { value: "map-layers", label: "Camadas" },
  { value: "map-comps", label: "Composições" },
  { value: "map-sequence", label: "Sequência" },
  { value: "map-play", label: "Jogada" },
]

export function mountMapPanel(mountTabs: (host: Element, label: string, value: string, options: typeof tabs, change: (value: string) => void) => void) {
  const host = document.getElementById("map-sidebar-tabs")!
  const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-map-tab]"))
  function select(value: string) {
    for (const panel of panels) panel.hidden = panel.dataset.mapTab !== value
    mountTabs(host, "Painel do mapa", value, tabs, select)
  }
  select("map-sequence")
}

export function mountStepPages() {
  const list = document.getElementById("steps")!
  const slot = document.getElementById("map-steps-slot")!
  const pager = document.getElementById("map-step-pager")!
  const previous = document.getElementById("map-steps-prev")!
  const next = document.getElementById("map-steps-next")!
  const output = document.getElementById("map-steps-page")!
  let page = 0, capacity = 1, total = 0, selected = -1

  function render() {
    const pages = Math.max(1, Math.ceil(total / capacity))
    page = Math.min(page, pages - 1)
    pager.classList.toggle("map-pager-single", pages === 1)
    previous.setAttribute("aria-disabled", String(page === 0))
    next.setAttribute("aria-disabled", String(page >= pages - 1))
    output.textContent = `${page + 1} / ${pages}`
    const start = page * capacity
    for (const row of list.querySelectorAll<HTMLElement>("[data-i]")) {
      const index = Number(row.dataset.i)
      row.hidden = index < start || index >= start + capacity
    }
  }
  function change(direction: number) {
    const last = Math.max(0, Math.ceil(total / capacity) - 1)
    page = Math.max(0, Math.min(last, page + direction))
    render()
  }
  previous.onclick = () => change(-1)
  next.onclick = () => change(1)
  new ResizeObserver(() => {
    if (!slot.clientHeight) return
    const css = getComputedStyle(slot)
    const row = parseFloat(css.getPropertyValue("--map-step-row"))
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0
    const count = Math.max(1, Math.floor((slot.clientHeight + gap) / (row + gap)))
    if (count === capacity) return
    const focused = document.activeElement?.closest<HTMLElement>("#steps [data-i]")
    const anchor = focused ? Number(focused.dataset.i) : selected >= 0 ? selected : page * capacity
    capacity = count
    page = Math.floor(anchor / capacity)
    render()
  }).observe(slot)
  return (count: number, active: number) => {
    total = count
    selected = active
    page = active >= 0 ? Math.floor(active / capacity) : 0
    render()
  }
}
