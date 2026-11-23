import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const dom = vi.hoisted(() => ({
  elements: new Map<string, Record<string, unknown>>(),
  toasts: [] as string[],
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
vi.mock("../ui/login-dialog", () => ({ closeModal: () => {} }))
vi.mock("../ui/team-step", () => ({ askOnCamp: () => void dom.asked++ }))

import { UKEY } from "./identity"
import { stubStorage } from "./test-support"

// O roteador guarda estado no módulo (`loaded`); cada teste importa uma cópia nova e usa a `session` dela.
let session: typeof import("./session")["session"]

type Listener = (event: unknown) => void

/** Iframe mínimo: guarda os ouvintes para o teste disparar `load`, `weblol:navigate` e `weblol:route-ready`. */
function createFrame(name: string, hasSrcdoc = true) {
  const listeners = new Map<string, Listener>()
  const apply = vi.fn()
  const frame = {
    id: `v-${name}`,
    dataset: {} as Record<string, string>,
    hasAttribute: () => hasSrcdoc,
    addEventListener: (type: string, listener: Listener) => void listeners.set(type, listener),
    contentWindow: { applyWebLolRoute: apply },
    contentDocument: null,
  }
  return { frame, apply, emit: (type: string, event: unknown = {}) => listeners.get(type)?.(event) }
}

/** Liga o roteador com `location`, `history` e os iframes dados, e devolve como disparar os eventos do navegador. */
async function startWith(frames: ReturnType<typeof createFrame>[], hash: string) {
  const location = { hash, href: `https://weblol.test/${hash}` }
  const calls: string[] = []
  const navigate = (kind: string) => (_: unknown, __: string, url: string) => {
    calls.push(`${kind} ${url}`)
    location.hash = url
  }
  vi.stubGlobal("location", location)
  vi.stubGlobal("history", { pushState: navigate("push"), replaceState: navigate("replace") })
  vi.stubGlobal("document", {
    querySelectorAll: (selector: string) => (selector === "#screens iframe" ? frames.map(each => each.frame) : []),
    dispatchEvent: () => true,
    body: { dataset: {} },
  })
  const windowListeners = new Map<string, () => void>()
  vi.stubGlobal("addEventListener", (type: string, listener: () => void) => void windowListeners.set(type, listener))
  const topClick: { listener: Listener } = { listener: () => {} }
  dom.elements.set("#top", {
    addEventListener: (_: string, listener: Listener) => {
      topClick.listener = listener
    },
  })
  ;({ session } = await import("./session"))
  const { resetSession } = await import("./test-support")
  resetSession()
  const router = await import("./router")
  router.startRouter()
  return { location, calls, router, windowListeners, click: (event: unknown) => topClick.listener(event) }
}

const menuClick = (section: string, hash: string, extra: Record<string, unknown> = {}) => ({
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  preventDefault: vi.fn(),
  target: { closest: () => ({ dataset: { section }, hash }) },
  ...extra,
})

beforeEach(() => {
  dom.elements.clear()
  dom.toasts.length = 0
  dom.renderedAdmin = 0
  dom.asked = 0
  vi.resetModules()
  vi.stubGlobal("fetch", async () => ({ ok: true, text: async () => "<p>tela</p>" }))
})
afterEach(() => vi.unstubAllGlobals())

describe("iframes", () => {
  beforeEach(() => stubStorage())

  it("rota pronta no iframe da tela aberta: aplica as partes e os filtros do endereço", async () => {
    const worlds = createFrame("worlds")
    const { router } = await startWith([worlds], "#/composicoes/jogo?time=iG")
    router.openRoute()
    worlds.apply.mockClear()
    worlds.emit("weblol:route-ready")
    expect(worlds.apply).toHaveBeenCalledOnce()
    const [parts, params] = worlds.apply.mock.calls[0] as [string[], URLSearchParams]
    expect(parts).toEqual(["composicoes", "jogo"])
    expect(params.get("time")).toBe("iG")
  })

  it("iframe de outra tela não recebe a rota", async () => {
    const soloq = createFrame("soloq")
    const { router } = await startWith([soloq], "#/worlds")
    router.openRoute()
    soloq.emit("weblol:route-ready")
    expect(soloq.apply).not.toHaveBeenCalled()
  })

  it("load de iframe sem srcdoc (página em branco) é ignorado", async () => {
    const worlds = createFrame("worlds", false)
    const { router } = await startWith([worlds], "#/worlds")
    router.openRoute()
    worlds.emit("load")
    expect(worlds.frame.dataset.ready).toBeUndefined()
  })

  it("load do iframe aberto: marca como pronto, esconde o carregando e aplica a rota", async () => {
    const worlds = createFrame("worlds")
    const { router } = await startWith([worlds], "#/worlds")
    router.openRoute()
    dom.elements.set("#screen-loading", { hidden: false })
    worlds.emit("load")
    expect(worlds.frame.dataset.ready).toBe("true")
    expect(dom.elements.get("#screen-loading")?.hidden).toBe(true)
    expect(worlds.apply).toHaveBeenCalled()
  })

  it("navegação pedida por um iframe que não está aberto é ignorada", async () => {
    const worlds = createFrame("worlds")
    const soloq = createFrame("soloq")
    const { router, location } = await startWith([worlds, soloq], "#/worlds")
    router.openRoute()
    soloq.emit("weblol:navigate", { detail: { path: "/builds?fonte=soloq" } })
    expect(location.hash).toBe("#/worlds")
  })

  it("navegação do iframe aberto muda o endereço e troca de tela quando a rota é de outra", async () => {
    const worlds = createFrame("worlds")
    const soloq = createFrame("soloq")
    const { router, location } = await startWith([worlds, soloq], "#/worlds")
    router.openRoute()
    worlds.emit("weblol:navigate", { detail: { path: "/builds/ahri?fonte=soloq" } })
    expect(location.hash).toBe("#/builds/ahri?fonte=soloq")
    expect(session.currentScreen).toBe("builds")
    expect(session.currentFrame).toBe("soloq")
  })

  it("copiar link: copia o endereço atual e avisa", async () => {
    const worlds = createFrame("worlds")
    const copied: string[] = []
    const { router } = await startWith([worlds], "#/worlds")
    vi.stubGlobal("navigator", { clipboard: { writeText: async (text: string) => void copied.push(text) } })
    const onCopy = vi.fn()
    router.openRoute()
    worlds.emit("weblol:navigate", { detail: { path: "/worlds", onCopy } })
    await vi.waitFor(() => expect(onCopy).toHaveBeenCalledOnce())
    expect(copied).toEqual(["https://weblol.test/#/worlds"])
    expect(dom.toasts).toEqual(["Link copiado"])
  })

  it("copiar link sem permissão da área de transferência: mostra o endereço para copiar à mão", async () => {
    const worlds = createFrame("worlds")
    const { router } = await startWith([worlds], "#/worlds")
    const asked: string[] = []
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: async () => {
          throw new Error("negado")
        },
      },
    })
    vi.stubGlobal("prompt", (_: string, url: string) => void asked.push(url))
    const onCopy = vi.fn()
    router.openRoute()
    worlds.emit("weblol:navigate", { detail: { path: "/worlds", onCopy } })
    await vi.waitFor(() => expect(asked).toEqual(["https://weblol.test/#/worlds"]))
    expect(onCopy).not.toHaveBeenCalled()
    expect(dom.toasts).toEqual([])
  })

  it("recarregar a Área do time refaz o iframe com o HTML já baixado", async () => {
    const camp = createFrame("camp")
    const { router } = await startWith([camp], "#/time")
    router.openRoute()
    await vi.waitFor(() => expect(dom.elements.get("#v-camp")?.srcdoc).toBe("<p>tela</p>"))
    dom.elements.set("#v-camp", { srcdoc: "" })
    session.reloadCamp()
    await vi.waitFor(() => expect(dom.elements.get("#v-camp")?.srcdoc).toBe("<p>tela</p>"))
  })
})

