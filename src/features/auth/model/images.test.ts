// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { STORAGE_KEYS } from "@/shared/config/storage-keys"
import { hostImages, splitByPendingPrints } from "./images"

const db = vi.hoisted(() => ({ dbGet: vi.fn(), dbSet: vi.fn() }))
const state = vi.hoisted(() => ({
  team: "t1" as string | null,
  account: { id: "a#b" } as { id: string; solo?: boolean } | null,
}))
vi.mock("@/shared/api/firestore", () => db)
vi.mock("@/shared/lib/dom", () => ({ toast: vi.fn() }))
vi.mock("./session", () => ({ session: state }))
vi.mock("./identity", () => ({
  lsGet: (key: string, fallback: unknown) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  },
  lsSet: (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value)),
  meId: () => "a#b",
  teamPath: (sub: string) => `times/t1/${sub}`,
  user: () => state.account,
}))

const pending = () => JSON.parse(localStorage.getItem(STORAGE_KEYS.pendingScreenshots) ?? "[]") as string[]

describe("hostImages", () => {
  beforeEach(() => {
    localStorage.clear()
    db.dbGet.mockReset()
    db.dbSet.mockReset()
    state.team = "t1"
    state.account = { id: "a#b" }
  })

  it("sem time, o print fica na fila deste navegador", async () => {
    state.team = null
    const result = await hostImages.save("data:1")
    expect(result.shared).toBe(false)
    expect(pending()).toEqual([result.id])
    expect(db.dbSet).not.toHaveBeenCalled()
  })

  it("com time, envia o print e não deixa pendência", async () => {
    db.dbSet.mockResolvedValue(undefined)
    const result = await hostImages.save("data:2")
    expect(result.shared).toBe(true)
    expect(db.dbSet).toHaveBeenCalledWith("times/t1/imagens", result.id, expect.objectContaining({ data: "data:2" }))
    expect(pending()).toEqual([])
  })

  it("se o envio falha, guarda na fila e informa o erro", async () => {
    db.dbSet.mockRejectedValue(new Error("offline"))
    const result = await hostImages.save("data:3")
    expect(result).toMatchObject({ shared: false, error: "offline" })
    expect(pending()).toEqual([result.id])
  })

  it("contas solo não compartilham prints", async () => {
    state.account = { id: "a#b", solo: true }
    expect((await hostImages.save("data:4")).shared).toBe(false)
  })

  it("carrega do cache e, se não houver, do time; sem nada devolve null", async () => {
    db.dbSet.mockResolvedValue(undefined)
    const { id } = await hostImages.save("data:5")
    expect(await hostImages.load(id)).toBe("data:5")
    db.dbGet.mockResolvedValue({ data: "data:remoto" })
    expect(await hostImages.load("so-no-time")).toBe("data:remoto")
    db.dbGet.mockRejectedValue(new Error("x"))
    expect(await hostImages.load("sumiu")).toBeNull()
  })

  it("flush reenvia a fila e devolve quantos continuam pendentes", async () => {
    db.dbSet.mockRejectedValueOnce(new Error("offline"))
    const first = await hostImages.save("data:6")
    db.dbSet.mockResolvedValue(undefined)
    expect(await hostImages.flush?.()).toBe(0)
    expect(pending()).toEqual([])
    expect(db.dbSet).toHaveBeenLastCalledWith("times/t1/imagens", first.id, expect.anything())
  })

  it("flush sem time mantém tudo na fila", async () => {
    state.team = null
    await hostImages.save("data:7")
    expect(await hostImages.flush?.()).toBe(1)
  })

  it("não volta ao banco a cada tentativa quando o print ainda não existe", async () => {
    db.dbGet.mockResolvedValue(null)
    expect(await hostImages.load("sumido")).toBeNull()
    expect(await hostImages.load("sumido")).toBeNull()
    expect(db.dbGet).toHaveBeenCalledTimes(1)
    expect(await hostImages.load("sumido", true)).toBeNull()
    expect(db.dbGet).toHaveBeenCalledTimes(2)
  })

  it("isPending só vale para o print que ficou na fila", async () => {
    db.dbSet.mockRejectedValue(new Error("offline"))
    const { id } = await hostImages.save("data:4")
    expect(hostImages.isPending?.(id)).toBe(true)
    expect(hostImages.isPending?.("outro")).toBe(false)
  })
})

describe("splitByPendingPrints", () => {
  beforeEach(() => localStorage.setItem(STORAGE_KEYS.pendingScreenshots, JSON.stringify(["p1"])))

  const tactic = (src: string) => ({
    after: { doc: { type: "doc", content: [{ type: "tacticPrint", attrs: { src, sketch: null, preview: null } }] } },
  })

  it("segura a tática que aponta para print pendente", () => {
    const { ready, held } = splitByPendingPrints([tactic("p1"), tactic("ok")])
    expect(held).toHaveLength(1)
    expect(ready).toHaveLength(1)
  })

  it("sem pendências, tudo segue", () => {
    localStorage.setItem(STORAGE_KEYS.pendingScreenshots, "[]")
    const { ready, held } = splitByPendingPrints([tactic("p1")])
    expect(held).toHaveLength(0)
    expect(ready).toHaveLength(1)
  })
})
