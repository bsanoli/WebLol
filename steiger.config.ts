// Linter oficial do Feature-Sliced Design. Roda junto de scripts/check-architecture.mjs no `npm run check`.
// Decisão: docs/decisoes/0004-ferramentas-de-qualidade.md
import fsd from "@feature-sliced/steiger-plugin"
import { defineConfig } from "steiger"

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Débito anterior à Onda 1. Fica como aviso até a correção e então volta a ser erro
    // (docs/auditoria-codebase.md, "Avisos do Steiger").
    rules: {
      "fsd/no-public-api-sidestep": "warn",
      "fsd/public-api": "warn",
      "fsd/no-reserved-folder-names": "warn",
      "fsd/no-segmentless-slices": "warn",
      "fsd/insignificant-slice": "warn",
    },
  },
])
