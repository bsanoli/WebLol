import { expect, test } from "@playwright/test"
import { boxOf, required } from "./support/box"
import { size, visionButton, mapPoint, drag, waitForRealisticMap } from "./support/tactical-map"

test("Paredes e arbustos recortam a visão do campeão conforme sua posição", async ({ page }) => {
  await page.setViewportSize(size)
  await page.goto("/camp.html")
  await page.getByRole("button", { name: "Mapa tático" }).click()
  await waitForRealisticMap(page)
  await visionButton(page, "azul").click()
  const champion = page.getByRole("button", { name: "Azul TOP" })
  const coverage = page.locator("#tactical-fog [data-champion-sight]").first()
  const brush = page.locator("#map-vision-mask [data-active-brush][data-side=b]")
  const contains = (x: number, y: number) =>
    coverage.evaluate((path: SVGPathElement, point) => path.isPointInFill(new DOMPoint(point.x, point.y)), { x, y })

  async function moveChampion(x: number, y: number) {
    const bounds = await boxOf(champion)
    await drag(
      page,
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      await mapPoint(page, x / 100, y / 100),
    )
    await expect(coverage).toHaveAttribute("data-origin-x", String(x))
    await expect(coverage).toHaveAttribute("data-origin-y", String(y))
  }

  await moveChampion(67, 68)
  expect(await contains(69, 68)).toBe(true)
  expect(await contains(60, 68)).toBe(false)
  await moveChampion(45, 46)
  expect(await contains(42.6, 43.9)).toBe(false)
  await expect(brush).toHaveCount(0)
  await moveChampion(42.6, 43.9)
  expect(await contains(42.6, 43.9)).toBe(true)
  expect(await contains(46, 44)).toBe(true)
  await expect(brush).toHaveCount(1)
  const riverBrush = await brush.getAttribute("data-active-brush")
  await moveChampion(23.3, 23.9)
  await expect(brush).toHaveCount(1)
  await expect(brush).not.toHaveAttribute("data-active-brush", required(riverBrush, "pincel do rio"))
  await visionButton(page, "vermelha").click()
  await expect(brush).toHaveCount(0)
  await visionButton(page, "geral").click()
  await expect(brush).toHaveCount(1)
  await visionButton(page, "azul").click()
  await expect(brush).toHaveCount(1)

  await page.getByRole("tab", { name: "Camadas" }).click()
  await page.getByRole("switch", { name: "Usar mapa realista" }).click()
  await moveChampion(67, 68)
  await expect(brush).toHaveCount(0)
  expect(await contains(69, 68)).toBe(true)
  expect(await contains(60, 68)).toBe(false)
})

