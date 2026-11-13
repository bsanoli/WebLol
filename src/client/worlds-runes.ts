import { LOL_DATA, lolImage } from "./lol-media"
import { esc } from "./worlds-display"
import { runeNames } from "@dataset/builds"
import assets from "@dataset/build-assets"

type Frequency = { value: number; count: number; percent: number }
type RuneBuild = {
  games: number
  primaryTrees: Frequency[]
  secondaryTrees: Frequency[]
  primaryRunes: Frequency[][]
  secondaryRunes: Frequency[]
  shards: Frequency[][]
}

const names: Partial<Record<number, string>> = runeNames
const icons: Partial<Record<number, (string | null)[]>> = assets.runes
const shardSlots = [[5008, 5005, 5007], [5008, 5010, 5001], [5011, 5013, 5001]]
const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })

function runeImage(id: number) {
  const [key, path] = icons[id] ?? []
  return lolImage(key ? LOL_DATA.rune[key] : undefined, "build-icon") ||
    (path ? `<img alt="" class="build-icon" loading="lazy" src="https://ddragon.leagueoflegends.com/cdn/img/${esc(path)}">` : "")
}

function runeChoice(id: number, games: number, count: number, active = false) {
  const name = names[id] ?? String(id)
  const key = icons[id]?.[0] ?? id
  const rate = `${percent.format(games ? count / games * 100 : 0)}%`
  const usage = `${rate} · ${count} de ${games} ${games === 1 ? "jogo" : "jogos"}`
  return `<div class="rune-frequency-choice">
    <button type="button" class="rune-choice${active ? " is-selected" : ""}" data-game-tip="rune:${esc(key)}"
      data-tip-name="${esc(name)}" data-tip="${usage}" aria-label="${esc(`${name} · ${usage}`)}">${runeImage(id)}</button>
    <small aria-hidden="true">${count ? rate : ""}</small>
  </div>`
}

function runeSlot(slot: number[], entries: Frequency[], games: number, active?: number) {
  return `<div class="rune-options">${slot.map(id =>
    runeChoice(id, games, entries.find(entry => entry.value === id)?.count ?? 0, id === active)).join("")}</div>`
}

function treePanel(tree: Frequency, build: RuneBuild, secondary: boolean, activeTree: boolean) {
  const layout = assets.runeTrees.find(candidate => candidate.id === tree.value)
  if (!layout) return ""
  const name = names[tree.value] ?? String(tree.value)
  const slots = secondary ? layout.slots.slice(1) : layout.slots
  const entries = secondary ? slots.map(() => build.secondaryRunes) : build.primaryRunes
  const leaders = slots.map((slot, index) => entries[index]?.find(entry => slot.includes(entry.value)))
  const secondaryLeaders = secondary
    ? leaders.filter(entry => entry !== undefined).sort((a, b) => b.count - a.count).slice(0, 2)
    : []
  return `<div class="rune-slots" data-rune-view="${tree.value}" data-rune-tree="${esc(name)}"${activeTree ? "" : " hidden"}>${slots.map((slot, index) => {
      const leader = leaders[index]
      const active = !secondary || (leader && secondaryLeaders.includes(leader)) ? leader?.value : undefined
      return runeSlot(slot, entries[index] ?? [], tree.count, active)
    }).join("")}</div>`
}

function treeColumn(trees: Frequency[], build: RuneBuild, secondary = false) {
  const first = trees[0]
  if (!first) return ""
  const label = secondary ? "Árvore secundária" : "Árvore primária"
  const title = secondary ? "Secundária" : "Primária"
  const treeLabel = (tree: Frequency) => `${names[tree.value] ?? tree.value} ${percent.format(tree.percent)}%`
  const heading = trees.length === 1
    ? `<div class="rune-tree-current">${runeImage(first.value)}<span>${esc(treeLabel(first))}</span></div>`
    : `<div class="rune-tree-options" role="group" aria-label="${label}">
      ${trees.map((tree, index) => `<button type="button" class="rune-tree-option" data-rune-tree-option="${tree.value}"
        aria-pressed="${index === 0}" aria-label="${esc(treeLabel(tree))}" data-tip="${esc(treeLabel(tree))}">
        ${runeImage(tree.value)}<small aria-hidden="true">${percent.format(tree.percent)}%</small>
      </button>`).join("")}
    </div>`
  return `<div class="rune-tree">
    <div class="rune-tree-heading">
      <h6>${title}</h6>
      ${heading}
    </div>
    ${trees.map((tree, index) => treePanel(tree, build, secondary, index === 0)).join("")}
  </div>`
}

export function runePage(build: RuneBuild) {
  return `<div class="rune-page"><div class="rune-trees">
    ${treeColumn(build.primaryTrees, build)}
    ${treeColumn(build.secondaryTrees, build, true)}
    <div class="rune-shards" role="group" aria-label="Fragmentos de atributos">
      <div class="rune-tree-heading"><h6>Fragmentos</h6></div>
      <div class="rune-slots">${shardSlots.map((slot, index) =>
        runeSlot(slot, build.shards[index] ?? [], build.games, build.shards[index]?.[0]?.value)).join("")}</div>
    </div>
  </div></div>`
}
