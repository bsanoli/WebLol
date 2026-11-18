import { expect, test } from "@playwright/test"

test("Abre uma composição salva no formato anterior em modo Draft", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-comps-time-v1")) return
    localStorage.setItem("lol-comps-time-v1", JSON.stringify({
      cur: "comp-antiga",
      comps: [{
        id: "comp-antiga",
        name: "Composição anterior",
        lanes: { top: ["Ornn"], jg: [], mid: ["Ahri"], adc: [], sup: [], ban: [] },
        notes: "Plano salvo",
        laneNotes: {},
      }],
    }))
  })

  await page.goto("/camp.html")
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "comp-antiga"], new URLSearchParams("modo=draft")))
  const team = page
  const draft = team.getByRole("group", { name: "Composições do time" })
  await expect(draft.getByRole("button", { name: /Composição anterior/ })).toBeVisible()
  await expect(draft.locator(".dz-tab.on .mini .av")).toHaveText(["O", "A"])
  await expect(team.getByRole("button", { name: /Top.*Ornn/i }).first()).toBeVisible()

  const toolbar = team.locator(".composition-toolbar")
  await expect(toolbar).toBeVisible()
  const draftPosition = await toolbar.boundingBox()
  await toolbar.getByRole("tab", { name: "Opções por posição" }).click()
  await expect(team.locator(".comp-library")).toBeVisible()
  await expect(team.locator(".comp-library .ci.on .mini .av")).toHaveText(["O", "A"])
  await expect(team.locator("#comps > #champ-picker")).toBeVisible()
  expect(await toolbar.boundingBox()).toEqual(draftPosition)
  await toolbar.getByRole("tab", { name: "Ordem do draft" }).click()
  await expect(team.locator(".dz-slot #champ-picker")).toBeVisible()
  expect(await toolbar.boundingBox()).toEqual(draftPosition)
  for (const viewport of [{ width: 1920, height: 1024 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport)
    await expect(team.locator(".dz .tm > .pk").last()).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
  }
})

test("Duplica e salva uma composição do formato anterior sem alterar a original", async ({ page }) => {
  const original = {
    id: "comp-antiga",
    name: "Composição anterior",
    lanes: { top: ["Ornn"], jg: [], mid: ["Ahri"], adc: [], sup: [], ban: [] },
    laneNotes: { top: "Iniciar a luta" },
    notes: "Plano salvo",
  }
  await page.addInitScript((composition) => {
    const key = "lol-comps-time-v1"
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({ comps: [composition], cur: composition.id }))
    }
  }, original)
  await page.goto("/camp.html")

  await page.getByRole("button", { name: "Ações de Composição anterior" }).click()
  await page.getByRole("menuitem", { name: "Duplicar" }).click()
  const name = page.getByRole("textbox", { name: "Nome da composição" })
  await expect(name).toHaveValue("Composição anterior (cópia)")

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))
  expect(state.cur).not.toBe(original.id)
  expect(state.comps).toHaveLength(2)
  expect(state.comps).toMatchObject([
    { ...original, id: state.cur, name: "Composição anterior (cópia)", updated: expect.any(Number) },
    original,
  ])
  expect(state.comps[0].draft).toEqual(state.comps[1].draft)

  await page.reload()
  await expect(name).toHaveValue("Composição anterior (cópia)")
})

test("Restaura a versão sincronizada somente após confirmação", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-base")) return
    const original = {
      id: "comp", name: "Versão do time",
      lanes: { top: [], jg: [], mid: [], adc: [], sup: [], ban: [] },
      notes: "", laneNotes: {},
    }
    localStorage.setItem("lol-base", JSON.stringify({ version: 7, data: { comps: [original], plays: [] } }))
    localStorage.setItem("lol-comps-time-v1", JSON.stringify({ comps: [original], cur: "comp" }))
  })
  await page.goto("/camp.html")
  const name = page.getByRole("textbox", { name: "Nome da composição" })
  await name.fill("Edição local")
  await page.locator("#local-save summary").click()
  const restore = page.getByRole("button", { name: "Restaurar dados locais…" })
  await restore.click()
  const dialog = page.getByRole("alertdialog")
  await expect(dialog).toContainText("v7")
  await dialog.getByRole("button", { name: "Cancelar" }).click()
  await expect(name).toHaveValue("Edição local")
  await restore.click()
  const download = page.waitForEvent("download")
  await dialog.getByRole("button", { name: "Baixar cópia" }).click()
  expect((await download).suggestedFilename()).toMatch(/^comps-time-/)
  await expect(name).toHaveValue("Edição local")
  await restore.click()
  await dialog.getByRole("button", { name: "Restaurar", exact: true }).click()
  await expect(name).toHaveValue("Versão do time")
})

test("Um passo do mapa tático continua salvo após recarregar", async ({ page }) => {
  await page.goto("/camp.html")
  const team = page
  await team.getByRole("button", { name: "Mapa tático" }).click()
  await team.getByRole("button", { name: "Novo passo" }).click()
  const step = team.getByRole("textbox", { name: "Nome do passo 1" })
  await step.fill("Entrada pelo rio")

  await page.reload()
  await team.getByRole("button", { name: "Mapa tático" }).click()
  await expect(step).toHaveValue("Entrada pelo rio")
})

