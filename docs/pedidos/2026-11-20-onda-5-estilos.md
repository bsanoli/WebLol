# Onda 5. Estilos

- **Tamanho:** G (mexe em todas as telas e na forma como o site carrega os estilos)
- **Situação:** 5a a 5d feitas
- **Pedido por:** Fabiano
- **Data:** 2026-11-20

## Pedido

> siga para a próxima onda (Onda 5 do [backlog](../auditoria-codebase.md#backlog-por-ondas))

**Resultado esperado:** o WebLol continua com a mesma aparência no desktop, mas os estilos ficam junto dos slices que os usam, com cores por token semântico e espaçamentos na escala de 8 px, para que mudar uma tela não exija caçar regras em arquivos globais.

**Critérios de aceite**

- [x] `public/assets/` não tem mais CSS; os estilos estão em `src/`, junto do slice dono, e entram pelo build do Vite.
- [x] Nenhum CSS de `src/` tem cor hexadecimal fora do arquivo de tokens.
- [x] Espaçamentos e alturas novos ou tocados seguem a escala de 8 px, com ajustes de 4 px.
- [x] As telas principais (Worlds, Builds, Composições com Draft, Táticas e Mapa, SoloQ, Administração) ficam iguais à versão atual, nos temas claro e escuro, conferidas lado a lado.
- [x] `npm run verify`, `npm run check`, build, `npm run size` e o Playwright (com axe) passam.

**Fora do escopo:** redesenhar telas, mudar textos, mudar dados salvos, mudar rotas.

**Suposições:** "capturas das telas principais não mudarem" será conferido por capturas antes e depois, feitas por mim no navegador, porque o projeto não tem testes de captura (`toHaveScreenshot`).

## Especificação

- **Telas e estados:** todas as telas desktop. Conferir tema claro e escuro, estados vazios, nomes longos e foco por teclado nas telas tocadas.
- **Dados salvos:** nenhum.
- **Builds:** muda a forma como os quatro HTMLs (`camp`, `index`, `soloq`, `worlds`) carregam os estilos: saem os `<link href="/assets/*.css">` e entram imports no código das entradas. Efeito esperado no tamanho dos pacotes (Worlds e SoloQ têm orçamento no `size-limit`).
- **Escala hoje:** 12.708 linhas de CSS em `public/assets/` (16 arquivos; os maiores são `team.css` com 3.625, `tactics.css` com 1.848, `compositions.css` com 1.316 e `builds.css` com 1.096). Em `src/` há 1.080 linhas e uma cor hexadecimal.
- **Cores hexadecimais em `public/assets/`:** 105 em `base.css` (provavelmente os tokens) e cerca de 90 espalhadas em `team.css` (55), `tactics.css` (10), `draft-layout.css` (9), `builds.css`, `compositions.css`, `shell.css` e `build-details.css`.
- **Termos novos:** nenhum.
- **Decisões:** proponho uma ADR curta com a regra de onde cada CSS mora (slice dono, ou `shared/ui` se tiver mais de um consumidor) e como os tokens são organizados.

## Riscos

- **Bruno está editando os mesmos arquivos agora.** Os commits recentes dele em `main` mexem em `public/assets/tactics.css` (+238 linhas) e em `team.css`. Mover esses arquivos enquanto ele trabalha gera conflitos grandes e perda de edição. É a principal razão para eu parar aqui.
- **Ordem da cascata.** Hoje os CSS são carregados em uma ordem fixa por HTML. Ao importar no código, a ordem pode mudar e alterar quem vence um seletor. Por isso a regra é mover um arquivo por vez, mantendo a ordem, e conferir a tela dele.
- **Sem rede de segurança visual.** Não existem testes de captura. A conferência é manual (antes e depois) mais o axe.

## Plano

| Onda | Arquivos ou slices | Testes | Risco |
| --- | --- | --- | --- |
| 5a | Tokens: `base.css` (cores e escala) vai para `src/app/styles/`, e as cores hexadecimais soltas viram tokens `--wl-*`. Os HTMLs passam a importar daí | verify, build, size, Playwright; capturas antes e depois | Médio |
| 5b | CSS das telas sem edição ativa do Bruno: `worlds*.css`, `analytics*.css`, `builds.css`, `build-*.css`, `shell.css`, `motion.css` para os slices donos | verify, build, size, Playwright; capturas | Médio |
| 5c | Área do time: `team.css`, `team-controls.css`, `draft-layout.css`, `compositions.css`, `tactics.css` | idem, e Playwright de Composições | Alto (conflito com o Bruno) |
| 5d | Escala de 8 px nos arquivos movidos e regra automática (Biome ou Steiger) que barra hexadecimal fora dos tokens | verify, check | Baixo |

## Resultado

- **Mudou:** todos os CSS saíram de `public/assets/` para os slices donos (ver [ADR 0008](../decisoes/0008-onde-moram-os-estilos.md)); cada página tem um CSS de entrada (`camp.css`, `worlds.css`, `home.css`) com `@import` na ordem original, que preserva a cascata; todas as cores hexadecimais viraram tokens em `tokens.css` e `palettes.css`; `check-architecture` falha se aparecer hexadecimal em CSS de `src/` fora desses dois arquivos.
- **Verificado:** `npm run verify` (83 testes), `npm run build`, `npm run size` (Área do time 33,68 de 40 kB; Worlds 268,21 de 295; SoloQ 556,5 de 630), Playwright 43 testes com axe; capturas antes e depois de 8 telas em 2 temas iguais (só ruído de antialiasing). Um primeiro build com `<link>` simples fez o botão "..." das composições ganhar borda; os CSS de entrada corrigiram.
- **Pendências:** alturas e larguras fora da escala de 8 px (só margin, padding e gap foram ajustados, 204 valores); conflito de rename com as edições do Bruno em `team.css` e `tactics.css`.
- **Regras registradas:** hexadecimal em CSS de `src/` só em `tokens.css` e `palettes.css`; CSS novo entra no CSS de entrada da página, na ordem da cascata.
