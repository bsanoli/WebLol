// Testes unitários das regras puras (`model/` e `lib/`). As telas ficam com o Playwright, em tests/.
// Decisão: docs/decisoes/0004-ferramentas-de-qualidade.md
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: fileURLToPath(new URL("./src/", import.meta.url)) }],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
