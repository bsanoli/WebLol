# Onda 9. Testes do mapa estáveis

- **Tamanho:** P
- **Situação:** implementado
- **Pedido por:** Fabiano
- **Data:** 2026-11-21

## Pedido

> Corrigir na causa os testes instáveis do mapa (Paredes e arbustos; Torres), sem retry.

**Resultado esperado:** a suíte inteira do Playwright passa em rodadas repetidas, sem depender da velocidade da máquina.

**Critérios de aceite**

- [x] Quatro rodadas completas seguidas com 46/46.
- [x] Nenhum retry nem aumento de timeout para esconder a falha.

## Resultado

- **Causa:** o mapa realista vem ligado, mas a visão só usa a grade dele depois que a imagem carrega (`data-map-visible` em `#mapimg`, `map-image.ts`). Antes disso vale a grade do minimapa, sem os mesmos arbustos. Os testes mediam a visão sem esperar a imagem, então com a máquina carregada a medida saía da grade errada.
- **Mudou:** `waitForRealisticMap` em `tests/support/tactical-map.ts`, usado no começo dos testes do mapa; o teste de Camadas deixou de checar `isVisible()` sem esperar logo depois do reload; `playwright.config.ts` aceita `PLAYWRIGHT_PORT` para rodar em outra porta quando outra cópia do projeto usa a 5180.
- **Pendência:** `Builds alterna de Worlds para SoloQ` falhou uma vez em 8 rodadas por tempo: a SoloQ baixa 4 MB de dados. Some com a carga por campeão (PR da SoloQ).
