import { LOL_DATA, lolImage, lolKey, type RuneTree } from "./lol-media"
import { esc } from "./worlds-display"

const trees = Object.values(LOL_DATA.runeTrees)
const shardRows = [
  ["adaptiveforce", "attackspeed", "abilityhaste"],
  ["adaptiveforce", "movespeed", "healthscaling"],
  ["health", "tenacityandslowresist", "healthscaling"],
]

function runeName(key: string) {
  return LOL_DATA.runeNames[key] ?? key
}

function runeChoice(key: string, status: string, active = false) {
  return `<button type="button" class="rune-choice${active ? " is-selected" : ""}" aria-label="${esc(`${runeName(key)} · ${status}`)}" data-tip="${status}" data-rune-tip="${esc(key)}">
    ${lolImage(LOL_DATA.rune[key], "build-icon")}
  </button>`
}

function runeSlot(options: string[], selected?: string, missing = false) {
  return `<div class="rune-options">${options.map(key => {
    const active = key === selected
    return runeChoice(key, active ? "Selecionada" : missing ? "Seleção indisponível" : "Não selecionada", active)
  }).join("")}</div>`
}

function treePanel(tree: RuneTree, selected: string[], secondary = false) {
  const slots = secondary ? tree.slots.slice(1) : tree.slots
  return `<div class="rune-tree" data-rune-tree="${esc(tree.name)}">
    <div class="rune-tree-heading">
      ${lolImage(tree.icon, "build-icon")}
      <h6 aria-label="${esc(tree.name)} · ${secondary ? "Árvore secundária" : "Árvore primária"}">${esc(tree.name)}</h6>
    </div>
    <div class="rune-slots">${slots.map(slot => {
      const choice = selected.find(key => slot.includes(key))
      return runeSlot(slot, choice, !secondary && !choice)
    }).join("")}</div>
  </div>`
}

function shardPanel(shards: string[]) {
  return `<div class="rune-shards" role="group" aria-label="Fragmentos de atributos">
    <div class="rune-tree-heading"><h6>Fragmentos</h6></div>
    <div class="rune-slots">
      ${shards.length
        ? shardRows.map((slot, i) => runeSlot(slot, shards[i])).join("")
        : '<p class="na">Fragmentos indisponíveis nesta amostra.</p>'}
    </div>
  </div>`
}

function recordedRunes(rows: string[], english: string[]) {
  return `<div class="runes">${rows.map((row, i) => {
    const names = english[i]?.split(", ") ?? []
    return `<div class="rune-group">${row.split(", ").map((name, j) => {
      const key = lolKey(names[j] ?? name)
      return LOL_DATA.rune[key] ? runeChoice(key, "Selecionada", true) : `<span class="na">${esc(name)}</span>`
    }).join("")}</div>`
  }).join("")}</div>`
}

export function readRunePage(english: string[]) {
  const groups = english.map(row => row.split(", ").map(lolKey))
  // Some records put all six runes in one group and omit the shards.
  const primary = groups.length === 1 ? groups[0].slice(0, 4) : groups[0] ?? []
  const secondary = groups.length === 1 ? groups[0].slice(4, 6) : groups[1] ?? []
  const shards = groups[2] ?? []
  const primaryTree = trees.find(tree =>
    tree && tree.slots[0].includes(primary[0]) &&
    tree.slots.filter(slot => primary.some(key => slot.includes(key))).length === primary.length,
  )
  const secondaryTree = trees.find(tree =>
    tree && tree !== primaryTree && secondary.length === 2 &&
    tree.slots.slice(1).filter(slot => secondary.some(key => slot.includes(key))).length === 2,
  )
  return { primary, secondary, shards, primaryTree, secondaryTree }
}

export function runePage(rows: string[], english: string[]) {
  const { primary, secondary, shards, primaryTree, secondaryTree } = readRunePage(english)
  if (!primaryTree || !secondaryTree || (shards.length > 0 &&
    (shards.length !== shardRows.length || !shardRows.every((slot, i) => slot.includes(shards[i]))))) {
    return recordedRunes(rows, english)
  }

  return `<div class="rune-page"><div class="rune-trees">
    ${treePanel(primaryTree, primary)}${treePanel(secondaryTree, secondary, true)}${shardPanel(shards)}
  </div></div>`
}