describe("menu do topo e botão voltar", () => {
  beforeEach(() => stubStorage())

  it("clique no menu: vai para a seção clicada", async () => {
    const { click, location } = await startWith([createFrame("worlds"), createFrame("soloq")], "#/worlds")
    const event = menuClick("builds", "#/builds?fonte=soloq")
    click(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(location.hash).toBe("#/builds?fonte=soloq")
    expect(session.currentScreen).toBe("builds")
  })

  it("clique com Ctrl, botão do meio ou já tratado deixa o navegador agir", async () => {
    const { click, location } = await startWith([createFrame("worlds")], "#/worlds")
    for (const extra of [{ ctrlKey: true }, { button: 1 }, { defaultPrevented: true }]) {
      const event = menuClick("camp", "#/time", extra)
      click(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    }
    expect(location.hash).toBe("#/worlds")
  })

  it("clique fora de um link do menu é ignorado", async () => {
    const { click, location } = await startWith([createFrame("worlds")], "#/worlds")
    const event = menuClick("camp", "#/time", { target: { closest: () => null } })
    click(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(location.hash).toBe("#/worlds")
  })

  it("clique na seção que já está aberta não repete a navegação", async () => {
    const { router, click, calls } = await startWith([createFrame("worlds")], "#/worlds")
    router.openRoute()
    const before = calls.length
    click(menuClick("worlds", "#/worlds"))
    expect(calls.length).toBe(before)
  })

  it("clique na seção aberta com erro de carga abre de novo", async () => {
    const { router, click } = await startWith([createFrame("worlds")], "#/worlds")
    router.openRoute()
    dom.elements.set("#screen-error", { hidden: false })
    const asked = dom.asked
    click(menuClick("worlds", "#/worlds"))
    expect(dom.asked).toBe(asked + 1)
  })

  it("voltar do navegador (hashchange) reabre a rota do endereço", async () => {
    const { windowListeners, location } = await startWith([createFrame("worlds"), createFrame("soloq")], "#/worlds")
    location.hash = "#/builds?fonte=soloq"
    windowListeners.get("hashchange")?.()
    expect(session.currentScreen).toBe("builds")
  })
})

describe("caminho do capitão", () => {
  it("capitão do time abre a Administração", async () => {
    stubStorage({ [UKEY]: { id: "Ana#BR1", admin: false } })
    const { router } = await startWith([], "#/admin")
    session.team = { id: "t1", name: "Time", captain: "ana_br1" }
    router.openRoute()
    expect(session.currentScreen).toBe("admin")
    expect(dom.renderedAdmin).toBe(1)
  })

  it("jogador de outro time não abre a Administração", async () => {
    stubStorage({ [UKEY]: { id: "Bia#BR1", admin: false } })
    const { router } = await startWith([], "#/admin")
    session.team = { id: "t1", name: "Time", captain: "ana_br1" }
    router.openRoute()
    expect(session.currentScreen).toBe("camp")
  })
})
