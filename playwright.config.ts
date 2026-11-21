import { defineConfig, devices } from "@playwright/test"

// PLAYWRIGHT_PORT deixa rodar a suíte em outra porta quando outra cópia do projeto já usa a 5180.
const port = process.env.PLAYWRIGHT_PORT ?? "5180"
const baseURL = `http://127.0.0.1:${port}`
const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: "./tests",
  // Na CI, um `test.only` esquecido falha a execução e uma falha instável ganha uma segunda tentativa.
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [["github"], ["list"]] : "list",
  // A primeira tela de cada teste carrega os dados do Worlds pelo servidor de desenvolvimento. Com os testes do axe
  // em paralelo, isso passa dos 5 s padrão do `expect`. O tempo maior só alonga as asserções que falham.
  expect: { timeout: 10_000 },
  use: { ...devices["Desktop Chrome"], baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
  },
})