test("Mostra os Lumes Feéricos conforme o Rift Elemental nos dois mapas", async ({ page }) => {
  await page.goto("/camp.html")
  await page.getByRole("button", { name: "Mapa tático" }).click()
  const toggle = page.getByRole("switch", { name: "Mostrar Lumes Feéricos" })
  const style = page.getByRole("switch", { name: "Usar mapa realista" })
  const terrain = page.getByRole("combobox", { name: "Rift Elemental" })
  const layer = page.getByRole("group", { name: "Localização dos Lumes Feéricos" })
  const markers = layer.getByRole("img")

  await expect(layer).toBeHidden()
  await expect(terrain).toBeHidden()
  await toggle.press("Space")
  await expect(markers).toHaveCount(8)
  await terrain.click()
  await page.getByRole("option", { name: "Hextec" }).click()
  await expect(markers).toHaveCount(12)

  const island = layer.getByRole("img", { name: "Arbusto ilhado do rio superior" })
  await expect(page.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  const realisticPosition = await island.boundingBox()
  await style.click()
  await expect(page.locator("#mapimg")).not.toHaveAttribute("data-map-visible", "")
  await expect(markers).toHaveCount(12)
  expect(await island.boundingBox()).not.toEqual(realisticPosition)

  await page.reload()
  await page.getByRole("button", { name: "Mapa tático" }).click()
  await expect(toggle).toBeChecked()
  await expect(terrain).toHaveText("Hextec")
  await expect(markers).toHaveCount(12)
  await terrain.click()
  await page.getByRole("option", { name: "Antes da transformação" }).click()
  await expect(markers).toHaveCount(8)
  await toggle.click()
  await expect(layer).toBeHidden()
  await expect(terrain).toBeHidden()
})

test("Wards em Lumes exibem a visão do ponto e acompanham os passos da jogada", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/camp.html")
  await page.getByRole("button", { name: "Mapa tático" }).click()
  const add = page.getByRole("radio", { name: "Colocar ward", exact: true })
  const remove = page.getByRole("radio", { name: "Remover ward", exact: true })
  const wardLayer = page.getByRole("group", { name: "Wards no mapa" })
  const bonus = wardLayer.locator(".ward-vision-bonus")
  const light = page.locator("#map-faelights")
  const island = light.getByRole("img", { name: "Arbusto ilhado do rio superior" })
  const jungle = light.getByRole("img", { name: "Selva azul perto do top" })
  const clickSpot = async (spot: typeof island) => {
    const box = await spot.boundingBox()
    expect(box).not.toBeNull()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  }

  await add.press("Space")
  const cursor = page.getByRole("button", { name: "Colocar ward no mapa" })
  await expect(cursor).toBeFocused()
  await cursor.press("ArrowRight")
  await cursor.press("Enter")
  await expect(wardLayer.getByRole("img", { name: "Sentinela Invisível, 900 unidades de visão", exact: true })).toHaveCount(1)
  await expect(wardLayer.locator(".ward-vision-range")).toHaveAttribute("r", "6")
  await expect(bonus).toHaveCount(0)

  await expect(page.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  await clickSpot(island)
  await clickSpot(island)
  await expect(bonus).toHaveCount(1)
  await expect(bonus).toHaveAttribute("data-faelight", "upper-island")
  await page.getByRole("button", { name: "Novo passo" }).click()

  await page.getByRole("switch", { name: "Mostrar Lumes Feéricos" }).click()
  await page.getByRole("combobox", { name: "Rift Elemental" }).click()
  await page.getByRole("option", { name: "Oceano" }).click()
  await clickSpot(jungle)
  await expect(bonus).toHaveCount(2)
  expect(new Set(await bonus.evaluateAll(paths => paths.map(path => path.getAttribute("d")))).size).toBe(2)
  await remove.click()
  await clickSpot(jungle)
  await expect(bonus).toHaveCount(1)
  await page.getByRole("button", { name: "Desfazer", exact: true }).click()
  await expect(bonus).toHaveCount(2)
  await page.getByRole("button", { name: "Refazer", exact: true }).click()
  await expect(bonus).toHaveCount(1)
  await page.getByRole("button", { name: "Desfazer", exact: true }).click()
  await page.getByRole("button", { name: "Novo passo" }).click()

  await page.reload()
  await page.getByRole("button", { name: "Mapa tático" }).click()
  await expect(bonus).toHaveCount(2)
  await page.getByRole("switch", { name: "Usar mapa realista" }).click()
  await expect(bonus.first()).toHaveAttribute("transform", "translate(0 0)")
  const firstStep = page.getByRole("button", { name: "Selecionar passo 1" })
  await firstStep.press("Space")
  await expect(firstStep).toHaveAttribute("aria-current", "step")
  await expect(firstStep).toBeFocused()
  await expect(bonus).toHaveCount(1)
  await page.getByRole("button", { name: "Reproduzir", exact: true }).click()
  await expect(bonus).toHaveCount(2)
})

test("O tipo da ward define seu alcance dentro e fora dos Lumes", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/camp.html")
  await page.getByRole("button", { name: "Mapa tático" }).click()
  const style = page.getByRole("switch", { name: "Usar mapa realista" })
  await style.click()
  await page.getByRole("radio", { name: "Colocar ward" }).click()
  const type = page.getByRole("combobox", { name: "Tipo de ward" })
  const chooseType = async (label: string) => {
    await type.click()
    await page.getByRole("option", { name: label }).click()
  }
  const map = (await page.locator("#map").boundingBox())!
  const place = (x: number, y: number) => page.mouse.click(map.x + map.width * x, map.y + map.height * y)
  const wards = page.getByRole("group", { name: "Wards no mapa" })
  const range = (kind: string) => wards.locator(`.ward-vision-range[data-ward-type="${kind}"]`)
  const bonus = wards.locator(".ward-vision-bonus")
  await chooseType("Sentinela de Controle")
  await place(.42, .38)
  await expect(range("control")).toHaveAttribute("r", "6")
  await chooseType("Alteração Vidente")
  await place(.58, .58)
  await expect(range("farsight")).toHaveAttribute("r", String(500 / 150))
  await expect(bonus).toHaveCount(0)

  await place(.226, .225)
  await expect(range("farsight").last()).toHaveAttribute("r", String(625 / 150))
  await expect(bonus).toHaveCount(1)
  const bonusShape = await bonus.getAttribute("d")
  await chooseType("Sentinela de Controle")
  await place(.226, .225)
  await expect(range("control").last()).toHaveAttribute("r", "7.5")
  await expect(range("farsight")).toHaveCount(1)
  await expect(bonus).toHaveAttribute("d", bonusShape!)

  await page.reload()
  await page.getByRole("button", { name: "Mapa tático" }).click()
  await expect(wards.getByRole("img", { name: "Alteração Vidente, 500 unidades de visão" })).toHaveCount(1)
  await expect(range("control")).toHaveCount(2)

  const clear = page.getByRole("button", { name: "Limpar wards" })
  await clear.press("Space")
  await expect(wards.getByRole("img")).toHaveCount(0)
  await expect(wards.locator(".ward-vision-range, .ward-vision-bonus")).toHaveCount(0)
  await expect(clear).toBeDisabled()
  await page.getByRole("button", { name: "Desfazer", exact: true }).click()
  await expect(wards.getByRole("img")).toHaveCount(3)
  await expect(bonus).toHaveCount(1)
})

