// Riot ID de conta: forma de comparar, de mostrar e de guardar (nome de documento e e-mail do Firebase).
import { ADMINS } from "@/shared/config"

export const normId = (id: string) => String(id).replace(/\s+/g, "").toLowerCase()

export const dispId = (id: string) => {
  const [name = "", tag] = String(id).split("#")
  return `${name.trim()}#${(tag || "").trim().toUpperCase()}`
}

export const safeName = (id: string) =>
  normId(id)
    .replace("#", "_")
    .replace(/[^a-z0-9_-]/g, "_")

export const isAdminId = (id: string) => Object.hasOwn(ADMINS, normId(id))

export const adminEmail = (id: string) => ADMINS[normId(id)] || ""

// Conta do jogador no Firebase (Riot ID + senha).
export const playerEmail = (id: string) => `${safeName(id)}@weblol.app`
