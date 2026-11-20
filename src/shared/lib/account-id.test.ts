import { describe, expect, it } from "vitest"
import { adminEmail, dispId, isAdminId, normId, playerEmail, safeName } from "./account-id"

describe("account-id", () => {
  it("normaliza, mostra e guarda o Riot ID", () => {
    expect(normId(" Panda # Zada ")).toBe("panda#zada")
    expect(dispId("panda #zada")).toBe("panda#ZADA")
    expect(safeName("Ana Maria#BR1")).toBe("anamaria_br1")
    expect(playerEmail("Panda#Zada")).toBe("panda_zada@weblol.app")
  })

  it("reconhece admins sem diferenciar maiúsculas", () => {
    expect(isAdminId("Panda#ZADA")).toBe(true)
    expect(adminEmail("panda#zada")).toBe("fabiano.rong@gmail.com")
    expect(isAdminId("outro#br1")).toBe(false)
    expect(adminEmail("outro#br1")).toBe("")
  })
})
