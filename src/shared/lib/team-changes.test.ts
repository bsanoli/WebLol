import { describe as suite, expect, it } from "vitest"
import { applyChanges, describe, diff, hsh, itemName, shared } from "./team-changes"

/** Garante que o valor existe e o devolve sem `undefined`. */
function defined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Valor ausente no teste")
  return value
}

const comp = (id: string, extra = {}) => ({
  id,
  name: `Comp ${id}`,
  team: "mine",
  lanes: { top: ["Ornn"], jng: [], mid: ["Orianna"], adc: [], sup: [], ban: ["Zed"] },
  draft: { rival: "", side: "blue" },
  ...extra,
})

suite("diff", () => {
  it("separa o que foi adicionado, editado e apagado", () => {
    const base = { comps: [comp("a"), comp("b")], plays: [], tactics: [] }
    const local = { comps: [comp("a", { name: "Nova" }), comp("c")], plays: [], tactics: [] }
    const changes = diff(local, base)
    expect(changes.map(c => `${c.op}:${c.id}`)).toEqual(["edit:a", "add:c", "del:b"])
  })

  it("ignora campos que mudam sozinhos", () => {
    const base = { comps: [comp("a", { updated: 1 })], plays: [{ id: "p", live: true, steps: [] }], tactics: [] }
    const local = { comps: [comp("a", { updated: 2 })], plays: [{ id: "p", live: false, steps: [] }], tactics: [] }
    expect(diff(local, base)).toEqual([])
  })

  it("dá o mesmo hash para a mesma alteração e hashes diferentes para alterações diferentes", () => {
    const [a] = diff({ comps: [comp("a")] }, {})
    const [again] = diff({ comps: [comp("a")] }, {})
    const [other] = diff({ comps: [comp("a", { name: "X" })] }, {})
    expect(a?.h).toBe(again?.h)
    expect(a?.h).not.toBe(other?.h)
    expect(hsh("weblol")).toBe(hsh("weblol"))
  })
})

suite("applyChanges", () => {
  it("devolve ao fim a versão local quando aplicada sobre a base", () => {
    const base = { comps: [comp("a"), comp("b")], plays: [], tactics: [] }
    const local = { comps: [comp("a", { name: "Nova" }), comp("c")], plays: [], tactics: [] }
    const result = applyChanges(base, diff(local, base))
    expect(result.comps.map(c => c.id).sort()).toEqual(["a", "c"])
    expect(result.comps.find(c => c.id === "a")?.name).toBe("Nova")
    expect(base.comps).toHaveLength(2)
  })
})

suite("describe", () => {
  it("lista os campeões de uma comp nova", () => {
    const [change] = diff({ comps: [comp("a")] }, {})
    expect(describe(defined(change))).toBe("Campeões: <b>TOP</b> Ornn · <b>MID</b> Orianna · <b>BAN</b> Zed")
  })

  it("resume o que mudou numa edição e escapa o texto", () => {
    const base = { comps: [comp("a")] }
    const local = {
      comps: [
        comp("a", {
          name: "<Nova>",
          team: "enemy",
          notes: "x",
          lanes: { top: ["Ornn", "Jax"], jng: [], mid: [], adc: [], sup: [], ban: ["Zed"] },
          draft: { rival: "b", side: "blue" },
        }),
      ],
    }
    const [change] = diff(local, base)
    expect(describe(defined(change)).split("<br>")).toEqual([
      "Nome: <b>Comp a</b> → <b>&lt;Nova&gt;</b>",
      "<b>TOP</b>: + Jax",
      "<b>MID</b>: − Orianna",
      "Anotações alteradas",
      "Lado alterado: nossa → adversária",
      "Adversária do draft alterada",
    ])
    expect(itemName(defined(change))).toBe("<Nova>")
  })

  it("descreve tática e jogada", () => {
    const base = { tactics: [{ id: "t", name: "T", text: "a" }], plays: [{ id: "p", name: "P", steps: [1] }] }
    const local = { tactics: [{ id: "t", name: "T", text: "b" }], plays: [{ id: "p", name: "P", steps: [1, 2] }] }
    const out = diff(local, base).map(c => describe(c))
    expect(out).toEqual(["Passos: 1 → 2", "Texto da tática alterado"])
  })

  it("copia só o que o time compartilha", () => {
    expect(shared({ comps: [comp("a")], other: 1 } as never)).toEqual({
      comps: [comp("a")],
      plays: [],
      tactics: [],
      matchups: [],
    })
  })
})

suite("bans nos dois formatos", () => {
  const old = comp("a")
  const novo = { ...comp("a"), lanes: { top: ["Ornn"], jng: [], mid: ["Orianna"], adc: [], sup: [] }, bans: ["Zed"] }

  it("a mesma composição nos dois formatos não conta como alteração", () => {
    expect(diff({ comps: [novo] }, { comps: [old] })).toEqual([])
    expect(diff({ comps: [old] }, { comps: [novo] })).toEqual([])
  })

  it("mudar um ban entre formatos aparece como alteração descrita", () => {
    const changed = { ...novo, bans: ["Ahri"] }
    const [change] = diff({ comps: [changed] }, { comps: [old] })
    expect(change?.op).toBe("edit")
    expect(describe(defined(change))).toContain("BAN")
  })
})
