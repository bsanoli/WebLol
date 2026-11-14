import { expect, test } from "@playwright/test"

test("Builds preserva a busca na URL ao recarregar", async ({ page }) => {
  await page.goto("/#/builds?fonte=worlds")

  const builds = page.frameLocator("#v-worlds")
  const search = builds.getByRole("searchbox", { name: "Buscar campeão ou item" })
  const emptyState = builds.getByRole("heading", { name: "Nenhum campeão encontrado" })
  const query = "campeao-inexistente-weblol"

  await expect(emptyState).toBeHidden()
  await search.fill(query)
  await expect(emptyState).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`[?&]busca=${query}(?:&|$)`))

  await page.reload()
  await expect(search).toHaveValue(query)
  await expect(emptyState).toBeVisible()
})

test("Builds alterna de Worlds para SoloQ", async ({ page }) => {
  await page.goto("/#/builds?fonte=worlds")

  await page.frameLocator("#v-worlds").getByRole("button", { name: "SoloQ", exact: true }).click()

  await expect(page).toHaveURL(/[#]\/builds\?fonte=soloq(?:&|$)/)
  const builds = page.frameLocator("#v-soloq")
  await expect(builds.getByRole("searchbox", { name: "Buscar campeão ou item" })).toBeVisible()
  await expect(builds.getByRole("button", { name: "SoloQ", exact: true })).toHaveAttribute("aria-pressed", "true")
})
