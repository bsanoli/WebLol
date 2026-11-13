// O mesmo código das abas do Worlds monta a aba SoloQ. O build com `--mode soloq`
// troca os arquivos de `@dataset/*` (ver vite.config.ts) e estes textos.
export const SOLOQ = import.meta.env.DEV
  ? document.body.dataset.dataset === "soloq"
  : import.meta.env.MODE === "soloq"

export const DATASET = SOLOQ ? {
  root: "/soloq",
  source: "soloq",
  label: "SoloQ dos pros",
  tabs: ["builds"],
  tabsLabel: "Análises da SoloQ",
  scope: "na amostra",
  scopeLong: "Win rate e ban rate consideram todas as partidas coletadas.",
  highlights: "Destaques da SoloQ",
  mostBanned: "Mais banidos na amostra",
  sourceName: "League of Graphs",
  sourceNote: "Fonte: API da Riot.",
  matchupGames: "com adversário direto",
} : {
  root: "/worlds",
  source: "worlds",
  label: "Worlds",
  tabs: ["geral", "matchups", "comps"],
  tabsLabel: "Análises do Worlds",
  scope: "no torneio",
  scopeLong: "Win rate e ban rate consideram o torneio inteiro.",
  highlights: "Destaques do Worlds",
  mostBanned: "Mais banidos no torneio",
  sourceName: "gol.gg",
  sourceNote: "Fonte: gol.gg.",
  matchupGames: "com draft completo",
}

/** Jogadores marcados com `ref` só servem de adversário direto (SoloQ: quem não é pro). */
export const isReference = (player: object) => "ref" in player && Boolean(player.ref)
