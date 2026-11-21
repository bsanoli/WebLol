import { beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => ({
  lists: new Map<string, unknown[]>(),
  docs: new Map<string, unknown>(),
  deleted: [] as string[][],
  fail: new Set<string>(),
}))
vi.mock("@/shared/firestore", () => ({
  // biome-ignore lint/style/useNamingConvention: nome exportado pelo módulo real
  ONLINE: true,
  dbGet: async (collection: string, id: string) => {
    if (db.fail.has(`${collection}/${id}`)) throw new Error("rede")
    return db.docs.get(`${collection}/${id}`) ?? null
  },
  dbList: async (collection: string, field?: string, value?: unknown) =>
    db.lists.get(field ? `${collection}?${field}=${value}` : collection) ?? [],
  dbDel: async (collection: string, id: string) => void db.deleted.push([collection, id]),
}))

import { loadAdminData } from "./admin-data"
import { session } from "./session"
import { resetSession, stubStorage } from "./test-support"

const team = { id: "t1", name: "Time Um", captain: "ana_br1" }
const envio = (id: string, at: number) => ({
  id,
  json: JSON.stringify({ id, from: "ana#br1", at, baseVersion: 1, changes: [] }),
})
const emptyData = { comps: [], plays: [], tactics: [], matchups: [] }

beforeEach(() => {
  db.lists.clear()
  db.docs.clear()
  db.deleted.length = 0
  db.fail.clear()
  stubStorage()
  resetSession()
})

describe("loadAdminData", () => {
  it("sem time e sem ser admin: tudo vazio", async () => {
    const data = await loadAdminData(false)
    expect(data).toMatchObject({ submissions: [], requests: [], members: [], teams: [], everyone: [] })
  })

  it("capitão: separa pedidos pendentes de membros ativos e ordena os envios por data", async () => {
    session.team = team
    db.lists.set("times/t1/envios", [envio("b", 20), envio("a", 10)])
    db.lists.set("membros?team=t1", [
      { id: "x", status: "pendente" },
      { id: "y", status: "ativo" },
    ])
    const data = await loadAdminData(false)
    expect(data.submissions.map(item => item.id)).toEqual(["a", "b"])
    expect(data.requests.map(item => item.id)).toEqual(["x"])
    expect(data.members.map(item => item.id)).toEqual(["y"])
    expect(data.teams).toEqual([])
  })

  it("envio com JSON quebrado aparece como quebrado, sem derrubar a lista", async () => {
    session.team = team
    db.lists.set("times/t1/envios", [{ id: "ruim", json: "{quebrado", from: "ana#br1" }])
    const data = await loadAdminData(false)
    expect(data.submissions).toEqual([{ id: "ruim", doc: "ruim", from: "ana#br1", isBroken: true }])
  })

  it("envio já aplicado na versão oficial é apagado e não aparece", async () => {
    session.team = team
    session.off = { version: 2, at: 0, data: emptyData, log: [{ sid: "a" } as never] }
    db.lists.set("times/t1/envios", [envio("a", 1), envio("b", 2)])
    const data = await loadAdminData(false)
    expect(data.submissions.map(item => item.id)).toEqual(["b"])
    expect(db.deleted).toEqual([["times/t1/envios", "a"]])
  })

  it("admin: lista times por nome e junta contas, filiações e a lista fixa de admins", async () => {
    db.lists.set("contas", [{ id: "ana_br1", riotId: "Ana#BR1" }])
    db.lists.set("times", [
      { id: "t2", name: "Zeta", captain: "z" },
      { id: "t1", name: "Alfa", captain: "a" },
    ])
    db.lists.set("membros", [{ id: "bia_br1", status: "ativo", riotId: "Bia#BR1" }])
    const data = await loadAdminData(true)
    expect(data.teams.map(item => item.name)).toEqual(["Alfa", "Zeta"])
    const byKey = new Map(data.users.map(user => [user.key, user]))
    expect(byKey.get("ana_br1")?.hasAccount).toBe(true)
    expect(byKey.get("bia_br1")).toMatchObject({ hasAccount: false, member: { id: "bia_br1" } })
    expect(data.users.some(user => user.isAdmin)).toBe(true)
    const names = data.users.map(user => user.riotId)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it("admin: falha ao ler a versão oficial de um time deixa só esse time sem versão", async () => {
    db.lists.set("times", [{ id: "t1", name: "Alfa", captain: "a" }])
    db.fail.add("times/t1/dados/oficial")
    const data = await loadAdminData(true)
    expect(data.teams).toEqual([{ id: "t1", name: "Alfa", captain: "a", off: null }])
  })
})
