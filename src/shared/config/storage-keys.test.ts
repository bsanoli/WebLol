import { describe, expect, it } from "vitest"
import { STORAGE_KEYS, STORAGE_PREFIXES } from "./storage-keys"

/** Nomes com cara de chave que não são do `localStorage`. */
const NOT_STORAGE_KEYS: Record<string, string> = {
  "lol-time": "banco do IndexedDB com as chaves do admin",
  "lol-times-backup": "campo `fmt` do backup baixado pelo admin",
  "lol-comps-time": "campo `app` do arquivo exportado pela Área do time",
  "weblol-42ef7": "id do projeto no Firebase",
}

// Código que roda no navegador: `src/` (sem dados gerados, testes e este registro).
const sources = {
  ...import.meta.glob<string>(
    ["../../**/*.{ts,tsx,js}", "!../../data/**", "!../../**/*.test.ts", "!./storage-keys.ts"],
    {
      query: "?raw",
      import: "default",
      eager: true,
    },
  ),
}
/** O glob devolve caminhos relativos a este arquivo; a mensagem de erro mostra o caminho a partir da raiz. */
const fromRoot = (path: string) => new URL(path, "file:///raiz/src/shared/config/").pathname.replace("/raiz/", "")
const files = Object.entries(sources).map(([path, text]) => ({ path: fromRoot(path), text }))
const registry = new Set<string>([...Object.values(STORAGE_KEYS), ...Object.values(STORAGE_PREFIXES)])

describe("STORAGE_KEYS", () => {
  it("lê o código do app", () => {
    expect(files.some(file => file.path === "src/pages/team/model/local-state.ts")).toBe(true)
    expect(files.some(file => file.path === "src/features/auth/model/identity.ts")).toBe(true)
  })

  it("declara toda chave `lol-` e `weblol-` escrita no código", () => {
    const undeclared = files.flatMap(file =>
      [...file.text.matchAll(/["'`]((?:web)?lol-[a-z0-9-]+)["'`]/g)]
        .map(match => match[1])
        .filter(name => !(registry.has(name) || name in NOT_STORAGE_KEYS))
        .map(name => `${file.path}: ${name}`),
    )
    expect(undeclared).toEqual([])
  })

  it("não monta uma chave `lol-` ou `weblol-` por template ou concatenação fora do registro", () => {
    const composed = files
      .filter(file => file.path !== "src/shared/config/storage-keys.ts")
      .flatMap(file =>
        [...file.text.matchAll(/["'`]((?:web)?lol-[a-z0-9-]*)(?:\$\{|["']\s*\+)/g)]
          .map(match => match[1])
          .filter(prefix => !(registry.has(prefix) || prefix in NOT_STORAGE_KEYS))
          .map(prefix => `${file.path}: ${prefix}…`),
      )
    expect(composed).toEqual([])
  })

  it("só declara chaves que o código usa", () => {
    const declared = [
      ...Object.entries(STORAGE_KEYS).map(([name, key]) => ({ ref: `STORAGE_KEYS.${name}`, key })),
      ...Object.entries(STORAGE_PREFIXES).map(([name, key]) => ({ ref: `STORAGE_PREFIXES.${name}`, key })),
    ]
    const unused = declared.filter(
      ({ ref, key }) => !files.some(file => file.text.includes(ref) || file.text.includes(`"${key}"`)),
    )
    expect(unused).toEqual([])
  })

  it("não repete chaves", () => {
    const keys = Object.values(STORAGE_KEYS)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
