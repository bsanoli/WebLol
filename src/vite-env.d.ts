/// <reference types="vite/client" />

declare module "@dataset/build-timeline-url" {
  const url: string
  export default url
}

// O JSON do resumo (Worlds ou SoloQ, escolhido no build) é lido com o tipo canônico; o validador confere o formato na entrada.
declare module "@dataset/summary" {
  const summary: import("@/entities/match").TournamentSummary
  export default summary
}
