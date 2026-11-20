import { expect, test } from "@playwright/test"

test("Abre uma composição salva no formato anterior em modo Draft", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-comps-time-v1")) return
    localStorage.setItem(
      "lol-comps-time-v1",
      JSON.stringify({
        cur: "comp-antiga",
        comps: [
          {
            id: "comp-antiga",
            name: "Composição anterior",
            lanes: { top: ["Ornn"], jg: [], mid: ["Ahri"], adc: [], sup: [], ban: [] },
            notes: "Plano salvo",
            laneNotes: {},
          },
        ],
      }),
    )
  })

  await page.goto("/camp.html")
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "comp-antiga"], new URLSearchParams("modo=draft")))
  const team = page
  const matchup = team.getByRole("group", { name: "Confronto do draft" })
  await expect(matchup.getByRole("button", { name: /Nossa\s+Composição anterior/ })).toBeVisible()
  await expect(matchup.locator(".matchup-pick.ours .mini .av")).toHaveText(["O", "A"])
  await expect(team.getByRole("button", { name: /Ornn.*Top/i }).first()).toBeVisible()
  await expect(team.getByRole("tab", { name: "Opções por posição" })).toHaveCount(0)
  await expect(team.locator(".dz-slot #champ-picker")).toBeVisible()

  // Sem adversária, o outro lado pede uma; ao criar uma nova adversária ela ocupa esse lado.
  await expect(team.locator(".tm.rival .draft-rival-empty")).toBeVisible()
  await matchup.locator(".matchup-pick.rival").click()
  await page.getByRole("button", { name: /Nova adversária/ }).click()
  await matchup.getByRole("button", { name: /Editar o nome de Adversária/ }).click()
  await matchup.getByRole("textbox").fill("Time rival")
  await matchup.getByRole("textbox").press("Enter")
  await expect(matchup.getByRole("button", { name: /Adversária\s+Time rival/ })).toBeVisible()
  await expect(team.locator(".tm.rival.mine")).toBeVisible()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))
  const rival = state.comps.find((c: { name: string }) => c.name === "Time rival")
  expect(rival.team).toBe("enemy")
  expect(state.comps.find((c: { id: string }) => c.id === "comp-antiga").draft.rival).toBe(rival.id)
  expect(state.comps.find((c: { id: string }) => c.id === "comp-antiga").matchups).toHaveLength(1)

  // Trocar lados: a barra e o quadro se invertem e a comp nossa vai para a direita.
  await expect(team.getByText("Editando:")).toBeVisible()
  await expect(team.getByText("Lane do time")).toHaveCount(0)
  await expect(matchup.locator(".matchup-swap svg use")).toHaveAttribute("href", /#swap$/)
  await expect(matchup.getByRole("button", { name: /OP\.GG/ })).toBeVisible()
  await matchup.getByRole("button", { name: /Trocar lados/ }).click()
  await expect(matchup.locator(".matchup-team").last()).toHaveClass(/ours/)
  const swapped = await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))
  expect(swapped.comps.find((c: { id: string }) => c.id === "comp-antiga").draft.side).toBe("red")

  for (const viewport of [
    { width: 1920, height: 1024 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(team.locator(".dz .tm > .pk").last()).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
  }

  // Confrontos: a adversária escolhida no draft vira uma linha na aba Confrontos, com tática própria.
  await team.getByRole("tab", { name: "Táticas" }).click()
  await team.getByRole("tab", { name: /Confrontos/ }).click()
  const row = team.locator("[data-tactic-matchup]")
  await expect(row).toHaveCount(1)
  await expect(row).toHaveAttribute("title", "Composição anterior x Time rival")
  await row.click()
  await expect(team.locator("#tx-title")).toContainText("Composição anterior x Time rival")
  await team.getByRole("tab", { name: /Confrontos/ }).click()
  await team.locator("[data-matchup-delete]").click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir confronto" }).click()
  await expect(team.locator("[data-tactic-matchup]")).toHaveCount(0)
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))
  expect(after.comps.map((c: { name: string }) => c.name)).toEqual(
    expect.arrayContaining(["Composição anterior", "Time rival"]),
  )
  expect(after.comps.find((c: { id: string }) => c.id === "comp-antiga").matchups ?? []).toHaveLength(0)
})

