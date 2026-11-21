import { readdirSync, readFileSync } from "node:fs"
import { join, posix, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "@babel/parser"

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url))
const layers = ["shared", "entities", "features", "widgets", "pages", "app"]
const sourceFile = /\.[cm]?[jt]sx?$/
const lineLimit = 300
// Arquivos que já passavam do limite ou tinham `@ts-nocheck` quando a trava entrou. Eles só podem encolher:
// o teto de cada um é o tamanho de hoje, e a entrada sai da lista quando o arquivo cumpre a regra.
// Arquivo novo ou fora das listas precisa ter menos de 300 linhas não vazias e nenhum `@ts-nocheck` (docs/convencoes.md).
const legacyLongFiles = {
  "pages/builds/ui/build-details.ts": 474,
  "pages/builds/ui/builds-page.ts": 621,
  "pages/team/ui/team-controls.tsx": 310,
  "pages/worlds-compositions/ui/compositions-page.ts": 383,
  "shared/ui/arc/blocks/site-header/site-header.tsx": 865,
  "widgets/tactical-map/ui/battlefield-layer.ts": 373,
  "widgets/tactical-map/ui/tactical-map.ts": 648,
  "widgets/tactical-map/ui/ward-layer.ts": 303,
}
const legacyNoCheckFiles = new Set([])
const violations = new Set()

function describeModule(path) {
  const [layer, slice] = path.split("/")
  return { layer, slice: layer === "app" || layer === "shared" ? undefined : slice }
}

function checkImport(file, specifier) {
  const path = specifier.split(/[?#]/)[0]
  const target = path.startsWith("@/")
    ? posix.normalize(path.slice(2))
    : path.startsWith(".")
      ? posix.join(posix.dirname(file), path)
      : null
  if (!target) return

  const from = describeModule(file)
  const to = describeModule(target)
  const fromLayer = layers.indexOf(from.layer)
  const toLayer = layers.indexOf(to.layer)
  if (fromLayer < 0 || toLayer < 0) return

  if (toLayer > fromLayer || (toLayer === fromLayer && from.slice !== to.slice)) {
    violations.add(`${file} → ${target}: dependência fora da direção da FSD`)
    return
  }

  if (toLayer < fromLayer && to.slice) {
    const publicPath = `${to.layer}/${to.slice}`
    const modulePath = target.replace(/\/$/, "").replace(sourceFile, "")
    if (modulePath !== publicPath && modulePath !== `${publicPath}/index`) {
      violations.add(`${file} → ${target}: use a API pública de ${publicPath}`)
    }
  }
}

function visit(node, file) {
  if (!node?.type) return
  switch (node.type) {
    case "ImportDeclaration":
    case "ExportNamedDeclaration":
    case "ExportAllDeclaration":
    case "ImportExpression":
      if (node.source?.type === "StringLiteral") checkImport(file, node.source.value)
      break
    case "TSImportType":
      if (node.argument?.type === "StringLiteral") checkImport(file, node.argument.value)
      break
    case "TSExternalModuleReference":
      if (node.expression?.type === "StringLiteral") checkImport(file, node.expression.value)
      break
  }

  for (const child of Object.values(node)) {
    if (Array.isArray(child)) {
      for (const element of child) visit(element, file)
    } else {
      visit(child, file)
    }
  }
}

const files = readdirSync(sourceRoot, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && sourceFile.test(entry.name))
  .map(entry => relative(sourceRoot, join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
  .filter(file => layers.includes(file.split("/")[0]))
  .sort()

for (const file of files) {
  const code = readFileSync(join(sourceRoot, file), "utf8")
  const lines = code.split(/\r?\n/).filter(line => line.trim()).length
  const cap = legacyLongFiles[file]
  if (cap === undefined && lines >= lineLimit) {
    violations.add(
      `${file}: ${lines} linhas não vazias; divida em módulos por responsabilidade (limite ${lineLimit - 1})`,
    )
  } else if (cap !== undefined && lines > cap) {
    violations.add(`${file}: cresceu de ${cap} para ${lines} linhas; arquivos acima do limite só podem encolher`)
  } else if (cap !== undefined && lines < lineLimit) {
    violations.add(`${file}: já cumpre o limite; remova-o de legacyLongFiles em scripts/check-architecture.mjs`)
  }
  const hasNoCheck = /^\s*\/\/\s*@ts-nocheck\b/m.test(code)
  if (hasNoCheck && !legacyNoCheckFiles.has(file)) {
    violations.add(`${file}: @ts-nocheck não é aceito em arquivo novo; tipifique o módulo`)
  } else if (!hasNoCheck && legacyNoCheckFiles.has(file)) {
    violations.add(`${file}: sem @ts-nocheck; remova-o de legacyNoCheckFiles em scripts/check-architecture.mjs`)
  }

  const plugins = []
  if (/\.[cm]?tsx?$/.test(file)) plugins.push("typescript")
  if (/\.(?:[jt]sx|[cm]?js)$/.test(file)) plugins.push("jsx")
  try {
    const ast = parse(code, { sourceType: "unambiguous", plugins, createImportExpressions: true })
    visit(ast.program, file)
  } catch (error) {
    console.error(`${file}: ${error.message}`)
    process.exitCode = 1
  }
}

// Cor hexadecimal em CSS só existe no arquivo de tokens; o resto usa var(--wl-*) (docs/convencoes.md).
const tokenFiles = ["app/styles/tokens.css", "app/styles/palettes.css"]
const hexColor = /#[0-9a-fA-F]{3,8}\b/
for (const entry of readdirSync(sourceRoot, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".css")) continue
  const file = relative(sourceRoot, join(entry.parentPath, entry.name)).replaceAll("\\", "/")
  if (tokenFiles.includes(file)) continue
  const css = readFileSync(join(sourceRoot, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
  if (hexColor.test(css))
    violations.add(`${file}: cor hexadecimal fora de ${tokenFiles.join(" e ")}; use um token var(--wl-*)`)
}

for (const violation of [...violations].sort()) console.error(violation)
if (violations.size) process.exitCode = 1
if (!process.exitCode) console.log(`Arquitetura verificada em ${files.length} arquivos.`)
