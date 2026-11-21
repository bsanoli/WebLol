// Seleção em edição na Área do time: qual posição (ou bans) e qual lado do quadro recebem a próxima edição.
import type { ChampionSlot, Composition } from "../model/local-state"
import { findMatchup } from "../model/matchups"
import { activeMatchup, cur, S } from "./team-store"

/** Lado do quadro em edição: a comp aberta ("us") ou a adversária escolhida ("rival"). */
export type ActiveSide = "us" | "rival"

export const session: { active: ChampionSlot; side: ActiveSide } = { active: "top", side: "us" }

/** Adversária do confronto aberto (só quando a comp aberta é a nossa dele). */
export const boardEnemy = (): Composition | null => {
  const active = activeMatchup()
  return (active?.ours && findMatchup(S.comps, S.matchups, active.id)?.enemy) || null
}

/** Comp que recebe as edições do quadro e da grade de campeões. */
export function target(): Composition {
  if (S.view !== "map" && session.side === "rival") {
    const enemy = boardEnemy()
    if (enemy) return enemy
    session.side = "us"
  }
  return cur()
}

/** Ações que dependem da página inteira; a página as liga na inicialização para evitar imports circulares. */
export const hooks = {
  renderEditor: () => {},
  renderAll: () => {},
  publishRoute: (_view: "comps" | "map" | "know" | "cap") => {},
}
