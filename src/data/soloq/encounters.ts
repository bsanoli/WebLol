// Um arquivo por campeão, gerado por scripts/soloq.py. Cada um vira um bloco que só baixa quando pedido.
const files = import.meta.glob("./encounters/*.json", { import: "default" })

export const loadEncounterFile = (slug: string) => files[`./encounters/${slug}.json`]?.()
