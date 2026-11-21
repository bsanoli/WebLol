import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const db = vi.hoisted(() => ({
  docs: new Map<string, unknown>(),
  sets: [] as { path: string; id: string; data: Record<string, unknown> }[],
  failRead: false,
  failWrite: false,
}))
const ui = vi.hoisted(() => ({ toasts: [] as string[], routes: [] as string[] }))

vi.mock("@/shared/firestore", () => ({
  // biome-ignore lint/style/useNamingConvention: nome exportado pelo módulo real
  ONLINE: true,
  currentFirebase: () => ({ auth: { currentUser: { email: "x" } } }),
  fb: async () => ({}),
  dbGet: async (collection: string, id: string) => {
    if (db.failRead) throw new Error("rede")
    return db.docs.get(`${collection}/${id}`) ?? null
  },
  dbSet: async (path: string, id: string, data: Record<string, unknown>) => {
    if (db.failWrite) throw new Error("sem permissão")
    db.sets.push({ path, id, data })
  },
}))
vi.mock("@/shared/lib/dom", () => ({ toast: (message: string) => void ui.toasts.push(message) }))
vi.mock("./router", () => ({
  routeRoots: { admin: "/admin" },
  writeRoute: (path: string) => void ui.routes.push(path),
  openRoute: () => {},
}))
const prints = vi.hoisted(() => ({ holdAll: false }))
vi.mock("./images", () => ({
  flushImages: async () => {},
  pendingPrintReason: () => "o banco recusou",
  splitByPendingPrints: <T>(changes: T[]) =>
    prints.holdAll ? { ready: [], held: changes } : { ready: changes, held: [] },
}))

import { BKEY, KEY, PKEY, SKEY, UKEY } from "./identity"
import { session } from "./session"
import { publish, readOfficial, sendChanges, sync } from "./sync"
import { resetSession, stubStorage } from "./test-support"
import { bindUiHooks } from "./ui-hooks"

const emptyData = { comps: [], plays: [], tactics: [], matchups: [] }
const time = { id: "t1", name: "Time Um", captain: "ana_br1" }
const oficial = (version: number, extra: object = {}) => ({
  json: JSON.stringify({ version, at: 1, data: { ...emptyData, ...extra }, log: [] }),
})
const hooks = { renderAdmin: vi.fn(), setSync: vi.fn(), updateStatus: vi.fn() }

beforeEach(() => {
  db.docs.clear()
  db.sets.length = 0
  db.failRead = false
  db.failWrite = false
  prints.holdAll = false
  ui.toasts.length = 0
  ui.routes.length = 0
  for (const hook of Object.values(hooks)) hook.mockClear()
  bindUiHooks(hooks)
  resetSession()
})
afterEach(() => vi.unstubAllGlobals())

describe("readOfficial", () => {
  it("sem time: noteam", async () => {
    stubStorage()
    expect(await readOfficial()).toEqual({ err: "noteam" })
  })

  it("time sem versão oficial ainda: começa da versão 0", async () => {
    stubStorage()
    session.team = time
    expect((await readOfficial()).off?.version).toBe(0)
  })

  it("versão oficial ilegível: bad", async () => {
    stubStorage()
    session.team = time
    db.docs.set("times/t1/dados/oficial", { json: "{quebrado" })
    expect(await readOfficial()).toEqual({ err: "bad" })
  })

  it("versão oficial válida", async () => {
    stubStorage()
    session.team = time
    db.docs.set("times/t1/dados/oficial", oficial(4))
    expect((await readOfficial()).off?.version).toBe(4)
  })
})

