/** Aplica os `data-slot` do design system às tabelas montadas como HTML simples. */
export function decorateManagementTables(region: HTMLElement) {
  for (const table of region.querySelectorAll<HTMLTableElement>('table[data-slot="table"]')) {
    const heading = table.rows[0]
    if (!heading?.querySelector("th")) continue
    const head = table.createTHead()
    head.dataset.slot = "table-header"
    head.append(heading)
    for (const body of table.tBodies) body.dataset.slot = "table-body"
    const container = table.ownerDocument.createElement("div")
    container.dataset.slot = "table-container"
    table.before(container)
    container.append(table)
    for (const row of table.rows) {
      row.dataset.slot = "table-row"
      for (const cell of row.cells) {
        if (cell.tagName === "TH") {
          cell.dataset.slot = "table-head"
          cell.scope = "col"
          if (!cell.textContent?.trim()) cell.setAttribute("aria-label", "Ações")
        } else cell.dataset.slot = "table-cell"
      }
    }
  }
}
