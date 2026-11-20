import { defineConfig, devices } from "@playwright/test"

const baseURL = "http://127.0.0.1:5180"
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
    command: "npm run dev -- --port 5180",
    url: baseURL,
  },
})
