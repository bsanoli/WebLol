# Onda 8. Fechamento

- **Tamanho:** G
- **Situação:** implementado
- **Pedido por:** Fabiano
- **Data:** 2026-11-21

## Pedido

> teste todas as pendências das ondas e envie PR para as correções. O Steiger e os arquivos grandes não podem atrapalhar o fluxo de desenvolvimento.

**Resultado esperado:** o CI barra qualquer aviso do Steiger, e nenhum arquivo das camadas FSD que a onda tocou passa de 300 linhas.

**Critérios de aceite**

- [x] `npm run check:fsd` sem avisos e com `--fail-on-warnings`.
- [x] `shared` com um segmento por módulo e `index.ts` em cada um.
- [x] `tactical-map.ts`, `builds-page.ts`, `build-details.ts` e `compositions-page.ts` abaixo de 300 linhas, sem mudar comportamento.
- [x] Verify, build e size-limit passam; Playwright 46/46 (o teste instável do mapa "Paredes e arbustos" falhou uma vez numa rodada e passa sozinho: segue como pendência).
- [x] O gate do `size-limit` falha com limite apertado (provado local: saída 1 com 20 kB na Área do time).

**Fora do escopo:** `site-header.tsx` (fornecedor Arc UI), dados da SoloQ, chaves de `worlds.json` e testes de auth (PRs próprios).

## Resultado

- **Mudou:** imports passaram de `@/shared/api/*` e `@/shared/config/dataset` para `@/shared/firestore`, `@/shared/host-bridge`, `@/shared/local-keys` e `@/shared/dataset`; `shared/ui/arc/lib` virou `motion-tokens.ts` na raiz do Arc; `entities/tactical-play` ganhou o segmento `model`. O dataset fica fora do índice de `shared/config` para não entrar em todos os pacotes.
- **Verificado:** 175 testes Vitest, 46 Playwright (com axe), Steiger sem problemas, arquitetura em 239 arquivos, build e size-limit (Área do time 29,84 kB, Worlds 89,5, SoloQ 205,5).
- **Pendências:** testes instáveis do mapa (Paredes e arbustos; Torres), dados da SoloQ por campeão, `worlds.json` legível e testes de `features/auth/model` com emulador.
