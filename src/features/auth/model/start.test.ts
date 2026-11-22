import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fx = vi.hoisted(() => ({
  fbFails: false,
  currentUser: null as { email: string } | null,
  calls: [] as string[],
  toasts: [] as string[],
  official: { off: undefined, err: "net" } as { off?: { version: number }; err?: string },
  memberTeam: null as { id: string; name: string; captain: string } | null,
  loadMembershipFails: false,
  adminKeyFails: false,
  syncSetsTeam: false,
}))

vi.mock("@/shared/firestore", () => ({
  // biome-ignore lint/style/useNamingConvention: nome exportado pelo módulo real
  IS_ONLINE: true,
  currentFirebase: () => (fx.fbFails ? null : { auth: { currentUser: fx.currentUser } }),
  fb: async () => {
    if (fx.fbFails) throw new Error("rede")
    return {}
  },
}))
vi.mock("@/shared/local-keys", () => ({ idbGet: async () => ({ chave: "falsa" }) }))
vi.mock("@/shared/lib/dom", () => ({
  $: () => ({ onclick: null, hidden: false }),
  toast: (message: string) => void fx.toasts.push(message),
}))
vi.mock("../ui/login-dialog", () => ({ closeModal: () => void fx.calls.push("closeModal") }))
vi.mock("../ui/login-steps", () => ({ stepId: () => void fx.calls.push("stepId") }))
vi.mock("../ui/admin", () => ({ renderAdmin: async () => {} }))
vi.mock("../ui/status", () => ({ setSync: () => {}, updateStatus: () => void fx.calls.push("updateStatus") }))
vi.mock("../ui/team-step", () => ({
  enterTeam: async () => void fx.calls.push("enterTeam"),
  logout: async () => {},
}))
vi.mock("./router", () => ({
  routeRoots: { camp: "/time" },
  openRoute: () => void fx.calls.push("openRoute"),
  startRouter: () => void fx.calls.push("startRouter"),
  writeRoute: (path: string) => void fx.calls.push(`writeRoute ${path}`),
}))
vi.mock("./membership", async () => {
  const { session } = await import("./session")
  return {
    clearTeamData: () => void fx.calls.push("clearTeamData"),
    loadAdminKey: async () => {
      if (fx.adminKeyFails) throw new Error("rede")
      fx.calls.push("loadAdminKey")
      return ""
    },
    loadMembership: async () => {
      if (fx.loadMembershipFails) throw new Error("rede")
      session.team = fx.memberTeam
    },
  }
})
vi.mock("./sync", () => ({
  listenToCampChanges: () => {},
  readOfficial: async () => fx.official,
  sync: async () => {
    fx.calls.push("sync")
    const { session } = await import("./session")
    if (fx.official.off) session.off = { ...session.off, ...fx.official.off } as never
  },
}))

import { ADMINS } from "@/shared/config"
import { GKEY, KEY, UKEY } from "./identity"
import { session } from "./session"
import { startPanel } from "./start"
import { resetSession, stubStorage } from "./test-support"

const jogador = { id: "ana#br1", admin: false }

