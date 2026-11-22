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
  // Ao abrir, a composição do formato anterior já é regravada com `bans` na raiz (ADR 0007).
  const migrated = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lol-comps-time-v1") ?? "null").comps[0] as Record<string, unknown>,
  )
  expect(migrated.lanes).not.toHaveProperty("ban")
  expect(migrated.bans).toEqual([])
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "comp-antiga"], new URLSearchParams("modo=draft")))
  const team = page
  const matchup = team.getByRole("group", { name: "Confronto do draft" })
  await expect(matchup.getByRole("button", { name: /Nossa\s+Composição anterior/ })).toBeVisible()
  await expect(matchup.locator(".matchup-pick.ours .mini .av:not(.av-empty)")).toHaveText(["O", "A"])
  await expect(matchup.locator(".matchup-pick.ours .mini .av-empty")).toHaveCount(3)
  await expect(team.getByRole("button", { name: /Ornn.*Top/i }).first()).toBeVisible()
  await expect(team.getByRole("tab", { name: "Opções por posição" })).toHaveCount(0)
  await expect(team.locator(".dz-slot #champ-picker")).toBeVisible()

  // Sem adversária, o outro lado pede uma; ao criar uma nova adversária ela ocupa esse lado.
  await expect(team.locator(".tm.rival .draft-rival-empty")).toBeVisible()
  await matchup.locator(".matchup-pick.rival").click()
  await page.getByRole("option", { name: /Nova adversária/ }).click()
  await matchup.getByRole("button", { name: /Editar o nome de Adversária/ }).click()
  await matchup.getByRole("textbox").fill("Time rival")
  await matchup.getByRole("textbox").press("Enter")
  await expect(matchup.getByRole("button", { name: /Adversária\s+Time rival/ })).toBeVisible()
  await expect(team.locator(".tm.rival.mine")).toBeVisible()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))
  const rival = state.comps.find((c: { name: string }) => c.name === "Time rival")
  expect(rival.team).toBe("enemy")
  expect(state.matchups).toHaveLength(1)
  expect(state.matchups[0]).toMatchObject({ ours: "comp-antiga", enemy: rival.id, side: "blue" })

  // Trocar lados: a barra e o quadro se invertem e a comp nossa vai para a direita.
  await expect(team.getByText("Editando:")).toBeVisible()
  await expect(team.getByText("Lane do time")).toHaveCount(0)
  await expect(matchup.locator(".matchup-swap svg use")).toHaveAttribute("href", /#swap$/)
  await expect(matchup.getByRole("button", { name: /OP\.GG/ })).toBeVisible()
  await matchup.getByRole("button", { name: /Trocar lados/ }).click()
  await expect(matchup.locator(".matchup-team").last()).toHaveClass(/ours/)
  const swapped = await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))
  expect(swapped.matchups[0].side).toBe("red")

  // Desfazer fixo: aparece depois da troca, desfaz pelo botão e por Ctrl+Z.
  const undo = matchup.getByRole("button", { name: /Desfazer/ })
  await expect(undo).toBeVisible()
  await undo.click()
  await expect(undo).toBeHidden()
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))).matchups[0].side).toBe(
    "blue",
  )
  await matchup.getByRole("button", { name: /Trocar lados/ }).click()
  await page.keyboard.press("Control+z")
  await expect(undo).toBeHidden()
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("lol-comps-time-v1")!))).matchups[0].side).toBe(
    "blue",
  )
  await matchup.getByRole("button", { name: /Trocar lados/ }).click()

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
  await expect(row).toHaveAttribute("title", /^Composição anterior x Time rival/)
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
  await expect(page.locator("#saved")).toHaveText("Salvo neste navegador")
  await page.locator("#local-save summary").click()
  await expect(page.getByRole("button", { name: "Sincronizar agora" })).toBeVisible()
  const restore = page.getByRole("button", { name: "Descartar rascunho…" })
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
  await dialog.getByRole("button", { name: "Descartar", exact: true }).click()
  await expect(name).toHaveValue("Versão do time")
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
