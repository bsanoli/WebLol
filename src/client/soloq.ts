// Aba SoloQ: o mesmo código das Builds do Worlds, com os dados de src/data/soloq/ (build --mode soloq).
import "./worlds"
import SUMMARY from "@dataset/summary"

const meta = (SUMMARY as { meta?: { asOf?: string; regions?: string[]; pros?: number } }).meta
const foot = document.getElementById("soloq-foot")
if (foot && meta?.asOf) {
  const date = new Date(meta.asOf).toLocaleDateString("pt-BR")
  foot.textContent += ` Última coleta: ${date}${meta.pros ? ` · ${meta.pros} pros` : ""}${meta.regions?.length ? ` · ${meta.regions.join(", ")}` : ""}.`
}