test("Limpar tudo apaga as anotações em uma única ação reversível", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/#/time/mapa")
  await page.getByRole("button", { name: "Entrar sem usuário" }).click()
  const team = page.frameLocator("#v-camp")
  await team.getByRole("button", { name: "Mapa tático" }).click()
  const clear = team.getByRole("button", { name: "Limpar tudo", exact: true })
  await expect(clear).toBeDisabled()

  const map = (await team.locator("#map").boundingBox())!
  const x = map.x + map.width * .45
  const y = map.y + map.height * .36
  const tokens = team.locator("#map .tok")
  const positions = await tokens.evaluateAll(nodes => nodes.map(node => node.getAttribute("style")))
  await team.getByRole("radio", { name: "Desenhar seta" }).click()
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 64, y + 24, { steps: 5 })
  await page.mouse.up()
  await expect(clear).toBeEnabled()
  const canvas = team.locator("#cv")
  const hasArrow = () => canvas.evaluate((node: HTMLCanvasElement) =>
    node.getContext("2d")!.getImageData(0, 0, node.width, node.height).data.some((value, i) => i % 4 === 3 && value > 0))
  expect(await hasArrow()).toBe(true)

  await team.getByRole("radio", { name: "Colocar ward" }).click()
  await expect(team.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  await page.mouse.click(map.x + map.width * .234, map.y + map.height * .236)
  const ward = team.locator("#map-wards .ward-marker")
  const legend = team.getByRole("list", { name: "Tipos de ward no mapa" })
  const vision = team.locator(".ward-vision-bonus")
  await expect(ward).toHaveCount(1)
  await expect(legend).toHaveText("Sentinela Invisível")
  await expect(vision).toHaveCount(1)

  await clear.press("Space")
  await expect(clear).toBeDisabled()
  await expect(ward).toHaveCount(0)
  await expect(legend).toBeHidden()
  await expect(vision).toHaveCount(0)
  expect(await hasArrow()).toBe(false)
  expect(await tokens.evaluateAll(nodes => nodes.map(node => node.getAttribute("style")))).toEqual(positions)

  await team.getByRole("button", { name: "Desfazer", exact: true }).click()
  await expect(ward).toHaveCount(1)
  await expect(legend).toHaveText("Sentinela Invisível")
  await expect(vision).toHaveCount(1)
  expect(await hasArrow()).toBe(true)
  await expect(clear).toBeEnabled()
})