describe("sync", () => {
  it("sem time ou conta solo: só atualiza o status, sem tocar o banco", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false, solo: true } })
    session.team = time
    await sync()
    expect(hooks.updateStatus).toHaveBeenCalled()
    expect(session.off).toBeNull()
  })

  it("falha de rede: avisa e marca que o banco não respondeu", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    session.team = time
    db.failRead = true
    await sync()
    expect(session.net).toBe(false)
    expect(hooks.setSync).toHaveBeenCalledWith("Sem conexão com o banco do time", "bad")
  })

  it("primeira vez: grava a versão oficial na cópia local e recarrega a Área do time", async () => {
    const store = stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    session.team = time
    session.reloadCamp = vi.fn()
    db.docs.set("times/t1/dados/oficial", oficial(2, { comps: [{ id: "c1", name: "Comp" }] }))
    await sync()
    expect(session.net).toBe(true)
    expect(JSON.parse(store.get(BKEY) as string).version).toBe(2)
    expect(JSON.parse(store.get(KEY) as string).comps).toHaveLength(1)
    expect(session.reloadCamp).toHaveBeenCalledOnce()
  })

  it("mesma versão da cópia local: não recarrega", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false }, [BKEY]: { version: 2, data: emptyData } })
    session.team = time
    session.reloadCamp = vi.fn()
    db.docs.set("times/t1/dados/oficial", oficial(2))
    await sync()
    expect(session.reloadCamp).not.toHaveBeenCalled()
  })

  it("alteração minha recusada pelo capitão é descartada e avisada", async () => {
    const store = stubStorage({
      [UKEY]: { id: "ana#br1", admin: false },
      [BKEY]: { version: 1, data: emptyData },
      [KEY]: { ...emptyData, comps: [{ id: "c1", name: "Minha" }] },
    })
    session.team = time
    session.reloadCamp = vi.fn()
    // a mesma alteração, vista pelo `pending`, para pegar o hash que o capitão recusou
    const { pending } = await import("./identity")
    const [change] = pending()
    expect(change?.h).toBeTruthy()
    const log = [{ sid: "s", from: "ana#br1", status: "rejected", h: change?.h }]
    db.docs.set("times/t1/dados/oficial", {
      json: JSON.stringify({ version: 2, at: 1, data: emptyData, log }),
    })
    await sync()
    expect(ui.toasts.some(text => text.includes("foi recusada pelo capitão"))).toBe(true)
    expect(JSON.parse(store.get(KEY) as string).comps).toEqual([])
    expect(JSON.parse(store.get(BKEY) as string).version).toBe(2)
    expect(session.reloadCamp).toHaveBeenCalledOnce()
  })

  it("versão nova sem recusa: a minha alteração pendente continua na cópia local", async () => {
    const store = stubStorage({
      [UKEY]: { id: "ana#br1", admin: false },
      [BKEY]: { version: 1, data: emptyData },
      [KEY]: { ...emptyData, comps: [{ id: "c1", name: "Minha" }] },
    })
    session.team = time
    session.reloadCamp = vi.fn()
    db.docs.set("times/t1/dados/oficial", oficial(2))
    await sync()
    expect(JSON.parse(store.get(KEY) as string).comps).toEqual([{ id: "c1", name: "Minha" }])
    expect(JSON.parse(store.get(BKEY) as string).version).toBe(2)
    expect(ui.toasts).toEqual([])
  })
})

describe("sendChanges", () => {
  const jogador = { [UKEY]: { id: "ana#br1", admin: false } }
  const comAlteracao = {
    ...jogador,
    [BKEY]: { version: 1, data: emptyData },
    [KEY]: { ...emptyData, comps: [{ id: "c1", name: "Nova" }] },
  }

  it("sem time ou sem cópia oficial: avisa que não há conexão", async () => {
    stubStorage(jogador)
    await sendChanges()
    expect(ui.toasts).toEqual(["Sem conexão com o banco do time"])
    expect(db.sets).toEqual([])
  })

  it("sem alterações novas: não envia nada", async () => {
    stubStorage({ ...jogador, [BKEY]: { version: 1, data: emptyData }, [KEY]: emptyData })
    session.team = time
    await sendChanges()
    expect(db.sets).toEqual([])
  })

  it("envia as alterações para o capitão e lembra o que já foi enviado", async () => {
    const store = stubStorage(comAlteracao)
    session.team = time
    await sendChanges()
    expect(db.sets).toHaveLength(1)
    expect(db.sets[0]?.path).toBe("times/t1/envios")
    const sent = JSON.parse(db.sets[0]?.data.json as string)
    expect(sent.baseVersion).toBe(1)
    expect(sent.changes).toHaveLength(1)
    expect(JSON.parse(store.get(SKEY) as string)).toHaveLength(1)
    await sendChanges()
    expect(db.sets).toHaveLength(1)
  })

  it("falha ao gravar: avisa o erro e não marca como enviado", async () => {
    const store = stubStorage(comAlteracao)
    session.team = time
    db.failWrite = true
    await sendChanges()
    expect(ui.toasts[0]).toContain("Não consegui enviar para o banco do time: sem permissão")
    expect(store.has(SKEY)).toBe(false)
  })
})

