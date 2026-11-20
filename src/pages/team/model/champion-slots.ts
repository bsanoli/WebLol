// Onde um campeão pode ficar numa composição: uma das cinco posições ou os bans (glossário: posição, ban).
import type { ChampionSlot } from "./local-state"

export type SlotInfo = {
  /** Chave do espaço (`top`, `jg`, `mid`, `adc`, `sup` ou `ban`). */
  k: ChampionSlot
  /** Nome mostrado na tela. */
  n: string
  /** Variável CSS da cor do espaço. */
  c: string
}

export const SLOT_LIST: readonly SlotInfo[] = [
  { k: "top", n: "Top", c: "--top" },
  { k: "jg", n: "Jungle", c: "--jg" },
  { k: "mid", n: "Mid", c: "--mid" },
  { k: "adc", n: "ADC", c: "--adc" },
  { k: "sup", n: "Suporte", c: "--sup" },
  { k: "ban", n: "Bans", c: "--ban" },
]

export const SLOT_INFO = Object.fromEntries(SLOT_LIST.map(slot => [slot.k, slot])) as Record<ChampionSlot, SlotInfo>
