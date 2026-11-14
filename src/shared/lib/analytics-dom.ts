

export function showSort(sort: { k: string; d: number }) {
  document.querySelectorAll<HTMLButtonElement>("th button[data-k]").forEach(button => {
    const heading = button.closest("th");
    if (button.dataset.k === sort.k) heading?.setAttribute("aria-sort", sort.d < 0 ? "descending" : "ascending");
    else heading?.removeAttribute("aria-sort");
  });
}

export function enhanceAnalyticsUI() {
  document.querySelectorAll<HTMLElement>(".tablewrap:not(.builds-table-wrap)").forEach(el => {
    el.tabIndex = 0; el.setAttribute("role", "region");
    el.setAttribute("aria-label", el.classList.contains("mu-table")
      ? "Tabela de confrontos. Role para ver todas as linhas e colunas."
      : "Tabela de estatísticas. Role horizontalmente para ver todas as colunas.");
  });
  document.querySelectorAll("tr.main").forEach(el => el.setAttribute("aria-expanded", String(el.classList.contains("open"))));
  document.querySelectorAll<HTMLElement>("[data-tip]").forEach(el => {
    if (el.matches(".item,.rune-token,.preview-item")) el.tabIndex = 0;
    el.setAttribute("aria-describedby", "tip");
  });
}
