import { expect, test } from "@playwright/test"

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
  expect(state.matchups).toHaveLength(1)
  expect(state.matchups[0]).toMatchObject({ ours: "nossa", side: "blue" })
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

test("Táticas: o bloco de notas mantém a rolagem ao mudar o quadro", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    if (localStorage.getItem("lol-comps-time-v1")) return
    const lanes = { top: ["Ornn", "Gnar"], jg: [], mid: [], adc: [], sup: [] }
    localStorage.setItem(
      "lol-comps-time-v1",
      JSON.stringify({
        cur: "nossa",
        view: "tactics",
        tacticsBoard: "positions",
        comps: [{ id: "nossa", name: "Nossa base", team: "mine", lanes }],
      }),
    )
  })
  await page.goto("/camp.html")
  await page.evaluate(() => window.applyWebLolRoute(["composicoes", "nossa"], new URLSearchParams("modo=taticas")))
  const editor = page.locator(".tx-notes-body .ProseMirror")
  await editor.click()
  for (let i = 0; i < 50; i++) await editor.press("Enter")
  const body = page.locator(".tx-notes-body")
  await body.evaluate(el => {
    el.scrollTop = 300
  })
  const before = await body.evaluate(el => el.scrollTop)
  expect(before).toBeGreaterThan(0)

  // Tornar uma alternativa principal redesenha o quadro; o bloco de notas continua no mesmo ponto.
  await page.locator('.tx-pos-slot.top [data-priority="Gnar"]').click()
  await expect(page.locator('.tx-pos-slot.top .tx-pos-ic.main[data-n="Gnar"]')).toBeVisible()
  await expect.poll(() => page.locator(".tx-notes-body").evaluate(el => el.scrollTop)).toBe(before)
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
