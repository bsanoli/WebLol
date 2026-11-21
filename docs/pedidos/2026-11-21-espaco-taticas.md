# Espaço em Táticas, barra única do quadro, tag Confronto e catálogo em uma linha

- **Tamanho:** M
- **Situação:** implementado
- **Pedido por:** Fabiano
- **Data:** 2026-11-21

## Pedido

> Draft e Lane com a mesma altura (Lane flex); com a lista recolhida o quadro ocupa o espaço vazio; sem scroll na tela. Tag "Confronto" com mais destaque; "Sair do confronto" com cara de botão. Remover o recolher da barra de confronto. Buscar campeão, Ordenar e filtros de rota mais compactos (hoje 3 linhas). Táticas: respiro para o Desfazer e mover "Editar na Ordem do draft" para não gastar uma linha.

**Resultado esperado:** a gaveta de Táticas usa toda a altura, Draft e Lane ficam do mesmo tamanho, os controles do quadro cabem numa linha e o seletor de campeão ocupa menos espaço.

**Critérios de aceite**

- [x] Draft e Lane com a mesma altura; com a lista recolhida o quadro vai até o fim da gaveta.
- [x] Sem rolagem da página de 1280×720 a 1920×1080 (teste Playwright).
- [x] Barra única: Draft | Lane + Desfazer à esquerda; Trocar lados + Editar na Ordem do draft à direita.
- [x] Barra de confronto da Ordem do draft sem botão de recolher.
- [x] Tag Confronto dourada sólida (contraste AA); Sair do confronto com contorno e ícone.
- [x] Busca, filtros só com ícone e Ordenar em uma linha (no máximo duas).

**Fora do escopo:** o recolher da lista de composições de Táticas (continua).

**Suposições:** o campo salvo `matchupBarCollapsed` deixou de ser lido e fica ignorado no armazenamento, sem migração (era só estado de visão). Com a lista expandida em telas baixas, o quadro rola por dentro.
