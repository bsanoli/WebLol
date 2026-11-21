import { describe, expect, it } from "vitest"
import { SLOT_INFO, SLOT_LIST } from "./champion-slots"

describe("SLOT_LIST e SLOT_INFO", () => {
  it("lista as cinco posições e os bans, nessa ordem", () => {
    expect(SLOT_LIST.map(slot => slot.k)).toEqual(["top", "jg", "mid", "adc", "sup", "ban"])
  })

  it("indexa cada espaço pela chave, com nome e variável de cor próprios", () => {
    expect(SLOT_INFO.sup).toMatchObject({ n: "Suporte", c: "--sup" })
    for (const slot of SLOT_LIST) expect(SLOT_INFO[slot.k]).toBe(slot)
    expect(new Set(SLOT_LIST.map(slot => slot.c)).size).toBe(SLOT_LIST.length)
  })
})
