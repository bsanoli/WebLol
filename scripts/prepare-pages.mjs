import { createHash } from "node:crypto"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const dist = join(root, "dist")
const distSoloq = join(root, "dist-soloq")
const publicDir = join(root, "public")
const pages = ["assets", "camp.html", "worlds.html", "index.html", "soloq.html"]

// A aba SoloQ sai de um segundo build (vite build --mode soloq); junta tudo em dist/.
statSync(join(distSoloq, "soloq.html"))
cpSync(join(distSoloq, "assets"), join(dist, "assets"), { recursive: true })
cpSync(join(distSoloq, "soloq.html"), join(dist, "soloq.html"))

// Grava só em `_site/`, a pasta que o workflow deploy.yml publica como artefato
// (docs/decisoes/0003-publicacao-por-artefato.md). `--out=_site` continua aceito; outro valor é recusado,
// porque a pasta é apagada antes da cópia.
const outArgument = process.argv.slice(2).find(argument => argument.startsWith("--out"))
if (outArgument !== undefined && outArgument !== "--out=_site") {
  console.error(`Argumento não aceito: "${outArgument}". Use --out=_site ou nenhum argumento.`)
  process.exit(1)
}
const target = join(root, "_site")

// Confere o build antes de apagar a pasta de saída.
for (const path of pages) statSync(join(dist, path))

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
for (const path of pages) {
  const source = join(dist, path)
  const destination = join(target, path)
  if (path.endsWith(".html")) {
    writeFileSync(destination, versionPublicAssets(readFileSync(source, "utf8").replace(/\r+\n/g, "\n")))
  } else {
    cpSync(source, destination, { recursive: true })
  }
}

// O Vite já inclui o hash dos bundles no nome e usa a mesma URL nos imports e preloads.
// Os arquivos copiados de public/ mantêm o nome fixo e são versionados na URL.
function versionPublicAssets(html) {
  return html.replace(/(href|src)="(\.?\/assets\/[^"?]+\.(?:css|svg|js))"/g, (all, attr, path) => {
    const relativePath = path.replace(/^\.?\//, "")
    if (!statSync(join(publicDir, relativePath), { throwIfNoEntry: false })?.isFile()) return all
    const file = join(dist, relativePath)
    if (!existsSync(file)) return all
    const v = createHash("sha1").update(readFileSync(file)).digest("hex").slice(0, 8)
    return `${attr}="${path}?v=${v}"`
  })
}