test("Duplica e salva uma composição do formato anterior sem alterar a original", async ({ page }) => {
  const original = {
    id: "comp-antiga",
    name: "Composição anterior",
    lanes: { top: ["Ornn"], jg: [], mid: ["Ahri"], adc: [], sup: [], ban: [] },
    laneNotes: { top: "Iniciar a luta" },
    notes: "Plano salvo",
  }
  await page.addInitScript(composition => {
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
  const { ban: _ban, ...copyLanes } = original.lanes
  expect(state.comps).toMatchObject([
    {
      ...original,
      lanes: copyLanes,
      bans: [],
      id: state.cur,
      name: "Composição anterior (cópia)",
      updated: expect.any(Number),
    },
    // A original muda só de formato (bans na raiz), não de conteúdo.
    { ...original, lanes: copyLanes, bans: [] },
  ])
  expect(state.comps[0].lanes).not.toHaveProperty("ban")
  expect(state.comps[1].lanes).not.toHaveProperty("ban")
  expect(state.comps[0].draft).toEqual(state.comps[1].draft)

  await page.reload()
  await expect(name).toHaveValue("Composição anterior (cópia)")
})

test("Restaura a versão sincronizada somente após confirmação", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-base")) return
    const original = {
      id: "comp",
      name: "Versão do time",
      lanes: { top: [], jg: [], mid: [], adc: [], sup: [], ban: [] },
      notes: "",
      laneNotes: {},
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
  const sequence = team.getByRole("tab", { name: "Sequência" })
  await team.getByRole("button", { name: "Mapa tático" }).click()
  await sequence.click()
  await team.getByRole("button", { name: "Novo passo" }).click()
  const step = team.getByRole("textbox", { name: "Nome do passo 1" })
  await step.fill("Entrada pelo rio")

  await page.reload()
  await team.getByRole("button", { name: "Mapa tático" }).click()
  await sequence.click()
  await expect(step).toHaveValue("Entrada pelo rio")
})

test("Alterna entre oito e doze Lumes Feéricos nos dois mapas", async ({ page }) => {
  await page.goto("/camp.html")
  await page.getByRole("button", { name: "Mapa tático" }).click()
  await page.getByRole("tab", { name: "Camadas" }).click()
  const toggle = page.getByRole("switch", { name: "Mostrar Lumes Feéricos" })
  const additional = page.getByRole("switch", { name: "Lumes adicionais" })
  const style = page.getByRole("switch", { name: "Usar mapa realista" })
  const layer = page.getByRole("group", { name: "Localização dos Lumes Feéricos" })
  const markers = layer.getByRole("img")

  await expect(layer).toBeHidden()
  await expect(additional).toBeDisabled()
  await expect(additional).not.toBeChecked()
  await toggle.press("Space")
  await expect(markers).toHaveCount(8)
  await additional.click()
  await expect(markers).toHaveCount(12)
  const island = layer.getByRole("img", { name: "Arbusto ilhado do rio superior" })
  await expect(page.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  const position = await island.boundingBox()
  await style.click()
  await expect(page.locator("#mapimg")).not.toHaveAttribute("data-map-visible", "")
  await expect(markers).toHaveCount(12)
  expect(await island.boundingBox()).not.toEqual(position)

  await page.reload()
  await page.getByRole("button", { name: "Mapa tático" }).click()
  await page.getByRole("tab", { name: "Camadas" }).click()
  await expect(toggle).toBeChecked()
  await expect(additional).toBeChecked()
  await expect(markers).toHaveCount(12)
  await toggle.click()
  await expect(additional).toBeDisabled()
  await expect(layer).toBeHidden()
  await toggle.click()
  await expect(additional).toBeChecked()
  await expect(markers).toHaveCount(12)
  await additional.click()
  await expect(markers).toHaveCount(8)
  await toggle.click()
  await expect(layer).toBeHidden()
})

test("Wards em Lumes exibem a visão do ponto e acompanham os passos da jogada", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/camp.html")
  await page.getByRole("button", { name: "Mapa tático" }).click()
  const add = page.getByRole("radio", { name: "Colocar ward", exact: true })
  const remove = page.getByRole("radio", { name: "Borracha", exact: true })
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
  await expect(page.getByRole("radio", { name: "Mover", exact: true })).toBeChecked()
  await expect(
    wardLayer.getByRole("img", { name: "Sentinela Invisível, 900 unidades de visão, Azul", exact: true }),
  ).toHaveCount(1)
  await expect(wardLayer.locator(".ward-vision-range")).toHaveAttribute("r", "6")
  await expect(bonus).toHaveCount(0)

  await expect(page.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  await add.click()
  await clickSpot(island)
  await add.click()
  await clickSpot(island)
  await expect(add).toBeChecked()
  await expect(bonus).toHaveCount(1)
  await expect(bonus).toHaveAttribute("data-faelight", "upper-island")
  await page.getByRole("tab", { name: "Sequência" }).click()
  await page.getByRole("button", { name: "Novo passo" }).click()

  await page.getByRole("tab", { name: "Camadas" }).click()
  await page.getByRole("switch", { name: "Mostrar Lumes Feéricos" }).click()
  const additional = page.getByRole("switch", { name: "Lumes adicionais" })
  await additional.click()
  await add.click()
  await clickSpot(jungle)
  const showLights = page.getByRole("switch", { name: "Mostrar Lumes Feéricos" })
  await showLights.click()
  await expect(additional).toBeDisabled()
  await expect(bonus).toHaveCount(2)
  await showLights.click()
  await expect(additional).toBeChecked()
  await page.getByRole("tab", { name: "Sequência" }).click()
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
  const extraWard = wardLayer.locator(".ward-marker").last()
  const position = await extraWard.getAttribute("transform")
  await page.getByRole("tab", { name: "Camadas" }).click()
  await additional.click()
  await expect(bonus).toHaveCount(1)
  await expect(extraWard).toHaveAttribute("transform", position!)
  await expect(extraWard).toHaveAttribute("aria-label", /900 unidades/)
  await additional.click()
  await expect(bonus).toHaveCount(2)
  await page.getByRole("switch", { name: "Usar mapa realista" }).click()
  await expect(bonus.first()).toHaveAttribute("transform", "translate(0 0)")
  await page.getByRole("tab", { name: "Sequência" }).click()
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
  await page.getByRole("tab", { name: "Camadas" }).click()
  const style = page.getByRole("switch", { name: "Usar mapa realista" })
  await style.click()
  const add = page.getByRole("radio", { name: "Colocar ward", exact: true })
  const type = page.getByRole("combobox", { name: "Tipo de ward" })
  const chooseType = async (label: string) => {
    if ((await add.getAttribute("aria-checked")) !== "true") await add.click()
    await type.click()
    await page.getByRole("option", { name: label }).click()
  }
  const place = async (x: number, y: number) => {
    if ((await add.getAttribute("aria-checked")) !== "true") await add.click()
    const map = (await page.locator("#map").boundingBox())!
    await page.mouse.click(map.x + map.width * x, map.y + map.height * y)
  }
  const wards = page.getByRole("group", { name: "Wards no mapa" })
  const range = (kind: string) => wards.locator(`.ward-vision-range[data-ward-type="${kind}"]`)
  const bonus = wards.locator(".ward-vision-bonus")
  await chooseType("Sentinela de Controle")
  await place(0.42, 0.38)
  await expect(range("control")).toHaveAttribute("r", String(900 / 148.5))
  await chooseType("Alteração Vidente")
  await place(0.58, 0.58)
  await expect(range("farsight")).toHaveAttribute("r", String(500 / 148.5))
  await expect(bonus).toHaveCount(0)

  await place(0.226, 0.225)
  await expect(range("farsight").last()).toHaveAttribute("r", String(625 / 148.5))
  await expect(bonus).toHaveCount(1)
  const bonusShape = await bonus.getAttribute("d")
  await chooseType("Sentinela de Controle")
  await place(0.226, 0.225)
  await expect(range("control").last()).toHaveAttribute("r", String(1125 / 148.5))
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
  await expect(team.getByRole("region", { name: "Mapa da jogada" })).toBeVisible()
  const clear = team.locator("#map-clear-all")
  await expect(clear).toBeDisabled()

  await team.getByRole("radio", { name: "Desenhar seta" }).click()
  const map = (await team.locator("#map").boundingBox())!
  const x = map.x + map.width * 0.45
  const y = map.y + map.height * 0.36
  const tokens = team.locator("#map .tok")
  const positions = await tokens.evaluateAll(nodes => nodes.map(node => node.getAttribute("style")))
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 64, y + 24, { steps: 5 })
  await page.mouse.up()
  await expect(clear).toBeEnabled()
  const canvas = team.locator("#cv")
  const hasArrow = () =>
    canvas.evaluate((node: HTMLCanvasElement) =>
      node
        .getContext("2d")!
        .getImageData(0, 0, node.width, node.height)
        .data.some((value, i) => i % 4 === 3 && value > 0),
    )
  expect(await hasArrow()).toBe(true)

  await team.getByRole("radio", { name: "Colocar ward" }).click()
  await expect(team.locator("#mapimg")).toHaveAttribute("data-map-visible", "")
  const wardMap = (await team.locator("#map").boundingBox())!
  await page.mouse.click(wardMap.x + wardMap.width * 0.234, wardMap.y + wardMap.height * 0.236)
  const ward = team.locator("#map-wards .ward-marker")
  await team.getByRole("tab", { name: "Camadas" }).click()
  const legend = team.locator("#map-ward-types")
  const vision = team.locator(".ward-vision-bonus")
  await expect(ward).toHaveCount(1)
  await expect(legend).toHaveText("Sentinela Invisível")
  await expect(vision).toHaveCount(1)

  await expect(clear).toBeVisible()
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

test("Táticas: monta picks na gaveta e arrasta uma adversária para criar o confronto", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 })
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-comps-time-v1")) return
    const lanes = () => ({ top: [], jg: [], mid: [], adc: [], sup: [], ban: [] })
    localStorage.setItem(
      "lol-comps-time-v1",
      JSON.stringify({
        cur: "nossa",
        view: "tactics",
        comps: [
          { id: "nossa", name: "Nossa base", team: "mine", lanes: lanes() },
          { id: "rival", name: "Time rival", team: "enemy", lanes: lanes() },
        ],
      }),
    )
  })
  await page.goto("/camp.html")
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "nossa"], new URLSearchParams("modo=taticas")))

  // O alternador do cabeçalho troca entre a tática da comp e as gerais.
  await expect(page.locator(".tx-aside [data-tactic-general]")).toHaveCount(0)
  const scopeX = () => page.locator(".tx-scope").evaluate(el => Math.round(el.getBoundingClientRect().left))
  const xComp = await scopeX()
  await page.getByRole("button", { name: "Gerais" }).click()
  await expect(page.locator("#tx-title")).toHaveText("Táticas gerais")
  expect(await scopeX()).toBe(xComp)
  await expect(page.getByRole("button", { name: "Gerais" })).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Esta composição" }).click()
  await expect(page.locator("#tx-title")).toContainText("Nossa base")

  // Sempre dois lados: a comp aberta ocupa o dela e o outro espera o par.
  const board = page.locator(".tx-draft")
  await expect(board.locator(".tx-side-col")).toHaveCount(2)
  await expect(board.locator(".tx-side-col.empty")).toHaveCount(1)
  await expect(board.locator(".tx-side-col .pk")).toHaveCount(5)

  // Clicar num pick abre o seletor e o campeão escolhido aparece no card.
  await board.locator(".pk-target").first().click()
  const picker = page.getByRole("dialog", { name: "Campeões" })
  await picker.locator("#grid .ch").first().click()
  await expect(board.locator(".pk .pkn").first()).not.toHaveText("Escolher campeão")
  await picker
    .getByRole("button", { name: /Fechar/ })
    .first()
    .click()

  // Arrastar a adversária para o lado vermelho cria o confronto, com a nossa no azul.
  await page.getByRole("tab", { name: /Adversárias/ }).click()
  await page.locator('[data-tactic-comp="rival"]').dragTo(board.locator("[data-drop-side=red]"))
  await expect(page.locator("#tx-title")).toContainText("Nossa base x Time rival")
  await expect(board.locator(".tx-side-col")).toHaveCount(2)
  await expect(board.locator(".tx-side-col.empty")).toHaveCount(0)
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))
  expect(state.comps.find((c: { id: string }) => c.id === "nossa").matchups).toHaveLength(1)
})

