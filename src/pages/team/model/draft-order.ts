// Ordem oficial do draft competitivo: fases de bans e picks, nome de cada pick e lado.
export const DRAFT_PHASES = [
  ["Fase de bans 1", ["B:ban", "R:ban", "B:ban", "R:ban", "B:ban", "R:ban"]],
  ["Fase de picks 1", ["B:pick", "R:pick", "R:pick", "B:pick", "B:pick", "R:pick"]],
  ["Fase de bans 2", ["R:ban", "B:ban", "R:ban", "B:ban"]],
  ["Fase de picks 2", ["R:pick", "B:pick", "B:pick", "R:pick"]],
] as const

/** Nome de cada pick pela ordem do draft (no lugar de B1, R1...). */
export const PICKNAME: Record<string, string> = {
  // biome-ignore-start lint/style/useNamingConvention: códigos de slot do draft são contrato salvo
  B1: "First Pick",
  B2: "Dupla B2/B3",
  B3: "Dupla B2/B3",
  B4: "Dupla B4/B5",
  B5: "Dupla B4/B5",
  R1: "Dupla R1/R2",
  R2: "Dupla R1/R2",
  R3: "Solo R3",
  R4: "Solo R4",
  R5: "Last Pick",
  // biome-ignore-end lint/style/useNamingConvention: fim da exceção
}

export const DRAFT_SIDE = { blue: "Lado azul", red: "Lado vermelho" } as const
