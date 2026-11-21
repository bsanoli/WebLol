// Linter oficial do Feature-Sliced Design. Roda junto de scripts/check-architecture.mjs no `npm run check`.
// Decisão: docs/decisoes/0004-ferramentas-de-qualidade.md
import fsd from "@feature-sliced/steiger-plugin"
import { defineConfig } from "steiger"

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Estes slices só aparecem na Área do time, mas são grandes e têm testes e CSS próprios;
    // fundi-los em pages/team criaria um slice com milhares de linhas.
    files: ["./src/widgets/tactical-map/**", "./src/widgets/team-knowledge/**", "./src/entities/tactical-play/**"],
    rules: { "fsd/insignificant-slice": "off" },
  },
])
