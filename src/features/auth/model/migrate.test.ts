import { beforeEach, describe, expect, it, vi } from "vitest"
import { migrateToTeams } from "./migrate"

const db = vi.hoisted(() => ({
  dbDel: vi.fn(),
  dbGet: vi.fn(),
  dbList: vi.fn(),
  dbSet: vi.fn(),
  getJ: vi.fn(),
}))
vi.mock("@/shared/firestore", () => db)
vi.mock("@/shared/lib/admin-crypto", () => ({ unseal: vi.fn(), verifyObj: vi.fn() }))
vi.mock("./membership", () => ({ loadAdminKey: vi.fn() }))
vi.mock("./session", () => ({ session: { admin: null, keys: null } }))

describe("migrateToTeams", () => {
  beforeEach(() => {
    for (const fn of Object.values(db)) fn.mockReset()
    db.dbList.mockResolvedValue([])
    db.getJ.mockResolvedValue(null)
  })

  it("não faz nada quando a migração já foi registrada", async () => {
    db.dbGet.mockResolvedValueOnce({ team: "fraldinha" })
    expect(await migrateToTeams()).toBe(false)
    expect(db.dbSet).not.toHaveBeenCalled()
  })

  it("cria o time inicial, os membros e a versão oficial vazia, e registra a migração", async () => {
    db.dbGet.mockResolvedValue(null)
    expect(await migrateToTeams()).toBe(true)
    const writes = db.dbSet.mock.calls.map(call => [call[0], call[1]])
    expect(writes).toContainEqual(["times", "fraldinha"])
    expect(writes).toContainEqual(["times/fraldinha/dados", "oficial"])
    expect(writes.at(-1)).toEqual(["oficial", "migracao"])
    expect(writes.some(([collection]) => collection === "membros")).toBe(true)
  })

  it("reaproveita o Fraldinha que o capitão já criou", async () => {
    db.dbGet.mockResolvedValue(null)
    db.dbList.mockImplementation(async (collection: string) =>
      collection === "times" ? [{ id: "fraldinha-x1", name: "Fraldinha", captain: "brunoltz_ltz" }] : [],
    )
    await migrateToTeams()
    expect(db.dbSet.mock.calls.some(call => call[0] === "times")).toBe(false)
    expect(db.dbSet.mock.calls.some(call => call[0] === "times/fraldinha-x1/dados")).toBe(true)
  })

  it("para sem registrar a migração se a versão oficial atual não puder ser lida", async () => {
    db.dbGet.mockImplementation(async (collection: string) =>
      collection.endsWith("/dados") ? { json: "{ não é json" } : null,
    )
    await expect(migrateToTeams()).rejects.toThrow("não pôde ser lida")
    expect(db.dbSet.mock.calls.some(call => call[0] === "oficial")).toBe(false)
  })
})
