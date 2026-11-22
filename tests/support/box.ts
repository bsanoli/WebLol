import type { Locator } from "@playwright/test"

/** Caixa do elemento na tela. Falha com mensagem clara se ele não estiver visível. */
export async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error("Elemento sem caixa visível")
  return box
}

/** Garante que o valor existe (atributo, objeto etc.) e o devolve já sem `null` ou `undefined`. */
export function required<T>(value: T | null | undefined, description: string): T {
  if (value === null || value === undefined) throw new Error(`Valor ausente: ${description}`)
  return value
}