beforeEach(() => {
  fx.fbFails = false
  fx.currentUser = null
  fx.calls.length = 0
  fx.toasts.length = 0
  fx.official = { err: "net" }
  fx.memberTeam = null
  fx.loadMembershipFails = false
  fx.adminKeyFails = false
  resetSession()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("startPanel: reconexão", () => {
  it("sem conta salva: só liga o roteador e abre a rota", async () => {
    stubStorage()
    await startPanel()
    expect(fx.calls).toContain("startRouter")
    expect(fx.calls).toContain("openRoute")
    expect(fx.calls).not.toContain("enterTeam")
  })

  it("conta salva e sessão do Firebase válida: entra no time", async () => {
    stubStorage({ [UKEY]: jogador })
    fx.currentUser = { email: "ana_br1@weblol.app" }
    await startPanel()
    expect(fx.calls).toContain("enterTeam")
  })

  it("sessão de outra conta ou expirada: pede a senha de novo e limpa o time", async () => {
    const store = stubStorage({ [UKEY]: jogador })
    fx.currentUser = null
    session.currentScreen = "camp"
    await startPanel()
    expect(store.has(UKEY)).toBe(false)
    expect(session.pendingId).toBe("ana#br1")
    expect(fx.calls).toContain("clearTeamData")
    expect(fx.toasts[0]).toContain("Crie a sua senha para continuar")
    expect(fx.calls).not.toContain("enterTeam")
  })

  it("sessão expirada com a Administração aberta: volta para a Área do time", async () => {
    stubStorage({ [UKEY]: jogador })
    session.currentScreen = "admin"
    await startPanel()
    expect(fx.calls).toContain("writeRoute /time")
  })

  it("sem rede: o time local continua valendo e nada é apagado", async () => {
    const store = stubStorage({ [UKEY]: jogador })
    fx.fbFails = true
    await startPanel()
    expect(store.has(UKEY)).toBe(true)
    expect(fx.calls).not.toContain("clearTeamData")
    expect(fx.calls).not.toContain("enterTeam")
  })

  it("admin: carrega a chave do banco e segue mesmo se a rede falhar nela", async () => {
    stubStorage({ [UKEY]: { id: "panda#zada", admin: true } })
    fx.currentUser = { email: ADMINS["panda#zada"] }
    fx.adminKeyFails = true
    await startPanel()
    expect(session.keys).toEqual({ chave: "falsa" })
    expect(fx.calls).toContain("enterTeam")
  })

  it("conta solo: apaga a cópia local da Área do time ao abrir", async () => {
    const store = stubStorage({ [UKEY]: { ...jogador, solo: true }, [KEY]: { comps: [1] } })
    fx.fbFails = true
    await startPanel()
    expect(store.has(KEY)).toBe(false)
  })

  it("visitante: nada fica salvo entre uma visita e outra", async () => {
    const store = stubStorage({ [GKEY]: { x: 1 }, [KEY]: { comps: [1] } })
    await startPanel()
    expect(store.has(KEY)).toBe(false)
  })
})

describe("startPanel: conferência a cada minuto", () => {
  const Minute = 60_000

  async function startedAs(account: object) {
    stubStorage({ [UKEY]: account })
    fx.currentUser = { email: "ana_br1@weblol.app" }
    await startPanel()
    fx.calls.length = 0
    fx.toasts.length = 0
  }

  it("pedido pendente aceito: avisa, fecha o diálogo e sincroniza", async () => {
    await startedAs(jogador)
    session.memb = { team: "t1", status: "pendente" }
    session.dismissLogin = () => {}
    fx.memberTeam = { id: "t1", name: "Time Um", captain: "x" }
    await vi.advanceTimersByTimeAsync(Minute)
    expect(fx.toasts).toEqual(["Você foi aceito no time Time Um!"])
    expect(fx.calls).toEqual(["closeModal", "sync"])
  })

  it("pedido ainda pendente: não avisa nada e não sincroniza", async () => {
    await startedAs(jogador)
    session.memb = { team: "t1", status: "pendente" }
    fx.memberTeam = null
    await vi.advanceTimersByTimeAsync(Minute)
    expect(fx.toasts).toEqual([])
    expect(fx.calls).not.toContain("sync")
  })

  it("falha de rede ao conferir o pedido: não avisa nada", async () => {
    await startedAs(jogador)
    session.memb = { team: "t1", status: "pendente" }
    fx.loadMembershipFails = true
    await vi.advanceTimersByTimeAsync(Minute)
    expect(fx.toasts).toEqual([])
    expect(fx.calls).not.toContain("sync")
  })

  it("nova versão oficial: sincroniza e avisa", async () => {
    await startedAs(jogador)
    session.team = { id: "t1", name: "A", captain: "x" }
    session.net = true
    session.off = { version: 1, at: 0, data: { comps: [], plays: [], tactics: [], matchups: [] }, log: [] }
    fx.official = { off: { version: 2 } }
    await vi.advanceTimersByTimeAsync(Minute)
    expect(fx.calls).toContain("sync")
    expect(fx.toasts).toEqual(["Nova versão oficial v2 carregada"])
  })

  it("mesma versão, mas a última leitura falhou: sincroniza de novo", async () => {
    await startedAs(jogador)
    session.team = { id: "t1", name: "A", captain: "x" }
    session.net = false
    session.off = { version: 2, at: 0, data: { comps: [], plays: [], tactics: [], matchups: [] }, log: [] }
    fx.official = { off: { version: 2 } }
    await vi.advanceTimersByTimeAsync(Minute)
    expect(fx.calls).toContain("sync")
    expect(fx.toasts).toEqual([])
  })

  it("mesma versão oficial: não sincroniza de novo", async () => {
    await startedAs(jogador)
    session.team = { id: "t1", name: "A", captain: "x" }
    session.net = true
    session.off = { version: 2, at: 0, data: { comps: [], plays: [], tactics: [], matchups: [] }, log: [] }
    fx.official = { off: { version: 2 } }
    await vi.advanceTimersByTimeAsync(Minute)
    expect(fx.calls).not.toContain("sync")
  })

  it("falha de rede ao ler a versão oficial: segue sem erro", async () => {
    await startedAs(jogador)
    session.team = { id: "t1", name: "A", captain: "x" }
    fx.official = { err: "net" }
    await expect(vi.advanceTimersByTimeAsync(Minute)).resolves.toBeDefined()
    expect(fx.calls).not.toContain("sync")
  })

  it("sem sessão no Firebase: a conferência não faz nada", async () => {
    await startedAs(jogador)
    fx.currentUser = null
    session.memb = { team: "t1", status: "pendente" }
    await vi.advanceTimersByTimeAsync(Minute)
    expect(fx.calls).toEqual([])
  })
})
