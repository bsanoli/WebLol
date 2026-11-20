import { beforeEach, describe, expect, it, vi } from "vitest"

const stored = new Map<string, unknown>()
vi.mock("@/shared/api/local-keys", () => ({
  idbSet: async (key: string, value: unknown) => void stored.set(key, value),
}))

const { fingerprint, makeSlot, slotOf, slotRaw, toBase64, fromBase64, unlockAdmin, unseal, verifyObj } = await import(
  "./admin-crypto"
)
type Admin = Parameters<typeof fingerprint>[0]

async function createAdmin(password: string): Promise<{ admin: Admin; enc: CryptoKeyPair; sig: CryptoKeyPair }> {
  const enc = (await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  )) as CryptoKeyPair
  const sig = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair
  const raw = {
    enc: await crypto.subtle.exportKey("pkcs8", enc.privateKey),
    sig: await crypto.subtle.exportKey("pkcs8", sig.privateKey),
  }
  const encPub = await crypto.subtle.exportKey("jwk", enc.publicKey)
  const sigPub = await crypto.subtle.exportKey("jwk", sig.publicKey)
  const admin = { id: "panda#zada", ...(await makeSlot(raw, password)), encPub, sigPub } as Admin
  return { admin, enc, sig }
}

describe("admin-crypto", () => {
  beforeEach(() => stored.clear())

  it("converte base64 nos dois sentidos", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255])
    expect([...fromBase64(toBase64(bytes))]).toEqual([...bytes])
  })

  it("destranca com a senha certa e recusa a errada", async () => {
    const { admin } = await createAdmin("segredo")
    const keys = await unlockAdmin(admin, "segredo")
    expect(keys.fp).toBe(await fingerprint(admin))
    expect(stored.get("adminKeys")).toBe(keys)
    await expect(unlockAdmin(admin, "errada")).rejects.toThrow()
    await expect(slotRaw(admin, "outro#br1", "segredo")).rejects.toThrow("noslot")
  })

  it("acha a fechadura do admin e de um admin extra", async () => {
    const { admin } = await createAdmin("segredo")
    const extra = await makeSlot(await slotRaw(admin, admin.id, "segredo"), "outra", true)
    const withSlots = { ...admin, slots: { "bruno#ltz": extra } }
    expect(slotOf(withSlots, "Panda#Zada")).toBe(withSlots)
    expect(slotOf(withSlots, "Bruno#LTZ")).toBe(extra)
    expect(slotOf(withSlots, "x#y")).toBeUndefined()
    await expect(unlockAdmin(withSlots, "outra", "bruno#ltz")).resolves.toBeTruthy()
  })

  it("abre um envelope trancado para o admin", async () => {
    const { admin, enc } = await createAdmin("segredo")
    const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"])
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const body = new TextEncoder().encode(JSON.stringify({ nome: "Fraldinha" }))
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, body)
    const wk = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      enc.publicKey,
      await crypto.subtle.exportKey("raw", aes),
    )
    const keys = await unlockAdmin(admin, "segredo")
    expect(await unseal(keys, { iv: toBase64(iv), ct: toBase64(ct), wk: toBase64(wk) })).toEqual({ nome: "Fraldinha" })
  })

  it("só aceita objeto assinado pela chave do admin", async () => {
    const { admin, sig } = await createAdmin("segredo")
    const body = JSON.stringify({ versao: 3 })
    const sign = async (text: string) =>
      toBase64(
        await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, sig.privateKey, new TextEncoder().encode(text)),
      )
    expect(await verifyObj(admin, { body, sig: await sign(body) })).toEqual({ versao: 3 })
    expect(await verifyObj(admin, { body: '{"versao":4}', sig: await sign(body) })).toBeNull()
    expect(await verifyObj(admin, { body, sig: "lixo" })).toBeNull()
  })
})
