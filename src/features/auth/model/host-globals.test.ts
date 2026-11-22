import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../ui/captain-panel", () => ({
  canManageTeam: () => true,
  hasCaptainAccess: () => true,
  renderCaptainPanel: () => {},
  TEAM_NAME: "Time",
}))
vi.mock("./images", () => ({ hostImages: { fake: true } }))
vi.mock("@/shared/firestore", () => ({
  IS_ONLINE: true,
  currentFirebase: () => null,
}))

import { exposeHostGlobals } from "./host-globals"
import { BKEY, KEY, UKEY } from "./identity"
import { session } from "./session"
import { resetSession, stubStorage } from "./test-support"

type Draft = { synced: boolean; version: number | null; changes: unknown[] }
const emptyData = { comps: [], plays: [], tactics: [], matchups: [] }

function exposed() {
  const fake = {} as Record<string, unknown>
  vi.stubGlobal("window", fake)
  exposeHostGlobals()
  return fake as { weblolDraft: () => Draft }
}

afterEach(() => vi.unstubAllGlobals())

describe("exposeHostGlobals", () => {
  it("coloca no window só os seis nomes que os iframes leem", () => {
    stubStorage()
    resetSession()
    expect(Object.keys(exposed()).sort()).toEqual(
      ["TEAM_NAME", "canManageTeam", "captainAccess", "renderCaptainPanel", "weblolDraft", "weblolImages"].sort(),
    )
  })

  it("sem usuário, o rascunho não está sincronizado e não lista alterações", () => {
    stubStorage()
    resetSession()
    expect(exposed().weblolDraft()).toEqual({ synced: false, version: null, changes: [] })
  })

  it("jogador no time, mas sem leitura do banco: não sincronizado", () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false } })
    resetSession()
    session.team = { id: "t1", name: "A", captain: "x" }
    expect(exposed().weblolDraft().synced).toBe(false)
  })

  it("jogador sincronizado: devolve a versão oficial e as alterações ainda não enviadas", () => {
    stubStorage({
      [UKEY]: { id: "ana#br1", admin: false },
      [BKEY]: { version: 3, data: emptyData },
      [KEY]: { ...emptyData, comps: [{ id: "c1", name: "Nova" }] },
    })
    resetSession()
    session.team = { id: "t1", name: "A", captain: "x" }
    session.net = true
    session.off = { version: 3, at: 0, data: emptyData, log: [] }
    const draft = exposed().weblolDraft()
    expect(draft.synced).toBe(true)
    expect(draft.version).toBe(3)
    expect(draft.changes).toHaveLength(1)
  })

  it("conta solo nunca aparece como sincronizada", () => {
    stubStorage({ [UKEY]: { id: "ana#br1", admin: false, solo: true } })
    resetSession()
    session.team = { id: "t1", name: "A", captain: "x" }
    session.net = true
    expect(exposed().weblolDraft().synced).toBe(false)
  })
})
