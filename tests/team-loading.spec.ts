import { expect, test, type Page } from "@playwright/test"

function trackTeamRequests(page: Page) {
  const requested = { map: 0, knowledge: 0, compositionSplashes: 0 }
  page.on("request", request => {
    const path = new URL(request.url()).pathname
    if (/\/widgets\/tactical-map\/index\.ts$|\/map\/(map11\.png|summoners-rift-realista\.jpeg)$/.test(path)) {
      requested.map++
    }
    if (path.endsWith("/widgets/team-knowledge/index.ts")) requested.knowledge++
    if (path.includes("/cdn/img/champion/splash/")) requested.compositionSplashes++
  })
  return requested
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window === window.top) localStorage.setItem("lol-guest", "true")
  })
})

test("Composições carrega o mapa e Conhecimento só ao abrir as seções", async ({ page }) => {
  const requested = trackTeamRequests(page)
  const team = page.frameLocator("#v-camp")
  await page.goto("/#/time/composicoes")
  await expect(team.getByRole("heading", { name: "Composições do time" })).toBeVisible()
  expect(requested.map).toBe(0)
  expect(requested.knowledge).toBe(0)

  const teamMenu = page.getByRole("button", { name: "Área do time", exact: true })
  await teamMenu.hover()
  await page.getByRole("menuitem", { name: "Mapa tático", exact: true }).click()
  await expect(team.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  expect(requested.map).toBeGreaterThan(0)
  expect(requested.knowledge).toBe(0)

  await teamMenu.hover()
  await page.getByRole("menuitem", { name: "Conhecimento", exact: true }).click()
  await expect(team.getByRole("heading", { name: "Objetivos do rio" })).toBeVisible()
  expect(requested.knowledge).toBeGreaterThan(0)
})

test("Link direto para o Mapa tático não solicita os splashes de Composições", async ({ page }) => {
  const requested = trackTeamRequests(page)
  const team = page.frameLocator("#v-camp")
  await page.goto("/#/time/mapa")
  await expect(team.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  expect(requested.map).toBeGreaterThan(0)
  expect(requested.knowledge).toBe(0)
  expect(requested.compositionSplashes).toBe(0)
})