describe("prints que ainda não chegaram ao time", () => {
  it("envio: a alteração fica de fora e o motivo aparece", async () => {
    stubStorage({
      [UKEY]: { id: "ana#br1", admin: false },
      [BKEY]: { version: 1, data: emptyData },
      [KEY]: { ...emptyData, comps: [{ id: "c1", name: "Nova" }] },
    })
    session.team = time
    prints.holdAll = true
    await sendChanges()
    expect(db.sets).toEqual([])
    expect(ui.toasts[0]).toContain("o banco recusou")
  })

  it("publicação: não publica enquanto o print não chegou", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    session.team = time
    prints.holdAll = true
    const change = { kind: "comp", op: "add", id: "c1", name: "Nova", sid: "s", from: "x", h: "h" }
    await publish([change] as never, [], "v")
    expect(db.sets).toEqual([])
    expect(ui.toasts[0]).toContain("Não publiquei: o print")
  })
})

describe("ver como e admin sem desbloqueio", () => {
  it("ver como outra pessoa: o envio é bloqueado", async () => {
    stubStorage({ [UKEY]: { id: "panda#zada", admin: true }, [PKEY]: "user" })
    session.team = time
    await sendChanges()
    expect(ui.toasts[0]).toContain("nada foi enviado")
    expect(db.sets).toEqual([])
  })

  it("admin sem entrar no banco: a publicação pede o desbloqueio", async () => {
    stubStorage({ [UKEY]: { id: "panda#zada", admin: true } })
    session.team = { ...time, captain: "outra_br1" }
    await publish([], [], "v")
    expect(ui.toasts).toEqual(["Desbloqueie o admin primeiro"])
    expect(ui.routes).toEqual(["/admin"])
  })
})

describe("publish", () => {
  it("jogador comum não publica: vai para a Administração e recebe o aviso", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    session.team = { ...time, captain: "outra_br1" }
    await publish([], [], "v")
    expect(ui.routes).toEqual(["/admin"])
    expect(ui.toasts).toEqual(["Só o capitão publica a versão oficial do time"])
    expect(db.sets).toEqual([])
  })

  it("capitão publica a próxima versão com o log de aprovadas e recusadas", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    session.team = { ...time, captain: "ana_br1" }
    db.docs.set("times/t1/dados/oficial", oficial(3))
    const approved = [
      {
        kind: "comp",
        op: "add",
        id: "c1",
        name: "Nova",
        sid: "s1",
        from: "bia#br1",
        h: "h1",
        after: { id: "c1", name: "Nova" },
      },
    ]
    await publish(approved as never, [], "Rodada 1")
    const written = db.sets.find(item => item.id === "oficial")
    expect(written).toBeTruthy()
    const official = JSON.parse(written?.data.json as string)
    expect(official.version).toBe(4)
    expect(official.label).toBe("Rodada 1")
    expect(official.log).toHaveLength(1)
    expect(official.log[0]).toMatchObject({ v: 4, status: "approved", from: "bia#br1" })
    expect(official.data.comps.map((comp: { id: string }) => comp.id)).toEqual(["c1"])
    expect(ui.toasts.at(-1)).toContain("Versão oficial v4 do Time Um publicada")
  })

  it("falha ao gravar: avisa e não sincroniza", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    session.team = time
    db.failWrite = true
    await publish([], [], "v")
    expect(ui.toasts.at(-1)).toBe("Não consegui publicar: sem permissão")
    expect(hooks.renderAdmin).not.toHaveBeenCalled()
    expect(db.sets).toEqual([])
  })

  it("sem conexão para ler a versão atual: não publica", async () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    session.team = time
    db.failRead = true
    await publish([], [], "v")
    expect(ui.toasts).toEqual(["Erro lendo a versão oficial: sem conexão"])
    expect(db.sets).toEqual([])
  })
})