test("Move campeões nas duas visões e reseta a visão e o quadro em edição", async ({ page }) => {
  await page.setViewportSize(size)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/camp.html")
  await page.getByRole("button", { name: "Mapa tático" }).click()
  await waitForRealisticMap(page)
  const reset = page.getByRole("button", { name: "Resetar mapa" })
  const tokens = page.locator("#map .tok")
  await expect(tokens).toHaveCount(10)
  const positions = () => tokens.evaluateAll(nodes => nodes.map(node => node.getAttribute("style")))
  const initial = await positions()
  await expect(reset).toBeDisabled()
  const general = visionButton(page, "geral")
  const preview = page.getByText("Prévia tática aproximada da visão da equipe.")
  const fog = page.locator("#tactical-fog")
  for (const side of ["azul", "vermelha"] as const) {
    const button = visionButton(page, side)
    await button.click()
    await expect(button).toHaveAttribute("aria-pressed", "true")
    await expect(preview).toBeVisible()
    await expect(fog).toHaveCount(1)
    await expect(reset).toBeEnabled()
    await button.click()
    await expect(general).toHaveAttribute("aria-pressed", "true")
    await expect(preview).toBeHidden()
    await expect(fog).toHaveCount(0)
    await expect(reset).toBeDisabled()
  }
  await visionButton(page, "azul").click()
  await reset.click()
  await expect(general).toHaveAttribute("aria-pressed", "true")
  await expect(preview).toBeHidden()
  await expect(fog).toHaveCount(0)
  await expect(reset).toBeDisabled()
  await expect(page.getByRole("button", { name: "Desfazer", exact: true })).toBeDisabled()
  expect(await positions()).toEqual(initial)
  await page.getByRole("tab", { name: "Camadas" }).click()
  await page.getByRole("switch", { name: "Alcance das torres" }).click()
  const tower = page.getByRole("button", { name: "Torre externa do topo — Azul" })
  await tower.click()
  for (const name of ["Colocar ward", "Colocar wave azul", "Desenhar seta"]) {
    await page.getByRole("radio", { name, exact: true }).click()
    const start = await mapPoint(page, 0.4, 0.34)
    if (name === "Desenhar seta") await drag(page, start, await mapPoint(page, 0.56, 0.4))
    else await page.mouse.click(start.x, start.y)
  }
  await page.getByRole("tab", { name: "Sequência" }).click()
  await page.getByRole("button", { name: "Novo passo" }).click()
  await page.getByRole("button", { name: "Novo passo" }).click()
  await page.getByRole("button", { name: "Modo edição" }).click()
  await visionButton(page, "azul").click()
  await expect(page.getByRole("radio", { name: "Traço livre" })).toBeEnabled()
  await page.getByRole("radio", { name: "Mover", exact: true }).click()
  const blue = page.getByRole("button", { name: "Azul TOP" })
  const red = page.getByRole("button", { name: "Vermelho TOP" })
  const coverage = page.locator("#tactical-fog [data-champion-sight]").first()
  const blueBox = await boxOf(blue)
  await page.mouse.move(blueBox.x + blueBox.width / 2, blueBox.y + blueBox.height / 2)
  await page.mouse.down()
  const target = await mapPoint(page, 0.22, 0.38)
  await page.mouse.move(target.x, target.y, { steps: 6 })
  await expect(coverage).toHaveAttribute("data-origin-x", "22")
  await page.mouse.up()
  await red.press("ArrowDown")
  expect(await positions()).not.toEqual(initial)
  await visionButton(page, "vermelha").click()
  await red.press("ArrowDown")
  await expect(coverage).toHaveAttribute("data-origin-y", "10")
  await blue.press("ArrowRight")
  const edited = await positions()
  await page.getByRole("button", { name: "Aumentar zoom" }).click()
  const cameraCenter = () =>
    page.locator("#map-viewport").evaluate(viewport => {
      const view = viewport.getBoundingClientRect()
      const map = viewport.querySelector("#map")
      if (!map) throw new Error("Mapa não encontrado")
      const board = map.getBoundingClientRect()
      return [
        (view.left + view.width / 2 - board.left) / board.width,
        (view.top + view.height / 2 - board.top) / board.height,
      ]
    })
  const camera = await cameraCenter()
  await reset.click()
  await expect(reset).toBeDisabled()
  expect(await positions()).toEqual(initial)
  await expect(tower).toHaveAttribute("aria-pressed", "false")
  await expect(page.locator(".map-wave, #map-wards .ward-marker")).toHaveCount(0)
  await expect(general).toHaveAttribute("aria-pressed", "true")
  await expect(preview).toBeHidden()
  await expect(fog).toHaveCount(0)
  await expect(page.locator("#map-zoom-value")).toHaveText("125%")
  await expect
    .poll(async () => {
      const center = await cameraCenter()
      return Math.max(...center.map((axis, index) => Math.abs(axis - camera[index])))
    })
    .toBeLessThan(0.003)
  await page.getByRole("button", { name: "Desfazer", exact: true }).click()
  await expect(general).toHaveAttribute("aria-pressed", "true")
  expect(await positions()).toEqual(edited)
  await expect(tower).toHaveAttribute("aria-pressed", "true")
  await expect(page.locator(".map-wave, #map-wards .ward-marker")).toHaveCount(2)
  await reset.click()
  await page.getByRole("button", { name: "Selecionar passo 1" }).click()
  await expect(tower).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Selecionar passo 2" }).click()
  await expect(tower).toHaveAttribute("aria-pressed", "false")
  await page.getByRole("button", { name: "Reproduzir" }).click()
  await expect(reset).toBeDisabled()
  await expect(blue).toHaveAttribute("tabindex", "-1")
  await page.getByRole("button", { name: "Parar" }).click()
})

test("Fecha Área do time ao clicar fora no mapa incorporado ou no cabeçalho", async ({ page }) => {
  await page.setViewportSize(size)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/#/time/mapa")
  await page.getByRole("button", { name: "Entrar sem usuário" }).click()
  const menu = page.getByRole("button", { name: "Área do time", exact: true })
  const map = page.frameLocator("#v-camp").getByRole("region", { name: "Mapa da jogada" })
  const item = page.getByRole("menuitem", { name: "Mapa tático", exact: true })

  await map.click()
  await menu.hover()
  await expect(item).toBeVisible()
  // Isolate the iframe event from the trigger's independent pointer-leave timer.
  await map.dispatchEvent("pointerdown", { pointerType: "mouse", button: 0, bubbles: true })
  await expect(menu).toHaveAttribute("aria-expanded", "false")

  await map.click()
  await menu.hover()
  await expect(item).toBeVisible()
  await map.click()
  await expect(menu).toHaveAttribute("aria-expanded", "false")

  await menu.press("Enter")
  await expect(item).toBeVisible()
  await page.mouse.click(10, 24)
  await expect(menu).toHaveAttribute("aria-expanded", "false")
})

