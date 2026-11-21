import { beforeEach, describe, expect, it, vi } from "vitest"
import { createTeamRecords } from "./team-create"

const dbSet = vi.hoisted(() => vi.fn())
vi.mock("@/shared/firestore", () => ({ dbSet }))
vi.mock("./identity", () => ({ meKey: () => "capitao_LTZ" }))

describe("createTeamRecords", () => {
  beforeEach(() => {
    dbSet.mockReset()
    vi.spyOn(Math, "random").mockReturnValue(0.5)
  })

  it("grava o time, o capitão como membro ativo e a versão oficial vazia", async () => {
    await createTeamRecords("Fraldinha FC", "capitao#LTZ")
    expect(dbSet).toHaveBeenCalledTimes(3)
    const [teams, members, official] = dbSet.mock.calls
    expect(teams[0]).toBe("times")
    expect(teams[1]).toMatch(/^fraldinha-fc-[a-z0-9]+$/)
    expect(teams[2]).toMatchObject({ name: "Fraldinha FC", captain: "capitao_LTZ", captainId: "capitao#LTZ" })
    expect(members.slice(0, 2)).toEqual(["membros", "capitao_LTZ"])
    expect(members[2]).toMatchObject({ team: teams[1], status: "ativo", riotId: "capitao#LTZ" })
    expect(official[0]).toBe(`times/${teams[1]}/dados`)
    expect(JSON.parse(official[2].json)).toMatchObject({ version: 1, data: { comps: [], plays: [] }, log: [] })
  })

  it("limita o identificador a 20 caracteres antes do sufixo", async () => {
    await createTeamRecords("Um nome de time muito, muito comprido", "a#b")
    const id = String(dbSet.mock.calls[0][1])
    expect(id.split("-").slice(0, -1).join("-").length).toBeLessThanOrEqual(20)
  })
})
