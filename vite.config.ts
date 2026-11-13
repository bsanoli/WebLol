import { fileURLToPath, URL } from "node:url"
import { defineConfig, type Plugin } from "vite"
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

function developmentDatasets(): Plugin {
  const prefix = "weblol-dataset:"
  return {
    name: "weblol-development-datasets",
    apply: "serve",
    resolveId(id) {
      if (id.startsWith("@dataset/")) return "\0" + prefix + id.slice("@dataset/".length)
    },
    load(id) {
      if (!id.startsWith("\0" + prefix)) return
      const name = id.slice(prefix.length + 1) as keyof typeof datasets.worlds
      const worlds = datasets.worlds[name]
      const soloq = datasets.soloq[name]
      if (!worlds || !soloq) return
      const exports = name === "builds"
        ? "export const { champions, games, itemNames, runeNames } = data;"
        : name === "build-timeline" ? "export const { games } = data;" : ""
      return `
        const data = (await (document.body.dataset.dataset === "soloq"
          ? import("/${soloq}")
          : import("/${worlds}"))).default;
        export default data;
        ${exports}
      `
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const soloq = mode === "soloq"
  const dataset = soloq ? datasets.soloq : datasets.worlds
  return {
    root: src(""),
    publicDir: fileURLToPath(new URL("./public", import.meta.url)),
    base: "./",
    plugins: [developmentDatasets(), react(), tailwindcss()],
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
        ...(command === "build"
          ? Object.entries(dataset).map(([name, path]) => ({ find: `@dataset/${name}`, replacement: src(path) }))
          : []),
        { find: "@", replacement: src("") },
      ],
    },
  }
})
