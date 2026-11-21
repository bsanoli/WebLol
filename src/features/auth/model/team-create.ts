// Criação de um time novo: o criador vira capitão e o time começa com a versão oficial vazia.
import { dbSet } from "@/shared/firestore"
import { meKey } from "./identity"

const teamSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20)

export async function createTeamRecords(name: string, accountId: string) {
  const id = `${teamSlug(name)}-${Math.random().toString(36).slice(2, 6)}`
  await dbSet("times", id, { name, captain: meKey(), captainId: accountId, created: Date.now() })
  await dbSet("membros", meKey(), { team: id, status: "ativo", riotId: accountId, at: Date.now() })
  await dbSet(`times/${id}/dados`, "oficial", {
    json: JSON.stringify({
      version: 1,
      at: Date.now(),
      label: "Time criado",
      by: accountId,
      data: { comps: [], plays: [] },
      log: [],
    }),
    at: Date.now(),
  })
}
