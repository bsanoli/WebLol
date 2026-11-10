export function iconMarkup(name: string) {
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"></use></svg>`;
}

const laneIcons = new Map([
  ["top", ["top", "Top"]],
  ["jg", ["jg", "Jungle"]],
  ["jungle", ["jg", "Jungle"]],
  ["mid", ["mid", "Mid"]],
  ["adc", ["adc", "ADC"]],
  ["sup", ["sup", "Suporte"]],
  ["suporte", ["sup", "Suporte"]],
]);

export function laneIconMarkup(lane: string | undefined, standalone = false) {
  const icon = laneIcons.get(lane?.toLowerCase() ?? "");
  if (!icon) return "";
  const [file, label] = icon;
  return `<img class="lane-icon" src="assets/lanes/${file}.svg" width="16" height="16" alt="${standalone ? label : ""}"${standalone ? ` title="${label}"` : ""}>`;
}
