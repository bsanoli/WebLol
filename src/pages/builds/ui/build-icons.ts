import { itemNames, runeNames } from "@dataset/builds"
import buildAssets from "@dataset/build-assets"
import { LOL_DATA, lolAsset, lolImage, lolKey } from "@/entities/champion"
import { esc } from "@/entities/match"
import { buildData, type Frequency } from "../model/build-statistics"

type BuildIconKind = "item" | "rune" | "spell"
export type Option = { label: string; icons: string[]; percent: number }
export const itemLabels: Partial<Record<number, string>> = itemNames
const runeLabels: Partial<Record<number, string>> = runeNames
const runeAssets: Partial<Record<number, (string | null)[]>> = buildAssets.runes
const runeTreeIcons = new Map(
  Object.values(LOL_DATA.runeTrees).flatMap(tree => (tree ? [[tree.name, lolAsset(tree.icon)] as const] : [])),
)
export const itemKeys = new Map(
  Object.entries(LOL_DATA.item).map(([key, path]) => [Number(path?.match(/(\d+)\.png$/)?.[1]), key]),
)
const spellKeys = new Map(
  Object.entries(LOL_DATA.spell).map(([key, path]) => [path?.split("/").at(-1)?.replace(".png", ""), key]),
)
export const completedItems = new Set(buildAssets.completedItems)
export const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
export const gameCount = (games: number) => (games === 1 ? "1 jogo" : `${games} jogos`)

function buildIcon(kind: BuildIconKind, key: string | undefined, label: string, usage: string, fallback?: string) {
  const local = key && LOL_DATA[kind][key]
  const className = `build-icon build-icon-${kind}`
  const image = local
    ? lolImage(local, className)
    : fallback
      ? `<img alt="" class="${className}" loading="lazy" src="${esc(fallback)}">`
      : ""
  if (!image) return ""
  const text = esc(`${label} · ${usage}`)
  return local
    ? `<button type="button" class="build-icon-trigger" data-game-tip="${kind}:${key}" aria-label="${text}" data-tip="${text}">${image}</button>`
    : `<span class="build-icon-static" role="img" aria-label="${text}" title="${text}">${image}</span>`
}

/** Ícone de item com tooltip; usado também pela linha do tempo de compras. */
export function itemIcon(item: number, usage: string) {
  const label = itemLabels[item] ?? String(item)
  const fallback = `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/item/${item}.png`
  return buildIcon("item", itemKeys.get(item), label, usage, fallback)
}

export const itemName = (item: number) => itemLabels[item] ?? String(item)
export const isCompletedItem = (item: number) => completedItems.has(item)
export const bootItems = new Set<number>(
  Object.values(buildData).flatMap(lanes =>
    Object.values(lanes ?? {}).flatMap(build => build?.boots.map(entry => entry.value) ?? []),
  ),
)
bootItems.delete(1001) // Botas básicas não contam como botas completas

export function usageOf(entry: Pick<Frequency<unknown>, "count" | "percent">, games: number) {
  return `${entry.count} de ${games} · ${percent.format(entry.percent)}%`
}

export function itemOption(entry: Frequency<number>, games: number): Option {
  return { ...entry, label: itemName(entry.value), icons: [itemIcon(entry.value, usageOf(entry, games))] }
}

export function starterOption(entry: Frequency<number[]>, games: number): Option {
  const quantities = new Map<number, number>()
  for (const item of entry.value) quantities.set(item, (quantities.get(item) ?? 0) + 1)
  const items = [...quantities].map(([value, quantity]) => {
    const item = itemOption({ ...entry, value }, games)
    return { ...item, label: quantity > 1 ? `${quantity}× ${item.label}` : item.label }
  })
  return { ...entry, label: items.map(item => item.label).join(" + "), icons: items.flatMap(item => item.icons) }
}

export function runeIcon(entry: Frequency<number>, games: number) {
  const label = runeLabels[entry.value] ?? String(entry.value)
  const [key, path] = runeAssets[entry.value] ?? []
  const fallback =
    runeTreeIcons.get(label) ?? (path ? `https://ddragon.leagueoflegends.com/cdn/img/${path}` : undefined)
  return buildIcon("rune", key ?? undefined, label, usageOf(entry, games), fallback)
}

export function spellOption(entry: Frequency<string>): Option {
  const keys = entry.value.split("+").map(name => spellKeys.get(name) ?? lolKey(name))
  const labels = keys.map(key => LOL_DATA.spellDetails[key]?.name ?? key)
  return {
    ...entry,
    label: labels.join(" + "),
    icons: keys.map((key, index) => buildIcon("spell", key, labels[index], `${percent.format(entry.percent)}%`)),
  }
}

type Loadout = { spells?: string[]; keystone?: number; secondaryTree?: number }

/** Feitiços, runa principal e árvore secundária de um jogador numa partida. */
export function playerLoadout({ spells = [], keystone, secondaryTree }: Loadout) {
  const usage = "nesta partida"
  const spellIcons = spells
    .map(name => {
      const key = spellKeys.get(name) ?? lolKey(name)
      return buildIcon("spell", key, LOL_DATA.spellDetails[key]?.name ?? key, usage)
    })
    .join("")
  const rune = (id: number | undefined, label: string) =>
    id ? runeIcon({ value: id, count: 1, percent: 100 }, 1).replace("1 de 1 · 100%", `${label} ${usage}`) : ""
  const runes = rune(keystone, "runa principal") + rune(secondaryTree, "árvore secundária")
  if (!spellIcons && !runes) return ""
  return `<span class="build-timeline-loadout">
    ${spellIcons ? `<span class="build-timeline-loadout-group" role="group" aria-label="Feitiços">${spellIcons}</span>` : ""}
    ${runes ? `<span class="build-timeline-loadout-group" role="group" aria-label="Runas">${runes}</span>` : ""}
  </span>`
}
