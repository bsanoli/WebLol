// Hook PostToolUse do Claude Code (.claude/settings.json): formata o arquivo que o agente acabou de editar
// e devolve ao agente os erros e avisos do Biome desse arquivo.
// Saída 2 manda os erros de volta ao agente; os avisos vão como contexto, sem bloquear.
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { relative, resolve } from "node:path"

const MAX_LISTED = 12
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const biome = resolve(root, "node_modules/@biomejs/biome/bin/biome")

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"))
  } catch {
    return {}
  }
}

const input = readHookInput()
const filePath = input.tool_input?.file_path
if (!filePath || !existsSync(biome)) process.exit(0)

const file = relative(root, resolve(root, filePath)).replaceAll("\\", "/")
const isChecked =
  /^(src|tests|scripts)\/.+\.(?:[cm]?[jt]sx?|json|jsonc|css)$/.test(file) && !file.startsWith("src/data/")
if (!isChecked) process.exit(0)

const run = spawnSync(
  process.execPath,
  [biome, "check", "--write", "--reporter=json", "--max-diagnostics=none", "--no-errors-on-unmatched", file],
  { cwd: root, encoding: "utf8" },
)

let report
try {
  report = JSON.parse(run.stdout)
} catch {
  if (run.status !== 0) {
    process.stderr.write(`Biome falhou em ${file}:\n${run.stderr || run.stdout}`)
    process.exit(2)
  }
  process.exit(0)
}

const describe = item =>
  `${file}:${item.location?.start?.line ?? "?"} ${item.category ?? item.severity}: ${item.message}`
const errors = report.diagnostics.filter(item => item.severity === "error" || item.severity === "fatal")
const warnings = report.diagnostics.filter(item => item.severity === "warning")

if (errors.length) {
  const listed = errors.slice(0, MAX_LISTED).map(describe).join("\n")
  const rest = errors.length > MAX_LISTED ? `\n… e mais ${errors.length - MAX_LISTED}.` : ""
  process.stderr.write(
    `Biome encontrou ${errors.length} erro(s) em ${file}. Corrija antes de seguir:\n${listed}${rest}\n`,
  )
  process.exit(2)
}

if (warnings.length) {
  const listed = warnings.slice(0, MAX_LISTED).map(describe).join("\n")
  const rest = warnings.length > MAX_LISTED ? `\n… e mais ${warnings.length - MAX_LISTED}.` : ""
  const context =
    `Biome: ${warnings.length} aviso(s) em ${file}. Corrija os que estiverem no trecho que você mudou ` +
    `(docs/convencoes.md, "Verificação automática"):\n${listed}${rest}`
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: context } }),
  )
}
