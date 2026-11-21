// Testes unitários das regras puras (`model/` e `lib/`). As telas ficam com o Playwright, em tests/.
// Decisão: docs/decisoes/0004-ferramentas-de-qualidade.md
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
      // Os testes de regras que leem dados usam o conjunto do Worlds, como o desenvolvimento.
      ...Object.entries({
        summary: "worlds.json",
        drafts: "worlds-2026-drafts.json",
        builds: "worlds-2026-builds.json",
        "build-assets": "worlds-2026-build-assets.json",
        "build-timeline": "worlds-2026-build-timeline.json",
      }).map(([name, file]) => ({
        find: `@dataset/${name}`,
        replacement: fileURLToPath(new URL(`./src/data/${file}`, import.meta.url)),
      })),
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
