export type MapPoint = readonly [x: number, y: number]
export type MapStyle = "minimap" | "realistic"

type Faelight = {
  id: string
  location: string
  minimap: MapPoint
  realistic: MapPoint
  bonusPath: string
  additional?: true
}

// Regras de 2026: https://www.leagueoflegends.com/pt-br/news/game-updates/patch-26-1-notes/
// Posições e contornos aproximados em porcentagem, com referência visual dos 12 pontos:
// https://lol-champ.com/lol-faelights/ (cobertura dos arbustos ilhados após a 26.3).
export const faelights: readonly Faelight[] = [
  {
    id: "blue-top-gate",
    location: "Portão azul do top",
    minimap: [19.4, 64.3],
    realistic: [19.4, 64.8],
    bonusPath:
      "M19 66 L16 63 L18 61 L17.5 59 L16 57 L16.5 52 L13 49 L13 46.5 L17 48.5 L22 49 L23.5 50 L28 50 L28 53.5 L24.5 53.5 L23 55.5 L27 57 L27.5 59 L30 57.5 L31 55 L33.4 55 L33.4 57.5 L32 60.7 L26 61 L23 59.4 L20.5 56 L20 52.6 L19 54 L18.8 57 L21 60 L21 63 Z",
  },
  {
    id: "blue-bot-gate",
    location: "Portão azul do bot",
    minimap: [34, 77.8],
    realistic: [33.1, 77.5],
    bonusPath:
      "M34 79 L34 76.8 L36 74.8 L38.3 74.8 L40.3 69.8 L42.6 71 L41.5 73.4 L42.7 77 L45 79 L47.7 79 L48.6 77.2 L52 78.8 L52 82 L53 83.7 L50 86 L46.8 83.2 L43.5 83.2 L41.6 85.5 L42.1 87.2 L39.7 88 L39.6 83 L42 80.4 L40 77 L39.2 76.6 L37.7 76.7 L37.7 78 Z",
  },
  {
    id: "red-top-gate",
    location: "Portão vermelho do top",
    minimap: [66, 19.5],
    realistic: [66.3, 20.2],
    bonusPath:
      "M66 19 L67 21 L64.5 25 L62.2 25 L61.3 28 L60 29.2 L57.7 28.3 L58.5 25 L56 21.7 L54 20.8 L51.8 21.1 L51.6 22.2 L49 21.4 L48.8 18.2 L47.8 16 L50 14.7 L52.5 16.8 L55.3 16.6 L58 15.2 L58 13.5 L60.6 13.4 L60.7 16.7 L58 18 L60.5 22.6 L62.8 23 L63 21.3 Z",
  },
  {
    id: "red-bot-gate",
    location: "Portão vermelho do bot",
    minimap: [80, 32.5],
    realistic: [80, 33.4],
    bonusPath:
      "M80 32 L83.5 37.7 L82.9 38.7 L83 40 L84.1 42.1 L84 46.7 L87 49.3 L86.6 52.8 L83.2 51 L80.8 51.6 L76.4 50 L71.2 50 L71.3 47.7 L74.6 47.8 L76.8 46.4 L77.2 45 L76.3 44 L75.3 45.2 L74 45 L72.8 43.2 L72.7 41 L70.3 42.7 L69.7 44.3 L66.8 44.4 L67.1 41.4 L68.6 39 L71 38.9 L72.4 37.8 L74.5 38.7 L76.2 39.7 L78 42.2 L79.5 44.4 L80 47.5 L81.6 47.6 L81.4 43 L79 40 L79.5 38.6 L79.4 35.9 Z",
  },
  {
    id: "upper-island",
    location: "Arbusto ilhado do rio superior",
    minimap: [22.6, 22.5],
    realistic: [23.4, 23.6],
    bonusPath: "M22.6 22.5 L25.5 25.4 L25.8 27.2 L27 29 L29.7 31.5 L25.9 35.9 L21.6 33 L21.5 31.8 L20 27.2 Z",
  },
  {
    id: "upper-wall",
    location: "Arbusto da parede do rio superior",
    minimap: [33.4, 41],
    realistic: [33, 41.5],
    bonusPath: "M33.4 41 L36.9 35.8 L39.6 36.2 L44.2 40.3 L38.3 45 L36.8 44.1 L35.6 43.8 Z",
  },
  {
    id: "lower-wall",
    location: "Arbusto da parede do rio inferior",
    minimap: [67.8, 57.9],
    realistic: [68.4, 59.1],
    bonusPath: "M67.8 57.9 L64.8 64.6 L59.7 63.5 L57.1 60.5 L62.6 54.8 L65 55.9 Z",
  },
  {
    id: "lower-island",
    location: "Arbusto ilhado do rio inferior",
    minimap: [78, 73],
    realistic: [77.8, 73.4],
    bonusPath: "M78 73 L74.7 73.3 L73.4 71.4 L70.7 68.2 L74.2 63.9 L76.8 66.3 L77.5 68 L78.6 69 Z",
  },
  {
    id: "blue-top-jungle",
    location: "Selva azul perto do top",
    minimap: [15.4, 33.8],
    realistic: [16.3, 34.6],
    additional: true,
    bonusPath:
      "M15.4 33.8 L16 29.7 L19.1 29.8 L21.6 33.5 L23.3 35.5 L22.9 36.4 L19.1 36.4 L18.7 37.4 L20.1 40.4 L22.7 43.5 L26.6 44 L28.1 47 L27.9 48.7 L21.5 48.7 L17.5 46.8 L13.6 43.6 L14.2 38.3 Z",
  },
  {
    id: "blue-bot-jungle",
    location: "Selva azul perto do bot",
    minimap: [62.1, 84.6],
    realistic: [62.2, 85.3],
    additional: true,
    bonusPath:
      "M62.1 84.6 L59.1 84.9 L56.1 86.6 L53.9 86.7 L52 84.7 L54.6 82.5 L55.5 80.6 L57.8 80.5 L58.9 83 L63.7 82.4 L67.9 80.7 L71.5 80 L74.6 83.7 L72.3 85.6 L68 84.4 Z",
  },
  {
    id: "red-top-jungle",
    location: "Selva vermelha perto do top",
    minimap: [35.8, 10.8],
    realistic: [35.6, 12.5],
    additional: true,
    bonusPath:
      "M35.8 10.8 L38.4 12.9 L42.8 13.7 L45 12.3 L47 12.4 L50 14.7 L47.8 16 L47 15.5 L45 15.7 L44.4 19 L42.6 19 L41 17.8 L40 17 L37.7 18.3 L33.7 18.5 L31.5 17.4 L28.2 18.5 L29.4 15.6 L32.3 14 Z",
  },
  {
    id: "red-bot-jungle",
    location: "Selva vermelha perto do bot",
    minimap: [87.4, 59],
    realistic: [87.2, 59.4],
    additional: true,
    bonusPath:
      "M87.4 59 L85.8 65 L84.4 69 L82 72.1 L80.2 69.7 L82.2 65.8 L82.2 61.1 L80.7 58.4 L78.5 56.3 L78.5 51 L80.8 51.6 L82.7 51.4 L85 53.7 L87 54.7 Z",
  },
]
