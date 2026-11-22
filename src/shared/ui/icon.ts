export function iconMarkup(name: string) {
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"></use></svg>`
}

const laneIcons = new Map([
  ["top", ["top", "Top"]],
  ["jg", ["jg", "Jungle"]],
  ["jungle", ["jg", "Jungle"]],
  ["mid", ["mid", "Mid"]],
  ["adc", ["adc", "ADC"]],
  ["sup", ["sup", "Suporte"]],
  ["suporte", ["sup", "Suporte"]],
])

/** Nome do arquivo do ícone da rota em `assets/lanes/`, ou nada se a rota não existe. */
export function laneIconFile(lane: string | undefined) {
  return laneIcons.get(lane?.toLowerCase() ?? "")?.[0]
}

export function laneIconMarkup(lane: string | undefined, isStandalone = false) {
  const icon = laneIcons.get(lane?.toLowerCase() ?? "")
  if (!icon) return ""
  const [file, label] = icon
  return `<img class="lane-icon" src="assets/lanes/${file}.svg" width="16" height="16" alt="${isStandalone ? label : ""}"${isStandalone ? ` title="${label}"` : ""}>`
}
