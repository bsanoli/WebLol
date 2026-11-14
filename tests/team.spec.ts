import { expect, test } from "@playwright/test"

test("Abre uma composição salva no formato anterior em modo Draft", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-comps-time-v1")) return
    localStorage.setItem("lol-comps-time-v1", JSON.stringify({
      cur: "comp-antiga",
      comps: [{
        id: "comp-antiga",
        name: "Composição anterior",
        lanes: { top: ["Ornn"], jg: [], mid: [], adc: [], sup: [], ban: [] },
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
  await expect(team.getByRole("button", { name: /Top.*Ornn/i }).first()).toBeVisible()
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
