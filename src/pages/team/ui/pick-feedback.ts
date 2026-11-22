type Slot = { champion: string; element: HTMLElement }

function championGroups(editor: HTMLElement) {
  return new Map(
    [...editor.querySelectorAll<HTMLElement>("[data-champion-group]")].flatMap(group => {
      const groupKey = group.dataset.championGroup
      if (!groupKey) return []
      const slots = new Map<string, Slot>()
      for (const element of group.querySelectorAll<HTMLElement>("[data-champion-slot]")) {
        const slotKey = element.dataset.championSlot
        if (slotKey) slots.set(slotKey, { champion: element.dataset.championName ?? "", element })
      }
      return [[groupKey, { group, slots }] as const]
    }),
  )
}

export function capturePickFeedback(editor: HTMLElement) {
  const previous = championGroups(editor)
  return () => {
    const targets = new Set<Element>()
    for (const [key, { group, slots }] of championGroups(editor)) {
      const before = previous.get(key)?.slots
      if (!before) continue
      for (const [index, slot] of slots) {
        if ((before.get(index)?.champion ?? "") !== slot.champion) {
          targets.add(slot.element.querySelector(".av, .icon") ?? slot.element)
        }
      }
      if ([...before.keys()].some(index => !slots.has(index))) {
        const fallback = group.hidden ? editor.querySelector('[data-draft-target="ban"]') : group
        fallback?.setAttribute("data-pick-feedback", "removed")
      }
    }
    for (const target of targets) target.setAttribute("data-pick-feedback", "")
  }
}