test("Táticas: visão Lane só com ícones, com as mesmas ações e lembrada ao recarregar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 })
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-comps-time-v1")) return
    const lanes = () => ({ top: [], jg: [], mid: [], adc: [], sup: [] })
    localStorage.setItem(
      "lol-comps-time-v1",
      JSON.stringify({
        cur: "nossa",
        view: "tactics",
        comps: [
          { id: "nossa", name: "Nossa base", team: "mine", lanes: { ...lanes(), top: ["Ornn", "Gnar"], jg: ["Vi"] } },
          { id: "rival", name: "Time rival", team: "enemy", lanes: { ...lanes(), top: ["Jax", "Fiora", "Camille"] } },
        ],
      }),
    )
  })
  await page.goto("/camp.html")
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "nossa"], new URLSearchParams("modo=taticas")))
  const board = page.locator(".tx-draft")
  await page.getByRole("tab", { name: /Adversárias/ }).click()
  await page.locator('[data-tactic-comp="rival"]').dragTo(board.locator("[data-drop-side=red]"))
  await expect(page.locator("#tx-title")).toContainText("Nossa base x Time rival")

  // O alternador fica acima do quadro; Lane troca os cards com arte por linhas de ícones.
  await board.getByRole("button", { name: "Lane" }).click()
  await expect(board.getByRole("button", { name: "Lane" })).toHaveAttribute("aria-pressed", "true")
  await expect(board.locator(".pk")).toHaveCount(0)
  await expect(board.locator(".tx-pos-slot")).toHaveCount(12)
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))

  // Clicar numa alternativa a torna principal.
  await board.locator('.tx-pos-col.blue .tx-pos-slot.top [data-priority="Gnar"]').click()
  expect((await read()).comps.find((c: { id: string }) => c.id === "nossa").lanes.top).toEqual(["Gnar", "Ornn"])

  // Arrastar entre os lados move o campeão para a outra comp.
  await board
    .locator('.tx-pos-col.blue .tx-pos-slot.jg [data-n="Vi"]')
    .dragTo(board.locator(".tx-pos-col.red .tx-pos-slot.jg"))
  const moved = await read()
  expect(moved.comps.find((c: { id: string }) => c.id === "nossa").lanes.jg).toEqual([])
  expect(moved.comps.find((c: { id: string }) => c.id === "rival").lanes.jg).toEqual(["Vi"])

  // O vermelho, na direita, segue da esquerda para a direita: soltar à esquerda de um ícone coloca antes dele.
  const camille = board.locator('.tx-pos-col.red .tx-pos-slot.top [data-n="Camille"]')
  const box = (await camille.boundingBox())!
  await board
    .locator('.tx-pos-col.red .tx-pos-slot.top [data-n="Jax"]')
    .dragTo(camille, { targetPosition: { x: 3, y: box.height / 2 } })
  // Lado azul à esquerda, vermelho à direita.
  const left = (side: string) => board.locator(`.tx-pos-col.${side}`).evaluate(el => el.getBoundingClientRect().left)
  expect(await left("blue")).toBeLessThan(await left("red"))
  expect((await read()).comps.find((c: { id: string }) => c.id === "rival").lanes.top).toEqual([
    "Fiora",
    "Jax",
    "Camille",
  ])

  // A escolha da visão fica salva.
  await page.reload()
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "nossa"], new URLSearchParams("modo=taticas")))
  await expect(page.locator(".tx-draft").getByRole("button", { name: "Lane" })).toHaveAttribute("aria-pressed", "true")
})

