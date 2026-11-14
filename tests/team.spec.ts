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
