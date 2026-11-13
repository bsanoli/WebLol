import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

// As abas do Worlds e da SoloQ usam o mesmo código; cada uma tem seus arquivos de dados.
// `vite build --mode soloq` gera só soloq.html, com os dados de src/data/soloq/.
const datasets = {
  worlds: {
    summary: "data/worlds.json",
    drafts: "data/worlds-2026-drafts.json",
    builds: "data/worlds-2026-builds.json",
    "build-assets": "data/worlds-2026-build-assets.json",
    "build-timeline": "data/worlds-2026-build-timeline.json",
  },
  soloq: {
    summary: "data/soloq/summary.json",
    drafts: "data/soloq/drafts.json",
    builds: "data/soloq/builds.json",
    "build-assets": "data/soloq/build-assets.json",
    "build-timeline": "data/soloq/build-timeline.json",
  },
}

export default defineConfig(({ mode }) => {
  const soloq = mode === "soloq"
  const dataset = soloq ? datasets.soloq : datasets.worlds
  return {
    root: src(""),
    publicDir: fileURLToPath(new URL("./public", import.meta.url)),
    base: "./",
    plugins: [react(), tailwindcss()],
    server: {
      port: soloq ? 5174 : 5173,
      strictPort: true,
    },
    build: {
      rolldownOptions: {
        input: (soloq ? ["soloq.html"] : ["index.html", "worlds.html", "camp.html"]).map(src),
      },
      outDir: fileURLToPath(new URL(soloq ? "./dist-soloq" : "./dist", import.meta.url)),
      emptyOutDir: true,
    },
    resolve: {
      alias: [
        ...Object.entries(dataset).map(([name, path]) => ({ find: `@dataset/${name}`, replacement: src(path) })),
        { find: "@", replacement: src("") },
      ],
    },
  }
})