test("Navega pelo menu superior e coloca waves nas três rotas com o mapa inteiro visível", async ({ page }) => {
  await page.setViewportSize(size)
  await page.goto("/#/worlds")
  const nav = page.getByRole("button", { name: "Área do time", exact: true })
  const mapLink = page.getByRole("menuitem", { name: "Mapa tático", exact: true })
  await nav.hover()
  await expect(mapLink).toBeVisible()
  await expect(page).toHaveURL(/#\/worlds/)
  await expect(page.getByRole("menuitem", { name: "Gestão do time" })).toHaveCount(0)
  await mapLink.click()
  await page.getByRole("button", { name: "Entrar sem usuário" }).click()
  const team = page.frameLocator("#v-camp")
  await waitForRealisticMap(team)
  const viewport = team.getByRole("region", { name: "Mapa da jogada" })
  await expect(viewport).toBeVisible()
  await expect(team.getByText("Arquivos", { exact: true })).toBeVisible()
  await expect(team.getByRole("navigation", { name: "Ferramentas do time" })).toHaveCount(0)
  await expect(team.getByRole("heading", { name: "Mapa tático" })).toHaveCount(0)

  const placeWave = team.getByRole("radio", { name: "Colocar wave azul", exact: true })
  for (const [lane, x, y] of [
    ["Topo", 0.42, 0.09],
    ["Inferior", 0.54, 0.91],
  ] as const) {
    await placeWave.click()
    const target = await mapPoint(team, x, y)
    await page.mouse.move(target.x, target.y)
    await expect(team.locator("#map-wave-detected")).toHaveText(`Rota detectada: ${lane}`)
    await page.mouse.click(target.x, target.y)
  }
  await placeWave.click()
  await viewport.focus()
  await viewport.press("ArrowRight")
  await expect(team.locator("#map-wave-cursor")).toBeVisible()
  await expect(team.locator("#map-wave-detected")).toHaveText("Rota detectada: Meio")
  await viewport.press("Enter")
  const waves = team.locator("#map-waves .map-wave")
  await expect(waves).toHaveCount(3)
  await team.getByRole("tab", { name: "Sequência" }).click()
  await team.getByRole("button", { name: "Novo passo" }).click()
  await expect(team.getByRole("button", { name: "Selecionar passo 1" })).toBeVisible()

  await page.setViewportSize({ width: 800, height: 620 })
  const panel = team.getByRole("button", { name: "Painel", exact: true })
  const beforePanel = await boxOf(viewport)
  expect(beforePanel.y + beforePanel.height).toBeLessThanOrEqual(620)
  await panel.click()
  await expect(team.getByRole("tablist", { name: "Painel do mapa" }).getByRole("tab")).toHaveText([
    "Camadas",
    "Composições",
    "Sequência",
    "Jogada",
  ])
  await team.getByRole("tab", { name: "Sequência" }).press("Home")
  const layers = team.getByRole("tab", { name: "Camadas" })
  await expect(layers).toBeFocused()
  await layers.press("Enter")
  await expect(layers).toHaveAttribute("aria-selected", "true")
  await expect(team.getByRole("switch", { name: "Lumes adicionais" })).toBeVisible()
  expect(await viewport.boundingBox()).toEqual(beforePanel)
  const sidebar = await boxOf(team.getByRole("complementary", { name: "Painel do mapa" }))
  const camera = await boxOf(team.getByRole("group", { name: "Câmera do mapa" }))
  expect(camera.x + camera.width).toBeLessThan(sidebar.x)
  await team.getByRole("button", { name: "Aumentar zoom" }).click()
  await expect(team.locator("#map-zoom-value")).toHaveText("125%")
  await team.getByRole("button", { name: "Ajustar", exact: true }).click()
  expect(await team.locator("html").evaluate(node => node.scrollHeight)).toBe(
    await team.locator("html").evaluate(node => node.clientHeight),
  )

  await page.setViewportSize(size)
  await nav.press("ArrowDown")
  await expect(
    page.getByRole("menuitem", { name: "Composições", exact: true }).filter({ visible: true }).last(),
  ).toBeFocused()
  const knowledge = page.getByRole("menuitem", { name: "Conhecimento", exact: true })
  await knowledge.click()
  await expect(team.getByRole("heading", { name: "Conhecimento", exact: true })).toBeVisible()
  await expect(team.locator("#team-files-know #team-files")).toBeVisible()
  await page.goBack()
  await expect(viewport).toBeVisible()
  await expect(waves).toHaveCount(3)
  await page.goForward()
  await expect(team.getByRole("heading", { name: "Conhecimento", exact: true })).toBeVisible()
})

test("Arquivos, paginação e zoom usam o espaço do mapa sem rolagem", async ({ page }) => {
  await page.setViewportSize(size)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/#/time/mapa")
  await page.getByRole("button", { name: "Entrar sem usuário" }).click()
  const team = page.frameLocator("#v-camp")
  await waitForRealisticMap(team)
  await expect(team.getByRole("tab", { name: "Camadas" })).toHaveAttribute("aria-selected", "true")
  await expect(team.locator("body > header")).toBeHidden()
  await team.locator("#team-files summary").click()
  const download = page.waitForEvent("download")
  await team.getByRole("button", { name: "Exportar", exact: true }).click()
  expect((await download).suggestedFilename()).toMatch(/^comps-time-.*\.json$/)
  const chooser = page.waitForEvent("filechooser")
  await team.getByRole("button", { name: "Importar", exact: true }).click()
  const pos = await team.locator("#map .tok").evaluateAll(tokens =>
    Object.fromEntries(
      tokens.map(token => {
        const element = token as HTMLElement
        return [element.dataset.t, [parseFloat(element.style.left), parseFloat(element.style.top)]]
      }),
    ),
  )
  const frame = { pos, lines: [] }
  await (await chooser).setFiles({
    name: "estrategia.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        comps: [
          {
            name: "Composição importada com nome longo para testar o espaço do painel",
            lanes: { top: ["Garen"], jg: ["Vi"], mid: ["Ahri"], adc: ["Jinx"], sup: ["Leona"] },
          },
          { name: "Formação vermelha", lanes: { top: ["Darius"] } },
          { name: "Composição vazia" },
        ],
        plays: [
          {
            id: "paginated",
            name: "Jogada longa",
            live: frame,
            steps: Array.from({ length: 30 }, (_, i) => ({ label: `Estratégia ${i + 1}`, ...frame })),
          },
        ],
      }),
    ),
  })
  await team.getByRole("button", { name: "Substituir", exact: true }).click()
  await team.getByRole("tab", { name: "Sequência" }).click()
  const nextPage = team.getByRole("button", { name: "Próxima página de passos" })
  await expect(nextPage).toBeVisible()
  await nextPage.click()
  await expect(team.getByRole("button", { name: "Selecionar passo 1", exact: true })).toBeHidden()
  await expect(team.locator("#map-steps-page")).toHaveText(/^2 \/ /)
  const visibleSteps = team.locator("#steps [data-step-select]:visible")
  await visibleSteps.first().click()
  await expect(visibleSteps.first()).toHaveAttribute("aria-current", "step")

  await team.getByRole("tab", { name: "Composições", exact: true }).click()
  const blueList = team.getByRole("group", { name: "Composições para o lado Azul", exact: true })
  const blueComp = blueList.getByRole("button", { name: /Composição importada com nome longo/ })
  await expect(blueComp.locator(".mini img")).toHaveCount(5)
  await expect(blueList.getByRole("button", { name: /Composição vazia/ })).toContainText("Sem campeões")
  await blueComp.press("Enter")
  await expect(blueComp).toHaveAttribute("aria-pressed", "true")
  await expect(team.getByRole("button", { name: "Azul TOP - Garen", exact: true })).toBeVisible()
  await team.getByRole("button", { name: "Vermelho", exact: true }).click()
  const redList = team.getByRole("group", { name: "Composições para o lado Vermelho", exact: true })
  await expect(redList.getByRole("button", { name: "Só o ícone da rota", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await redList.getByRole("button", { name: "Formação vermelha", exact: true }).click()
  await expect(team.getByRole("button", { name: "Vermelho TOP - Darius", exact: true })).toBeVisible()
  await team.getByRole("button", { name: "Azul", exact: true }).click()
  await expect(blueComp).toHaveAttribute("aria-pressed", "true")

  const board = team.locator("#map"),
    viewport = team.locator("#map-viewport")
  const before = await boxOf(board),
    available = await boxOf(viewport)
  expect(available.width).toBeGreaterThan(before.width)
  await team.getByRole("button", { name: "Aumentar zoom" }).click()
  const after = await boxOf(board)
  expect(after.width).toBeGreaterThan(before.width)
  expect(after.x).toBeLessThan(before.x)
  expect(await viewport.boundingBox()).toEqual(available)
  await team.getByRole("button", { name: "Ajustar" }).click()
  expect(await board.boundingBox()).toEqual(before)
})
