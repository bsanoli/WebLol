const compactBuilds = matchMedia("(max-width: 767px)")
export const reduceBuildMotion = matchMedia("(prefers-reduced-motion: reduce)")

export const detailColumnSpan = () => (compactBuilds.matches ? 4 : 8)

function syncBuildDetailSpan() {
  document.querySelectorAll<HTMLTableCellElement>(".build-inline-detail:not([hidden]) > td").forEach(cell => {
    cell.colSpan = detailColumnSpan()
  })
}
compactBuilds.addEventListener("change", syncBuildDetailSpan)
