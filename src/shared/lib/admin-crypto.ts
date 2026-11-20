// Criptografia das chaves do admin (Web Crypto do navegador). Os formatos gravados no Firestore não mudam.
import { idbSet } from "@/shared/api/local-keys"
import { normId } from "./account-id"

type Sealed = { iv: string; ct: string }
type Slot = { salt: string; encPriv: Sealed; sigPriv: Sealed; temp?: boolean; at?: number }
export type AdminRecord = Slot & {
  id: string
  encPub: { n: string }
  sigPub: JsonWebKey & { x: string; y: string }
  slots?: Record<string, Slot>
}
export type AdminKeys = { encPriv: CryptoKey; sigPriv: CryptoKey; fp: string }
type RawKeys = { enc: ArrayBuffer; sig: ArrayBuffer }

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const RSA_IMPORT = { name: "RSA-OAEP", hash: "SHA-256" }
const EC_KEY = { name: "ECDSA", namedCurve: "P-256" }
const EC_SIGN = { name: "ECDSA", hash: "SHA-256" }

export function toBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = new Uint8Array(buffer)
  let text = ""
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}
export const fromBase64 = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0))

async function passwordKey(password: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 250000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

async function aesEncrypt(key: CryptoKey, bytes: BufferSource): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return { iv: toBase64(iv), ct: toBase64(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes)) }
}

const aesDecrypt = (key: CryptoKey, sealed: Sealed) =>
  crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(sealed.iv) as BufferSource },
    key,
    fromBase64(sealed.ct) as BufferSource,
  )

export async function fingerprint(admin: AdminRecord) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(admin.encPub.n + admin.sigPub.x + admin.sigPub.y))
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

// Cada admin tem a sua "fechadura": as mesmas chaves privadas, trancadas com a senha dele.
export const slotOf = (admin: AdminRecord | null | undefined, id: string) =>
  admin && (normId(id) === normId(admin.id) ? admin : admin.slots?.[normId(id)])

export async function slotRaw(admin: AdminRecord, id: string, password: string): Promise<RawKeys> {
  const slot = slotOf(admin, id)
  if (!slot) throw new Error("noslot")
  const key = await passwordKey(password, fromBase64(slot.salt))
  return { enc: await aesDecrypt(key, slot.encPriv), sig: await aesDecrypt(key, slot.sigPriv) }
}

export async function makeSlot(raw: RawKeys, password: string, temp?: boolean): Promise<Slot> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await passwordKey(password, salt)
  return {
    salt: toBase64(salt),
    encPriv: await aesEncrypt(key, raw.enc),
    sigPriv: await aesEncrypt(key, raw.sig),
    temp: !!temp,
    at: Date.now(),
  }
}

// Lança erro se a senha estiver errada.
export async function unlockAdmin(admin: AdminRecord, password: string, id = admin.id): Promise<AdminKeys> {
  const raw = await slotRaw(admin, id, password)
  const encPriv = await crypto.subtle.importKey("pkcs8", raw.enc, RSA_IMPORT, false, ["decrypt"])
  const sigPriv = await crypto.subtle.importKey("pkcs8", raw.sig, EC_KEY, false, ["sign"])
  const keys = { encPriv, sigPriv, fp: await fingerprint(admin) }
  await idbSet("adminKeys", keys)
  return keys
}

export async function unseal(keys: AdminKeys, sealed: Sealed & { wk: string }) {
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, keys.encPriv, fromBase64(sealed.wk) as BufferSource)
  const aes = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"])
  return JSON.parse(decoder.decode(await aesDecrypt(aes, sealed)))
}

export async function verifyObj(admin: AdminRecord, signed: { sig: string; body: string }) {
  try {
    const key = await crypto.subtle.importKey("jwk", admin.sigPub, EC_KEY, false, ["verify"])
    const ok = await crypto.subtle.verify(
      EC_SIGN,
      key,
      fromBase64(signed.sig) as BufferSource,
      encoder.encode(signed.body),
    )
    return ok ? JSON.parse(signed.body) : null
  } catch {
    return null
  }
}
