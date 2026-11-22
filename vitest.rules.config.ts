// Testes das regras do Firestore contra o emulador local (`npm run test:rules`). Precisam de Java.
// As regras são lidas de `firestore.rules` e carregadas só no emulador; nada é publicado.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests-rules/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 15_000,
  },
})
