// Um arquivo por campeão, gerado por scripts/split_build_encounters.py. Cada um vira um bloco que só baixa quando pedido.
const files = import.meta.glob("./worlds-2026-encounters/*.json", { import: "default" })

export const loadEncounterFile = (slug: string) => files[`./worlds-2026-encounters/${slug}.json`]?.()
