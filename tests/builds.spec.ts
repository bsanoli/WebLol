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

test("Histórico de compras exibe carregamento, erro e recupera com nova tentativa", async ({ page }) => {
  let releaseFailure = () => {}
  const failureReady = new Promise<void>(resolve => {
    releaseFailure = resolve
  })
  await page.route(
    "**/data/worlds-2026-build-timeline.json",
    async route => {
      await failureReady
      await route.fulfill({ status: 503 })
    },
    { times: 1 },
  )

  await page.goto("/#/builds/ahri?fonte=worlds", { waitUntil: "domcontentloaded" })
  const builds = page.frameLocator("#v-worlds")
  const history = builds.getByRole("region", { name: "Compras jogo a jogo" })
  try {
    await expect(history.getByText("Carregando compras jogo a jogo…")).toBeVisible()
    await expect(builds.locator(".build-card-meta")).toContainText(/Worlds\s+Mid\s+Amostra de \d+ jogos?/)
  } finally {
    releaseFailure()
  }
  await expect(history.getByText("Não foi possível carregar o histórico de compras.")).toBeVisible()
  await history.getByRole("button", { name: "Tentar novamente" }).press("Enter")
  await expect(history.getByRole("button", { name: "Todas as compras" })).toBeVisible()
  await expect(history).toBeFocused()
  await expect(history.locator(".build-timeline-game").first()).toBeVisible()
})

test("Histórico sem compras permanece na página da build SoloQ", async ({ page }) => {
  await page.route("**/data/soloq/build-timeline.json", route => route.fulfill({ json: { games: [] } }))
  await page.goto("/#/builds/jayce?fonte=soloq")
  const builds = page.frameLocator("#v-soloq")
  await expect(builds.locator(".build-card-meta")).toContainText(/SoloQ dos pros\s+Top\s+Amostra de \d+ jogos?/)
  const history = builds.getByRole("region", { name: "Compras jogo a jogo" })
  await expect(history.getByText("Sem compras registradas.")).toBeVisible()
  await expect(history.getByRole("button", { name: "Tentar novamente" })).toHaveCount(0)
})

test("Confrontos do campeão só baixam ao escolher um adversário e se recuperam de falha", async ({ page }) => {
  const requested: string[] = []
  let failFirst = true
  await page.route("**/encounters/*.json*", async route => {
    requested.push(new URL(route.request().url()).pathname.split("/").pop() ?? "")
    if (failFirst) {
      failFirst = false
      await route.fulfill({ status: 503 })
      return
    }
    await route.continue()
  })

  await page.goto("/#/builds?fonte=soloq")
  const builds = page.frameLocator("#v-soloq")
  await expect(builds.getByRole("searchbox", { name: "Buscar campeão ou item" })).toBeVisible()
  await page.goto("/#/builds/jayce?fonte=soloq&posicao=top")
  await expect(builds.locator(".build-card-meta")).toContainText(/Amostra de \d+ jogos?/)
  expect(requested).toEqual([])

  await builds.locator("#build-opponent-trigger").click()
  await builds.getByRole("listbox", { name: "Adversários" }).getByRole("option").nth(1).click()
  await expect(builds.getByText("Não foi possível carregar os confrontos de Jayce.", { exact: false })).toBeVisible()

  await builds.locator("#build-opponent-trigger").click()
  await builds.getByRole("listbox", { name: "Adversários" }).getByRole("option").nth(2).click()
  await expect(builds.locator(".build-card-meta")).toContainText(/Amostra de \d+ jogos?/)
  await expect(builds.getByText("Não foi possível carregar os confrontos", { exact: false })).toHaveCount(0)
  expect(new Set(requested)).toEqual(new Set(["jayce.json"]))
})

test("Trocar de adversário enquanto os confrontos carregam não deixa o card preso", async ({ page }) => {
  await page.route("**/encounters/*.json*", async route => {
    await new Promise(resolve => setTimeout(resolve, 800))
    await route.continue()
  })

  await page.goto("/#/builds?fonte=soloq")
  const builds = page.frameLocator("#v-soloq")
  await expect(builds.getByRole("searchbox", { name: "Buscar campeão ou item" })).toBeVisible()
  await page.goto("/#/builds/jayce?fonte=soloq&posicao=top")
  await expect(builds.locator(".build-card-meta")).toContainText(/Amostra de \d+ jogos?/)

  await builds.locator("#build-opponent-trigger").click()
  await builds.getByRole("listbox", { name: "Adversários" }).getByRole("option").nth(1).click()
  await builds.locator("#build-opponent-trigger").click()
  await builds.getByRole("listbox", { name: "Adversários" }).getByRole("option").nth(2).click()

  await expect(builds.locator(".build-card-meta")).toContainText(/Amostra de \d+ jogos?/, { timeout: 10000 })
  await expect(builds.getByText("Carregando os confrontos", { exact: false })).toHaveCount(0)
})
