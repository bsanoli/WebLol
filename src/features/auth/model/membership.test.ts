import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const docs = vi.hoisted(() => new Map<string, unknown>())
const written = vi.hoisted(() => [] as unknown[][])
vi.mock("@/shared/firestore", () => ({
  IS_ONLINE: true,
  currentFirebase: () => ({
    auth: { currentUser: docs.get("__email__") ? { email: docs.get("__email__") } : null },
  }),
  fb: async () => ({
    auth: { currentUser: null },
    au: {
      signInWithEmailAndPassword: async () => {
        if (docs.get("__senha_errada__")) throw new Error("auth/wrong-password")
      },
    },
  }),
  dbGet: async (collection: string, id: string) => {
    if (docs.get("__falha__")) throw new Error("rede")
    return docs.get(`${collection}/${id}`) ?? null
  },
  getJ: async (collection: string, id: string) => docs.get(`${collection}/${id}`) ?? null,
  putJ: async (...args: unknown[]) => void written.push(args),
}))

// A impressão digital vira "fp-" + n: o registro com n "bom" é o original fixado no app.
vi.mock("@/shared/config", async importOriginal => ({
  ...(await importOriginal<typeof import("@/shared/config")>()),
  ADMIN_FP: "fp-bom",
}))
vi.mock("@/shared/lib/admin-crypto", async importOriginal => ({
  ...(await importOriginal<typeof import("@/shared/lib/admin-crypto")>()),
  fingerprint: async (admin: { encPub: { n: string } }) => `fp-${admin.encPub.n}`,
  unlockAdmin: async () => ({ fp: "chaves-falsas" }),
}))

import { ADMINS } from "@/shared/config"
import { clearTeamData, guardTeam, adminUnlock, loadAdminKey, loadMembership, setSlot } from "./membership"
import { session } from "./session"
import { KEY, TKEY, UKEY, VKEY, FPKEY, PKEY, BKEY } from "./identity"
import { resetSession, stubStorage } from "./test-support"

/** Registro de admin só com os campos que entram na impressão digital; `n` muda a impressão. */
const record = (n: string, id = "Chefe#BR1") => ({ id, encPub: { n }, sigPub: { x: "x", y: "y" }, slots: {} })

const jogador = { id: "Ana#BR1", admin: false }

beforeEach(() => {
  docs.clear()
  written.length = 0
  resetSession()
})
afterEach(() => vi.unstubAllGlobals())

describe("loadMembership", () => {
  it("conta aceita: preenche o time e o nome na filiação", async () => {
    stubStorage({ [UKEY]: jogador })
    docs.set("membros/ana_br1", { team: "t1", status: "ativo" })
    docs.set("times/t1", { name: "Time Um", captain: "ana_br1" })
    await loadMembership()
    expect(session.team).toEqual({ id: "t1", name: "Time Um", captain: "ana_br1" })
    expect(session.memb?.teamName).toBe("Time Um")
  })

  it("pedido pendente: guarda a filiação, mas ainda não há time", async () => {
    stubStorage({ [UKEY]: jogador })
    docs.set("membros/ana_br1", { team: "t1", status: "pendente" })
    docs.set("times/t1", { name: "Time Um", captain: "x" })
    await loadMembership()
    expect(session.memb?.status).toBe("pendente")
    expect(session.team).toBeNull()
  })

  it("sem filiação: não há time nem pedido", async () => {
    stubStorage({ [UKEY]: jogador })
    await loadMembership()
    expect(session.memb).toBeNull()
    expect(session.team).toBeNull()
  })

  it("jogador comum não vê outro time e perde a escolha guardada", async () => {
    const store = stubStorage({ [UKEY]: jogador, [VKEY]: "t2" })
    docs.set("times/t2", { name: "Outro", captain: "z" })
    await loadMembership()
    expect(session.team).toBeNull()
    expect(store.has(VKEY)).toBe(false)
  })

  it("falha de rede: o erro sobe para quem chamou", async () => {
    stubStorage({ [UKEY]: jogador })
    docs.set("__falha__", true)
    await expect(loadMembership()).rejects.toThrow("rede")
  })

  it("conta solo que entra num time deixa de ser solo", async () => {
    const store = stubStorage({ [UKEY]: { ...jogador, solo: true } })
    docs.set("membros/ana_br1", { team: "t1", status: "ativo" })
    docs.set("times/t1", { name: "Time Um", captain: "x" })
    await loadMembership()
    expect(JSON.parse(store.get(UKEY) as string).solo).toBe(false)
  })
})

describe("admin vendo outro time", () => {
  const admin = { id: "panda#zada", admin: true }
  const outro = { name: "Outro", captain: "z" }

  it("admin entrou no banco: vê o time escolhido, marcado como visita", async () => {
    stubStorage({ [UKEY]: admin, [VKEY]: "t2" })
    docs.set("__email__", ADMINS["panda#zada"])
    docs.set("times/t2", outro)
    await loadMembership()
    expect(session.team).toEqual({ id: "t2", ...outro, viewing: true })
  })

  it("o time escolhido não existe mais: a escolha é esquecida", async () => {
    const store = stubStorage({ [UKEY]: admin, [VKEY]: "t2" })
    docs.set("__email__", ADMINS["panda#zada"])
    await loadMembership()
    expect(session.team).toBeNull()
    expect(store.has(VKEY)).toBe(false)
  })

  it("admin sem entrar no banco não vê outro time", async () => {
    stubStorage({ [UKEY]: admin, [VKEY]: "t2" })
    docs.set("times/t2", outro)
    await loadMembership()
    expect(session.team).toBeNull()
  })
})

