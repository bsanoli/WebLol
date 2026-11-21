import { expect, type FrameLocator, type Page } from "@playwright/test"

export const size = { width: 1600, height: 1000 }

export const vision = (team: Page | FrameLocator) => team.getByRole("group", { name: "Visão", exact: true })
export const visionButton = (team: Page | FrameLocator, side: "geral" | "azul" | "vermelha" | "azul e vermelha") =>
  vision(team).getByRole("button", { name: `Visão ${side}`, exact: true })

export async function choose(team: Page | FrameLocator, field: string, option: string) {
  await team.getByRole("combobox", { name: field, exact: true }).click()
  await team.getByRole("option", { name: option, exact: true }).click()
}

export async function mapPoint(team: Page | FrameLocator, x: number, y: number) {
  const map = (await team.locator("#map").boundingBox())!
  return { x: map.x + map.width * x, y: map.y + map.height * y }
}

export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

/**
 * O mapa realista vem ligado, mas a visão só passa a usar a grade dele quando a imagem termina de carregar
 * (`data-map-visible`). Antes disso vale a grade do minimapa, que não tem os mesmos arbustos. Testes que medem
 * a visão esperam a imagem, senão o resultado depende da velocidade da máquina.
 */
export const waitForRealisticMap = (team: Page | FrameLocator) =>
  expect(team.locator("#mapimg[data-map-visible]")).toBeAttached()
