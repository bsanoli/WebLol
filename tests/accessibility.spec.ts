import AxeBuilder from "@axe-core/playwright"
import { expect, type FrameLocator, type Locator, test } from "@playwright/test"

// Critérios da WCAG 2.2 nível AA que o axe verifica sozinho (docs/decisoes/0004-ferramentas-de-qualidade.md).
// O axe não substitui a revisão manual: foco visível, ordem do teclado e textos alternativos úteis
// continuam no checklist (docs/revisao.md).
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

/**
 * Violações anteriores à Onda 1, por tela: a regra do axe e o máximo de elementos aceitos.
 * Uma regra nova, uma tela nova ou mais elementos fazem o teste falhar. Ao corrigir, baixe o número ou tire a linha
 * (docs/auditoria-codebase.md, "Violações do axe").
 */
type KnownViolations = Record<string, number>

type Screen = {
  name: string
  route: string
  frame: string
  ready: (frame: FrameLocator) => Locator
  open?: (frame: FrameLocator) => Promise<void>
  known?: KnownViolations
}

const screens: Screen[] = [
  {
    name: "Worlds · Visão geral",
    route: "/#/worlds",
    frame: "#v-worlds",
    ready: frame => frame.getByRole("heading", { name: "Worlds 2026", level: 1 }),
  },
  {
    name: "Worlds · Composições",
    route: "/#/worlds/composicoes",
    frame: "#v-worlds",
    ready: frame => frame.getByRole("heading", { name: "Composições do Worlds" }),
  },
  {
    name: "Builds · Lista",
    route: "/#/builds?fonte=worlds",
    frame: "#v-worlds",
    ready: frame => frame.getByRole("searchbox", { name: "Buscar campeão ou item" }),
  },
  {
    name: "Builds · Campeão",
    route: "/#/builds/ahri?fonte=worlds",
    frame: "#v-worlds",
    ready: frame => frame.getByRole("region", { name: "Compras jogo a jogo" }),
  },
  {
    name: "SoloQ · Lista",
    route: "/#/builds?fonte=soloq",
    frame: "#v-soloq",
    ready: frame => frame.getByRole("searchbox", { name: "Buscar campeão ou item" }),
  },
  {
    name: "SoloQ · Campeão",
    route: "/#/builds/jayce?fonte=soloq",
    frame: "#v-soloq",
    ready: frame => frame.getByRole("region", { name: "Compras jogo a jogo" }),
  },
  {
    name: "Composições · Ordem do draft",
    route: "/#/time/composicoes",
    frame: "#v-camp",
    ready: frame => frame.getByRole("group", { name: "Confronto do draft" }),
  },
  {
    name: "Composições · Táticas",
    route: "/#/time/composicoes",
    frame: "#v-camp",
    open: frame => frame.getByRole("tab", { name: "Táticas" }).click(),
    ready: frame => frame.locator("#tx-title"),
  },
  {
    name: "Mapa tático",
    route: "/#/time/mapa",
    frame: "#v-camp",
    ready: frame => frame.getByRole("region", { name: "Mapa da jogada" }),
  },
  {
    name: "Conhecimento",
    route: "/#/time/conhecimento",
    frame: "#v-camp",
    ready: frame => frame.getByRole("heading", { name: "Objetivos do rio" }),
  },
  {
    name: "Conhecimento · Controle de wave",
    route: "/#/time/conhecimento/wave",
    frame: "#v-camp",
    ready: frame => frame.getByRole("heading", { name: "Números da wave em 2026" }),
  },
]

// O axe percorre a página inteira e os iframes. Em Worlds · Composições isso leva cerca de 15 s sozinho
// e passa de 30 s com os outros testes em paralelo.
test.describe.configure({ timeout: 60_000 })

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    if (window === window.top) localStorage.setItem("lol-guest", "true")
  })
})

for (const screen of screens) {
  test(`Acessibilidade (axe, WCAG 2.2 AA): ${screen.name}`, async ({ page }, testInfo) => {
    await page.goto(screen.route)
    const frame = page.frameLocator(screen.frame)
    if (screen.open) {
      await expect(frame.locator("body")).toBeVisible()
      await screen.open(frame)
    }
    await expect(screen.ready(frame)).toBeVisible()

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    const report = violations.map(violation => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.helpUrl,
      nodes: violation.nodes.slice(0, 5).map(node => node.target.join(" > ")),
      total: violation.nodes.length,
    }))
    await testInfo.attach("violacoes-axe.json", {
      body: JSON.stringify(report, null, 2),
      contentType: "application/json",
    })

    const allowed = screen.known ?? {}
    const known = report.filter(item => item.rule in allowed)
    if (known.length) {
      testInfo.annotations.push({
        type: "violação conhecida",
        description: known.map(item => `${item.rule} (${item.total})`).join(", "),
      })
    }
    // O que o teste aceita: a regra listada para esta tela, com no máximo o número de elementos registrado.
    const unexpected = report.filter(item => !(item.rule in allowed) || item.total > allowed[item.rule])
    expect(unexpected).toEqual([])
  })
}
