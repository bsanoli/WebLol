import { abilityDetail } from "@/entities/ability"
import { esc } from "@/entities/match"
import type { BuildData } from "../model/build-statistics"
import { gameCount, usageOf } from "./build-icons"

function skillIcon(champion: string, slot: string) {
  const detail = abilityDetail(champion, slot)
  const label = slot === "P" ? "Passiva" : slot
  return detail
    ? `<button type="button" class="build-icon-trigger build-ability" data-game-tip="ability:${esc(champion)}:${slot}"
    aria-label="${esc(`${label} · ${detail.name}`)}"><img alt="" class="build-icon" loading="lazy" src="${esc(detail.icon)}"><b aria-hidden="true">${slot}</b></button>`
    : `<strong>${esc(slot)}</strong>`
}

function skillSequence(champion: string, value: string) {
  const slots = ["Q", "W", "E", "R"]
  const points = [...value]
  const levelCount = 18
  const hasExtraPoints = points.length > levelCount
  const icons = slots.map(slot => skillIcon(champion, slot)).join("")
  const cells = Array.from({ length: Math.max(levelCount, points.length) }, (_, index) => {
    const number = index + 1
    const slot = points[index]
    const isExtra = number > levelCount
    const point = hasExtraPoints ? `Ponto registrado ${number}` : `Nível ${number}`
    const numberLabel = isExtra ? `+${number - levelCount}` : number
    if (!slot)
      return `<li class="build-skill-level" aria-label="${point} · Sem registro">
      <span aria-hidden="true">${numberLabel}</span><span class="build-skill-key" aria-hidden="true">–</span></li>`
    const detail = abilityDetail(champion, slot)
    const label = `${point} · ${slot}${detail ? ` · ${detail.name}` : ""}`
    const row = slots.indexOf(slot) + 2
    return `<li class="build-skill-level"><span aria-hidden="true">${numberLabel}</span>
      <span class="build-skill-connector" style="grid-row:2 / ${row + 1}" aria-hidden="true"></span>
      <button type="button" class="build-skill-key build-skill-marker" data-slot-key="${esc(slot)}" aria-label="${esc(label)}"
        style="grid-row:${row}"
        ${detail ? `data-game-tip="ability:${esc(champion)}:${esc(slot)}" data-tip="${point}"` : `data-tip="${esc(label)}"`}>${esc(slot)}</button></li>`
  })
  const legend = (header = '<span aria-hidden="true"></span>') => `<li class="build-skill-icons">${header}${icons}</li>`
  return `${hasExtraPoints ? '<p class="build-skill-sequence-label">Ordem dos pontos registrados</p>' : ""}
    <div class="build-skill-scroll" tabindex="0" role="region" aria-label="Ordem de habilidades por nível">
    <ol class="build-skill-grid" role="list" aria-label="Sequência de pontos de habilidade">
      ${legend(skillIcon(champion, "P"))}${cells.slice(0, levelCount).join("")}
    </ol>
    ${
      hasExtraPoints
        ? `<div class="build-skill-extras">
      <span>Registros adicionais</span><ol class="build-skill-grid" role="list" aria-label="Registros adicionais">${legend()}${cells.slice(levelCount).join("")}</ol>
    </div>`
        : ""
    }</div>`
}

export function buildSkills(champion: string, order: BuildData["skillOrder"], games: number) {
  const [mostCommon, ...alternatives] = order.observedSequences
  const sequences = mostCommon
    ? [mostCommon, ...alternatives.filter(sequence => !sequence.value.startsWith(mostCommon.value)).slice(0, 2)]
    : []
  const priority = order.priority?.firstAndSecond[0] ?? order.priority?.first[0]
  return `<section class="build-skills">
    <header class="build-skill-header">
      <h4>Ordem de habilidades</h4>
      ${
        priority
          ? `<div class="build-skill-priority">Prioridade
        ${priority.value
          .split(">")
          .map(slot => `<span class="build-skill-key" data-slot-key="${esc(slot)}">${esc(slot)}</span>`)
          .join('<span aria-hidden="true">→</span>')}
      </div>`
          : ""
      }
    </header>
    ${
      sequences.length > 1
        ? `<div class="build-skill-options" role="group" aria-label="Sequências mais frequentes">
      ${sequences
        .map(
          (sequence, index) => `<button type="button" data-slot="button" data-variant="outline" data-size="sm"
        data-skill-sequence="${index}" aria-pressed="${index === 0}">${index === 0 ? "Mais comum" : `Alternativa ${index}`} · ${gameCount(sequence.count)}</button>`,
        )
        .join("")}
    </div>`
        : ""
    }
    ${
      sequences.length
        ? sequences
            .map(
              (sequence, index) => `<div data-skill-panel="${index}"${index ? " hidden" : ""}>
      ${skillSequence(champion, sequence.value)}
      <p class="build-data-sample build-skill-sample">${usageOf(sequence, games)}</p>
    </div>`,
            )
            .join("")
        : '<span class="na">Sem sequência de habilidades registrada.</span>'
    }
  </section>`
}
