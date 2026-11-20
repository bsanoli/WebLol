import { readdirSync, readFileSync } from "node:fs"
import { join, posix, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "@babel/parser"

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url))
const layers = ["shared", "entities", "features", "widgets", "pages", "app"]
const sourceFile = /\.[cm]?[jt]sx?$/
const lineWarning = 300
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
  if (lines >= lineWarning) console.warn(`Aviso: ${file} tem ${lines} linhas não vazias.`)

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

for (const violation of [...violations].sort()) console.error(violation)
if (violations.size) process.exitCode = 1
if (!process.exitCode) console.log(`Arquitetura verificada em ${files.length} arquivos.`)
