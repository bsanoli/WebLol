import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { lsGet, lsSet, preview, realUser, user, UKEY, PKEY, meKey } from "./identity"
import { session } from "./session"

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  })
  return store
}

beforeEach(() => {
  session.pendingId = ""
})
afterEach(() => vi.unstubAllGlobals())

describe("lsGet e lsSet", () => {
  it("guarda e lê JSON; valor ausente ou ilegível devolve o padrão", () => {
    const store = stubStorage()
    lsSet("a", { x: 1 })
    expect(lsGet("a")).toEqual({ x: 1 })
    expect(lsGet("b", "padrão")).toBe("padrão")
    store.set("c", "{quebrado")
    expect(lsGet("c", [])).toEqual([])
  })

  it("armazenamento bloqueado não derruba o app", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado")
      },
      setItem: () => {
        throw new Error("cheio")
      },
    })
    expect(lsGet("a", 1)).toBe(1)
    expect(() => lsSet("a", 1)).not.toThrow()
  })
})

describe("user e Ver como", () => {
  it("sem conta salva não há usuário", () => {
    stubStorage()
    expect(realUser()).toBeNull()
    expect(user()).toBeNull()
  })

  it("o Ver como só vale para admin", () => {
    stubStorage({ [UKEY]: JSON.stringify({ id: "ana#BR1", admin: false }), [PKEY]: JSON.stringify("guest") })
    expect(preview()).toBe("")
    expect(user()?.id).toBe("ana#BR1")
  })

  it("admin vendo como visitante não tem usuário e vendo como membro perde o admin", () => {
    const account = JSON.stringify({ id: "bruno#LTZ", admin: true })
    stubStorage({ [UKEY]: account, [PKEY]: JSON.stringify("guest") })
    expect(user()).toBeNull()
    stubStorage({ [UKEY]: account, [PKEY]: JSON.stringify("user") })
    expect(user()).toMatchObject({ id: "bruno#LTZ", admin: false })
    stubStorage({ [UKEY]: account })
    expect(user()?.admin).toBe(true)
  })
})

describe("meKey", () => {
  it("usa o login em andamento antes da conta salva", () => {
    stubStorage({ [UKEY]: JSON.stringify({ id: "ana#BR1" }) })
    expect(meKey()).toBe(meKey())
    session.pendingId = "bia#BR1"
    expect(meKey()).not.toBe("")
  })
})
