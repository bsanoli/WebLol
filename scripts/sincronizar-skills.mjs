import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sources = new URL("../.agents/skills/", import.meta.url);
const adapters = new URL("../.claude/skills/", import.meta.url);
const checkOnly = process.argv.includes("--check");
const marker = "<!-- Gerado por scripts/sincronizar-skills.mjs. -->";
const directories = await readdir(sources, { withFileTypes: true });
const expected = new Set();
const problems = [];

for (const directory of directories.filter((entry) => entry.isDirectory())) {
  const name = directory.name;
  const source = `.agents/skills/${name}/SKILL.md`;
  const input = await readFile(new URL(`${name}/SKILL.md`, sources), "utf8");
  const header = input.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  const sourceName = header?.match(/^name: (.+)$/m)?.[1];
  const description = header?.match(/^description: (.+)$/m)?.[1];
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) ||
    sourceName !== name ||
    !description
  ) {
    throw new Error(
      `Use name igual à pasta e description em uma linha em ${source}`,
    );
  }

  expected.add(name);
  const output = [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    "---",
    "",
    marker,
    "",
    `Leia e siga [a skill compartilhada](../../../${source}) antes de atuar.`,
    "Resolva os caminhos da skill a partir do arquivo de origem.",
    "",
  ].join("\n");
  const target = new URL(`${name}/SKILL.md`, adapters);
  const previous = await readFile(target, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  if (previous.replaceAll("\r\n", "\n") === output) continue;
  if (checkOnly) {
    problems.push(`Adaptador ausente ou desatualizado: ${name}`);
  } else {
    await mkdir(new URL("./", target), { recursive: true });
    await writeFile(target, output);
    console.log(`Sincronizado: ${name}`);
  }
}

const targets = await readdir(adapters, { withFileTypes: true });
for (const directory of targets.filter((entry) => entry.isDirectory())) {
  if (expected.has(directory.name)) continue;
  const target = new URL(`${directory.name}/SKILL.md`, adapters);
  const content = await readFile(target, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  if (content.includes(marker)) {
    problems.push(`Remova o adaptador sem fonte: ${fileURLToPath(target)}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`${expected.size} adaptadores de skills conferidos.`);
}