test("Ordem do draft: arrastar campeões entre cards, criar a adversária e remover soltando fora", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "lol-comps-time-v1",
      JSON.stringify({
        cur: "c1",
        comps: [
          {
            id: "c1",
            name: "Nossa",
            lanes: { top: ["Ornn"], jg: [], mid: ["Ahri"], adc: [], sup: [], ban: [] },
            notes: "",
            laneNotes: {},
          },
        ],
      }),
    )
  })
  await page.goto("/camp.html")
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "c1"], new URLSearchParams("modo=draft")))
  const drag = (from: string, to: string | null) =>
    page.evaluate(
      ([f, t]) => {
        const src = document.querySelector(f as string)!,
          dt = new DataTransfer()
        src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }))
        if (t) {
          const dst = document.querySelector(t)!
          dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }))
          dst.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }))
        }
        document.dispatchEvent(
          new DragEvent("dragend", { bubbles: true, clientX: t ? 0 : 400, clientY: t ? 0 : 400, dataTransfer: dt }),
        )
      },
      [from, to],
    )
  const lanes = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("lol-comps-time-v1")!).comps.find((c: { id: string }) => c.id === "c1").lanes,
    )

  // Card vazio do lado adversário é destino: cria a adversária com o campeão naquela rota.
  await expect(page.locator(".tm.rival [data-empty-rival]")).toHaveCount(10)
  await drag('.tm.us .pk[data-l="mid"] .pk-target', '.tm.rival .pk[data-l="sup"]')
  await expect(page.locator(".tm.rival.mine")).toBeVisible()
  const afterCreate = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lol-comps-time-v1")!).comps.find((c: { team?: string }) => c.team === "enemy")
        .lanes,
  )
  expect(afterCreate.sup).toEqual(["Ahri"])
  expect((await lanes()).mid).toEqual([])

  // Card para card, no mesmo lado.
  await drag('.tm.us .pk[data-l="top"] .pk-target', '.tm.us .pk[data-l="jg"]')
  expect(await lanes()).toMatchObject({ top: [], jg: ["Ornn"] })

  // Soltar fora remove, e Desfazer restaura.
  await drag('.tm.us .pk[data-l="jg"] .pk-target', null)
  expect((await lanes()).jg).toEqual([])
  await page.getByRole("button", { name: "Desfazer" }).click()
  expect((await lanes()).jg).toEqual(["Ornn"])
})