describe("guardTeam e clearTeamData", () => {
  it("Ver como visitante: a cópia local é a de visitante", () => {
    const store = stubStorage({ [UKEY]: { id: "panda#zada", admin: true }, [PKEY]: "guest", [KEY]: 1 })
    guardTeam()
    expect(JSON.parse(store.get(TKEY) as string)).toBe("__guest__")
    expect(store.has(KEY)).toBe(false)
  })

  it("conta solo: a cópia local é a de solo", () => {
    const store = stubStorage({ [UKEY]: { ...jogador, solo: true }, [BKEY]: 1 })
    guardTeam()
    expect(JSON.parse(store.get(TKEY) as string)).toBe("__solo__")
    expect(store.has(BKEY)).toBe(false)
  })

  it("trocar de time apaga a cópia local e recarrega a Área do time", () => {
    const store = stubStorage({ [UKEY]: jogador, [TKEY]: "t1", [KEY]: { comps: [1] } })
    const reload = vi.fn()
    session.reloadCamp = reload
    session.team = { id: "t2", name: "B", captain: "x" }
    guardTeam()
    expect(store.has(KEY)).toBe(false)
    expect(JSON.parse(store.get(TKEY) as string)).toBe("t2")
    expect(reload).toHaveBeenCalledOnce()
  })

  it("mesmo time: não apaga nada", () => {
    const store = stubStorage({ [UKEY]: jogador, [TKEY]: "t1", [KEY]: { comps: [1] } })
    const reload = vi.fn()
    session.reloadCamp = reload
    session.team = { id: "t1", name: "A", captain: "x" }
    guardTeam()
    expect(store.has(KEY)).toBe(true)
    expect(reload).not.toHaveBeenCalled()
  })

  it("clearTeamData limpa o time, a filiação e as chaves locais", () => {
    const store = stubStorage({ [KEY]: 1, [TKEY]: "t1", [VKEY]: "t1" })
    session.team = { id: "t1", name: "A", captain: "x" }
    session.teamsCache = []
    clearTeamData()
    expect(session.team).toBeNull()
    expect(session.teamsCache).toBeNull()
    expect([...store.keys()]).toEqual([])
  })
})

describe("loadAdminKey", () => {
  it("sem registro no banco devolve noadmin", async () => {
    stubStorage()
    expect(await loadAdminKey()).toBe("noadmin")
  })

  it("registro com impressão digital diferente da original é recusado", async () => {
    stubStorage()
    docs.set("oficial/admin", record("outro"))
    expect(await loadAdminKey()).toBe("fp")
    expect(session.admin).toBeNull()
  })

  it("registro original: libera, fixa a impressão neste aparelho e guarda o registro", async () => {
    const store = stubStorage()
    docs.set("oficial/admin", record("bom"))
    expect(await loadAdminKey()).toBe("")
    expect(session.admin).toMatchObject({ id: "Chefe#BR1" })
    expect(store.get(FPKEY)).toBe(JSON.stringify("fp-bom"))
  })

  it("impressão fixada neste aparelho diferente da do banco também é recusada", async () => {
    const store = stubStorage({ [FPKEY]: "antiga" })
    docs.set("oficial/admin", record("outro"))
    expect(await loadAdminKey()).toBe("fp")
    expect(store.get(FPKEY)).toBe(JSON.stringify("antiga"))
  })
})

describe("setSlot", () => {
  const slotsGravados = (index: number) => (written[index]?.[2] as { slots: object } | undefined)?.slots
  it("recusa quando a chave do admin no banco mudou", async () => {
    stubStorage()
    session.admin = record("1", "a") as never
    docs.set("oficial/admin", record("2", "a"))
    await expect(setSlot("b#1", null)).rejects.toThrow("chave do admin no banco mudou")
    expect(written).toEqual([])
  })

  it("não deixa mexer no admin principal", async () => {
    stubStorage()
    const admin = record("1")
    session.admin = admin as never
    docs.set("oficial/admin", admin)
    await expect(setSlot("chefe#br1", null)).rejects.toThrow("admin principal")
  })

  it("grava e remove a fechadura de outro admin", async () => {
    stubStorage()
    const admin = record("1")
    session.admin = admin as never
    docs.set("oficial/admin", admin)
    await setSlot("Outro#BR1", { k: 1 } as never)
    expect(slotsGravados(0)).toEqual({ "outro#br1": { k: 1 } })
    await setSlot("Outro#BR1", null)
    expect(slotsGravados(1)).toEqual({})
  })
})

describe("adminUnlock", () => {
  it("sem registro do admin carregado, falha com noadmin", async () => {
    stubStorage()
    await expect(adminUnlock("senha")).rejects.toThrow("noadmin")
  })

  it("senha certa: devolve as chaves", async () => {
    stubStorage({ [UKEY]: { id: "panda#zada", admin: true } })
    session.admin = record("1") as never
    await expect(adminUnlock("senha")).resolves.toEqual({ fp: "chaves-falsas" })
  })

  it("entrada no banco recusada: o erro fb leva as chaves já abertas", async () => {
    stubStorage({ [UKEY]: { id: "panda#zada", admin: true } })
    docs.set("__senha_errada__", true)
    session.admin = record("1") as never
    const error = (await adminUnlock("senha").catch(e => e)) as Error & { keys?: unknown }
    expect(error.message).toBe("fb")
    expect(error.keys).toEqual({ fp: "chaves-falsas" })
  })
})
