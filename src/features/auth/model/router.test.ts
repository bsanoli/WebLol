import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const dom = vi.hoisted(() => ({
  elements: new Map<string, Record<string, unknown>>(),
  toasts: [] as string[],
  closed: 0,
  renderedAdmin: 0,
  asked: 0,
}))

vi.mock("@/shared/lib/dom", () => ({
  $: (selector: string) => {
    if (!dom.elements.has(selector)) dom.elements.set(selector, { hidden: false, dataset: {}, textContent: "" })
    return dom.elements.get(selector)
  },
  toast: (message: string) => void dom.toasts.push(message),
}))
vi.mock("../ui/admin", () => ({ renderAdmin: async () => void dom.renderedAdmin++ }))
vi.mock("../ui/login-dialog", () => ({ closeModal: () => void dom.closed++ }))
vi.mock("../ui/team-step", () => ({ askOnCamp: () => void dom.asked++ }))

import { UKEY } from "./identity"
import { openRoute, routeRoots, writeRoute } from "./router"
import { session } from "./session"
import { resetSession, stubStorage } from "./test-support"

/** `location` e `history` mínimos: o hash muda quando o app escreve a rota. */
function stubBrowser(hash: string) {
  const location = { hash, href: `https://weblol.test/${hash}` }
  const calls: string[] = []
  vi.stubGlobal("location", location)
  vi.stubGlobal("history", {
    pushState: (_: unknown, __: string, url: string) => {
      calls.push(`push ${url}`)
      location.hash = url
    },
    replaceState: (_: unknown, __: string, url: string) => {
      calls.push(`replace ${url}`)
      location.hash = url
    },
  })
  vi.stubGlobal("document", {
    querySelectorAll: () => [],
    dispatchEvent: () => true,
    body: { dataset: {} },
  })
  return { location, calls }
}

beforeEach(() => {
  dom.elements.clear()
  dom.toasts.length = 0
  dom.closed = 0
  dom.renderedAdmin = 0
  dom.asked = 0
  resetSession()
})
afterEach(() => vi.unstubAllGlobals())
const stubFetch = () => vi.stubGlobal("fetch", async () => ({ ok: true, text: async () => "<p>tela</p>" }))

describe("writeRoute", () => {
  it("escreve a rota no endereço e não repete a mesma", () => {
    const { calls } = stubBrowser("#/worlds")
    writeRoute("/builds")
    writeRoute("/builds")
    expect(calls).toEqual(["push #/builds"])
  })

  it("com replace, troca a entrada do histórico em vez de empilhar", () => {
    const { calls } = stubBrowser("")
    writeRoute("/worlds", true)
    expect(calls).toEqual(["replace #/worlds"])
  })
})

describe("openRoute", () => {
  beforeEach(() => {
    stubStorage()
    stubFetch()
  })

  it("endereço vazio abre o Worlds", () => {
    const { location } = stubBrowser("")
    openRoute()
    expect(location.hash).toBe(`#${routeRoots.worlds}`)
    expect(session.currentScreen).toBe("worlds")
    expect(session.currentFrame).toBe("worlds")
  })

  it("endereço antigo de campeões vira Builds do Worlds com a posição topo", () => {
    const { location } = stubBrowser("#/worlds/campeoes")
    openRoute()
    expect(location.hash).toBe("#/builds?fonte=worlds&posicao=top")
    expect(session.currentScreen).toBe("builds")
    expect(session.currentFrame).toBe("worlds")
  })

  it("endereço antigo da SoloQ vira Builds da SoloQ", () => {
    const { location } = stubBrowser("#/soloq/builds/ahri")
    openRoute()
    expect(location.hash).toBe("#/builds/ahri?fonte=soloq")
    expect(session.currentFrame).toBe("soloq")
  })

  it("Composições antigas do Worlds vão para a rota atual, mantendo os filtros", () => {
    const { location } = stubBrowser("#/worlds/composicoes?x=1")
    openRoute()
    expect(location.hash).toBe("#/composicoes?x=1")
    expect(session.currentScreen).toBe("comps")
  })

  it("sem conta de admin nem capitão, a Administração cai na Área do time", () => {
    stubBrowser("#/admin")
    openRoute()
    expect(session.currentScreen).toBe("camp")
    expect(dom.renderedAdmin).toBe(0)
  })

  it("admin abre a Administração", () => {
    stubStorage({ [UKEY]: { id: "panda#zada", admin: true } })
    stubBrowser("#/admin")
    openRoute()
    expect(session.currentScreen).toBe("admin")
    expect(dom.renderedAdmin).toBe(1)
  })

  it("fora da Área do time e da Administração, fecha o diálogo de login aberto", () => {
    stubBrowser("#/worlds")
    session.dismissLogin = () => {}
    openRoute()
    expect(dom.closed).toBe(1)
  })

  it("na Área do time, o diálogo de login continua aberto", () => {
    stubBrowser("#/time")
    session.dismissLogin = () => {}
    openRoute()
    expect(dom.closed).toBe(0)
    expect(dom.asked).toBe(1)
  })
})

describe("carga da tela", () => {
  beforeEach(() => {
    stubStorage()
    vi.resetModules()
  })

  it("carrega o HTML da tela no iframe", async () => {
    stubBrowser("#/worlds")
    vi.stubGlobal("fetch", async () => ({ ok: true, text: async () => "<p>tela</p>" }))
    const { openRoute } = await import("./router")
    openRoute()
    await vi.waitFor(() => expect(dom.elements.get("#v-worlds")?.srcdoc).toBe("<p>tela</p>"))
  })

  it("falha ao carregar: mostra o aviso para tentar de novo na aba", async () => {
    stubBrowser("#/soloq")
    vi.stubGlobal("fetch", async () => ({ ok: false }))
    const { openRoute } = await import("./router")
    openRoute()
    await vi.waitFor(() => expect(dom.elements.get("#screen-error")?.hidden).toBe(false))
    expect(dom.elements.get("#screen-error")?.textContent).toContain("Não foi possível carregar esta área")
  })
})
