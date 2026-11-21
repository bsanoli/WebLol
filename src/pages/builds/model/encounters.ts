import { loadEncounterFile } from "@dataset/encounters"
import { championSlug } from "@/entities/match"

type EncounterPlayer = {
  champion: string
  role: string
  side: string
  spells: string[]
  finalItems: number[]
  boots?: number[]
  primaryTree: number
  primaryRunes: number[]
  secondaryTree: number
  secondaryRunes: number[]
  shards: number[]
  skillOrder?: string
  itemEventsByMinute: [number, number[]][]
}
type Encounter = { opponent: string; player: EncounterPlayer }

type State = { status: "loading" | "error" } | { status: "ready"; encounters: Encounter[] }
const states = new Map<string, State>()
const pending = new Map<string, Promise<void>>()

/**
 * Confrontos do campeão: carregados do arquivo próprio, só na primeira vez que alguém escolhe um adversário.
 * Chamadas durante o carregamento esperam o mesmo arquivo.
 */
export function loadEncounters(champion: string): Promise<void> {
  const slug = championSlug(champion)
  const running = pending.get(slug)
  if (running) return running
  if (states.get(slug)?.status === "ready") return Promise.resolve()
  states.set(slug, { status: "loading" })
  const task = (async () => {
    try {
      const encounters = (await loadEncounterFile(slug)) as Encounter[] | undefined
      if (!Array.isArray(encounters)) throw new Error(`Sem confrontos de ${champion}`)
      states.set(slug, { status: "ready", encounters })
    } catch {
      states.set(slug, { status: "error" })
    } finally {
      pending.delete(slug)
    }
  })()
  pending.set(slug, task)
  return task
}

/** Escolher o adversário outra vez tenta de novo o arquivo que falhou. */
export function discardFailedEncounters(champion: string) {
  const slug = championSlug(champion)
  if (states.get(slug)?.status === "error") states.delete(slug)
}

export function encountersStatus(champion: string) {
  return states.get(championSlug(champion))?.status ?? "idle"
}

export function encountersFor(champion: string, lane: string) {
  const state = states.get(championSlug(champion))
  if (state?.status !== "ready") return []
  return state.encounters.filter(({ player }) => !lane || player.role === lane)
}
