// Hook Stop do Claude Code (.claude/settings.json): antes de o agente encerrar a resposta, roda o Biome,
// a arquitetura (check-architecture e Steiger) e os tipos. Com erro, devolve a saída ao agente uma vez.
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"))
  } catch {
    return {}
  }
}

const input = readHookInput()

// Sem mudança em arquivos verificados, não há o que conferir.
const changed = spawnSync(
  "git",
  ["status", "--porcelain", "--", "src", "tests", "scripts", "public/assets", "*.ts", "*.json", "*.jsonc"],
  { cwd: root, encoding: "utf8" },
)
if (changed.status === 0 && !changed.stdout.trim()) process.exit(0)

const steps = [
  ["Biome", "npm run lint -- --reporter=concise --diagnostic-level=error"],
  ["Arquitetura e tipos", "npm run check"],
]

// Sem cores: a saída vai como texto para o agente.
const env = { ...process.env }
env.NO_COLOR = "1"
env.FORCE_COLOR = "0"

const failures = []
for (const [name, command] of steps) {
  const run = spawnSync(command, { cwd: root, encoding: "utf8", shell: true, env })
  if (run.status !== 0)
    failures.push(`## ${name} (\`${command}\`)\n${`${run.stdout}\n${run.stderr}`.trim().slice(-4000)}`)
}

if (!failures.length) process.exit(0)

const message = `A verificação encontrou erros. Corrija antes de encerrar:\n\n${failures.join("\n\n")}\n`
// Na segunda parada seguida, só informa: o agente já recebeu os erros e pode precisar da pessoa.
if (input.stop_hook_active) {
  process.stdout.write(JSON.stringify({ systemMessage: message.slice(0, 2000) }))
  process.exit(0)
}
process.stderr.write(message)
process.exit(2)
