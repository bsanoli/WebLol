import { createHash } from "node:crypto"
import { cpSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
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

// The GitHub Pages source is the repository root. These paths are generated.
// Check the build before replacing any of the files served by Pages.
for (const path of pages) statSync(join(dist, path))

const assets = join(root, "assets")
if (existsSync(assets)) rmSync(assets, { recursive: true })
for (const path of pages) {
  const source = join(dist, path)
  const destination = join(root, path)
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
