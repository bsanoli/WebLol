import { expect, test } from "@playwright/test"

test("Composições do Worlds abre e fecha o draft de uma partida", async ({ page }) => {
  await page.goto("/#/worlds/composicoes")
  const worlds = page.frameLocator("#v-worlds")
  await expect(worlds.getByRole("heading", { name: "Composições do Worlds" })).toBeVisible()
  await worlds.getByRole("button", { name: "Ver draft" }).first().click()
  const draft = worlds.getByRole("dialog", { name: "Detalhes da partida e draft" })
  await expect(draft).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(draft).toBeHidden()
})
