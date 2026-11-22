import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fromHost,
  canHostManageTeam,
  hasHostCaptainAccess,
  hostImages,
  hostTeamName,
  navigateHost,
} from "./host-bridge"

function stubWindow(parent: object | null, frameElement: object | null = null) {
  const self: Record<string, unknown> = { frameElement }
  self.parent = parent ?? self
  vi.stubGlobal("window", self)
  return self
}

afterEach(() => vi.unstubAllGlobals())

describe("host-bridge", () => {
  it("devolve os valores de reserva quando a tela roda sozinha", () => {
    stubWindow(null)
    expect(hasHostCaptainAccess()).toBe(false)
    expect(canHostManageTeam()).toBe(false)
    expect(hostTeamName()).toBe("")
    expect(hostImages()).toBeNull()
  })

  it("lê o que o app principal expõe", () => {
    const host = { captainAccess: () => true, canManageTeam: () => true, TEAM_NAME: () => "Fraldinha" }
    stubWindow(host)
    expect(hasHostCaptainAccess()).toBe(true)
    expect(canHostManageTeam()).toBe(true)
    expect(hostTeamName()).toBe("Fraldinha")
  })

  it("ignora um armazém de imagens incompleto", () => {
    stubWindow({ weblolImages: { save: () => {} } })
    expect(hostImages()).toBeNull()
    const complete = { save: async () => ({ id: "a", shared: false }), load: async () => null }
    stubWindow({ weblolImages: complete })
    expect(hostImages()).toBe(complete)
  })

  it("usa o valor de reserva quando a janela pai falha", () => {
    stubWindow({
      get captainAccess() {
        throw new Error("bloqueado")
      },
    })
    expect(fromHost<string>(host => String(host.captainAccess?.()), "reserva")).toBe("reserva")
  })

  it("pede a navegação pelo frameElement e não faz nada fora de um iframe", () => {
    vi.stubGlobal(
      "CustomEvent",
      class {
        constructor(
          public type: string,
          public init: { detail: unknown },
        ) {}
      },
    )
    const dispatchEvent = vi.fn()
    stubWindow(null, { dispatchEvent })
    navigateHost({ path: "/time/mapa" })
    expect(dispatchEvent).toHaveBeenCalledOnce()
    expect(dispatchEvent.mock.calls[0][0]).toMatchObject({
      type: "weblol:navigate",
      init: { detail: { path: "/time/mapa" } },
    })
    stubWindow(null)
    expect(() => navigateHost({ path: "/x" })).not.toThrow()
  })
})
