# Lane, Confrontos recolhíveis, Desfazer fixo e troca de comp

- **Tamanho:** M
- **Situação:** implementado
- **Pedido por:** Fabiano
- **Data:** 2026-11-21

## Pedido

> Lane: arte do campeão cobrindo a linha, sem abrir a lista ao clicar no principal, ícones quadrados como no Draft. Confrontos: linha colorida no topo no lugar da bolinha, nome inteiro, lista recolhível. Desfazer visível. Trocar a comp com confronto aberto deve perguntar se substitui ou cria outro.

**Resultado esperado:** a visão Lane parece a Draft, a lista de Confrontos ocupa menos espaço quando recolhida, o Desfazer fica à vista e a troca de comp não perde o confronto sem perguntar.

**Critérios de aceite**

- [x] Arte do campeão cobre a linha da Lane; ícones quadrados; clicar no principal não abre a lista.
- [x] Aba Confrontos com linha colorida no topo e nome inteiro; lista recolhível com estado salvo.
- [x] Desfazer fixo ao lado de Trocar lados (Draft e Táticas), com Ctrl+Z.
- [x] Menu Substituir/Criar novo confronto ao trocar a comp com confronto aberto.

## Resultado

- **Verificado:** `npm run check`, Vitest (169), Playwright (46; o teste instável do mapa passa isolado), validação em desktop 1600×900.
- **Suposições:** o Desfazer guarda só a última ação; Ctrl+Z ignora campos de texto; "Criar novo confronto" mantém o lado do confronto atual.
