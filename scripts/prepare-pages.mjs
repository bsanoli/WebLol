import { cpSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const dist = join(root, "dist")
const pages = ["assets", "camp.html", "worlds.html", "index.html"]

// The GitHub Pages source is the repository root. These paths are generated.
// Check the build before replacing any of the files served by Pages.
for (const path of pages) statSync(join(dist, path))

const assets = join(root, "assets")
if (existsSync(assets)) rmSync(assets, { recursive: true })
for (const path of pages) {
  const source = join(dist, path)
  const destination = join(root, path)
  if (path === "index.html") {
    writeFileSync(destination, readFileSync(source, "utf8").replace(/\r\n/g, "\n"))
  } else {
    cpSync(source, destination, { recursive: true })
  }
}
