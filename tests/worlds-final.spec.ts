import { expect, test } from "@playwright/test"
import { confirmedFinalSeries } from "../src/pages/worlds-overview/model/final-series"

test("Confirma a final mesmo quando as equipes trocam de lado", () => {
  const games = [
    { s: "final-1", st: "Final", g: 1, b: "Gen.G", r: "Bilibili Gaming", bw: true },
    { s: "final-1", st: "Final", g: 2, b: "Gen.G", r: "Bilibili Gaming", bw: false },
    { s: "final-1", st: "Final", g: 3, b: "Gen.G", r: "Bilibili Gaming", bw: false },
    { s: "final-1", st: "Final", g: 4, b: "Bilibili Gaming", r: "Gen.G", bw: true },
  ]
  expect(confirmedFinalSeries([...games].reverse())).toEqual({
    winner: "Bilibili Gaming",
    runnerUp: "Gen.G",
    score: [3, 1],
  })
  expect(confirmedFinalSeries(games.slice(0, 3))).toBeUndefined()
  expect(confirmedFinalSeries([...games.slice(0, 3), { ...games[3], g: 3 }])).toBeUndefined()
  expect(confirmedFinalSeries([...games, { ...games[3], g: 5 }])).toBeUndefined()
})

test("Mostra o placar confirmado somente na visão geral", async ({ page }) => {
  await page.goto("/#/worlds")
  const worlds = page.frameLocator("#v-worlds")
  const scoreboard = worlds.locator("#worlds-final")
  await expect(scoreboard).toBeVisible()
  await expect(scoreboard).toContainText("Bilibili Gaming")
  await expect(scoreboard).toContainText("3 × 1")
  await expect(scoreboard).toContainText("Gen.G")
  const menu = page.getByRole("button", { name: "Worlds", exact: true })
  await menu.press("Enter")
  await expect(page.getByRole("menuitem", { name: "Visão geral" })).toHaveAttribute("aria-current", "page")
  await page.getByRole("menuitem", { name: "Composições do Worlds" }).press("Enter")
  await expect(scoreboard).toBeHidden()
  await expect(worlds.getByRole("heading", { name: "Composições do Worlds" })).toBeVisible()
  await expect(menu).toHaveAttribute("data-current", "")
  await page.goto("/#/worlds/composicoes?busca=Renata")
  await expect(page).toHaveURL(/#\/composicoes\?busca=Renata$/)
  await expect(worlds.getByRole("searchbox", { name: "Buscar" })).toHaveValue("Renata")
})
