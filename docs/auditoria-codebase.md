# Auditoria do codebase

Retrato do código e do fluxo de trabalho em 19/11/2026, feito para planejar a refatoração e atualizado em 20/11/2026 com a Onda 1. Os números vêm de `git`, `grep`, `npm run check`, `npm run build` e dos testes Playwright. Cada onda do [backlog](#backlog-por-ondas) diz quando está pronta e como medir de novo.

Os termos seguem o [glossário](glossario.md). As regras novas estão em [convenções](convencoes.md), e o processo está em [SDLC](sdlc.md).

## Resumo

1. **O mesmo conceito tem vários nomes.** A composição adversária aparece como `rival`, `enemy` e `opponent`, a posição como `lane`, `role` e `DraftLane`, e a Área do time como `camp`, `time` e `team`.
2. **Não havia verificação automática antes de publicar.** Não existia CI, lint, formatação nem teste unitário, e quase todos os commits iam direto para a `main`. A [Onda 1](#onda-1-verificação-automática) trouxe Biome, Steiger, Vitest, axe, ganchos e CI. As regras com dívida anterior ainda só avisam ([lista](#avisos-que-ainda-não-barram)).
3. **O build gerado mora no Git.** 636 arquivos gerados estão versionados, e 142 dos 159 commits mexem neles.
4. **O código mais usado é o menos tipado.** Nove arquivos com `@ts-nocheck` somam 4.052 linhas, entre eles a página do time (1.459 linhas). Antes da formatação do Biome, que quebra as linhas acima de 120 caracteres, eram 3.030 e 883.
5. **Três sistemas de estilo convivem.** São 16 CSS globais em `public/assets/`, 5 CSS modules e Tailwind, com cores soltas fora dos tokens.
6. **As páginas carregam mais do que mostram.** A Área do time monta todas as abas e o mapa realista de 2 MB, e cada rota faz de 68 a 221 requisições.

## 1. Nomes

| Problema | Evidência | Onde corrigir |
| --- | --- | --- |
| Sinônimos para a composição adversária | `rival` (160 ocorrências), `enemy` (154), `opponent` (142, quase todas em Builds, com outro sentido) | Onda 3 |
| Lado da composição chamado `team` | `team: "mine" \| "enemy"` em `Composition`, `CompTeam` em `composition-side.ts`, enquanto `team` também é o grupo do WebLol | Onda 3 (3a feita: `owner`/`CompOwner`) |
| Ban guardado como posição | `lanes: Record<"top" \| "jg" \| "mid" \| "adc" \| "sup" \| "ban", string[]>` | Onda 3 (feita: `bans` no código e no formato salvo; `lanes.ban` só é lido, ADR 0007) |
| Posição com três nomes | `lane`, `role`, `DraftLane`, `ROLES` e `LANES` | Onda 3 |
| Nomes de uma a três letras | 78 em `public/assets/sync.js`, 78 em `public/assets/shell.js`, 62 em `src/pages/team/ui/team-page.ts`. Em `entities/tactical-play`: `RN`, `TOKS`, `sw`, `PRE`, `cb`, `cr` | Ondas 3 e 4 |
| Dados em posições de texto ou array | campeões como `"Nome\|Id\|Roles"` (`CH`), `LANES` com `{k, n, c}`, `worlds.json` com chaves `st`, `s`, `g`, `b`, `r`, `bw`, `p` e arrays posicionais | Ondas 3 e 6 |
| Prefixos de chave local misturados | `lol-comps-time-v1` e chaves `weblol-…` | Onda 1 (registro) e Onda 3 (migração) |
| Arquivos e pastas fora do padrão | `PrintSketch.tsx` e `TacticNotes.tsx` em PascalCase (3a feita), pastas com nome de fornecedor (`shared/ui/arc`, `shared/ui/reui`), scripts com nomes em dois idiomas | Onda 3 |

## 2. Documentação

- O README cita `src/data/ui-versions.ts`, mas o arquivo é `src/app/config/ui-versions.ts`. Também fala em três entradas, quando são quatro HTMLs em dois builds, e não lista os arquivos com `@ts-nocheck`. Corrigido nesta entrega.
- Antes desta entrega não havia glossário, documento de arquitetura nem registro de decisões.
- `.ua/knowledge-graph.json` estava versionado e desatualizado, e `src/components/examples/` estava vazia. Os dois foram removidos na Onda 2.
- `src/app/config/ui-versions.ts` tem 502 linhas de histórico de versões da interface, misturado com configuração.

## 3. Tipos e tamanho

Arquivos com `@ts-nocheck` (linhas não vazias, depois da formatação do Biome):

| Arquivo | Linhas |
| --- | ---: |
| `src/pages/team/ui/team-page.ts` | 1.459 |
| `src/widgets/tactical-map/ui/tactical-map.ts` | 651 |
| `src/pages/builds/ui/builds-page.ts` | 629 |
| `src/pages/worlds-compositions/ui/compositions-page.ts` | 513 |
| `src/widgets/analytics-tooltip/ui/tooltip.ts` | 224 |
| `src/widgets/team-knowledge/ui/knowledge.ts` | 198 |
| `src/app/entrypoints/worlds.ts` | 151 |
| `src/pages/worlds-compositions/ui/match-card.ts` | 142 |
| `src/pages/worlds-overview/ui/overview.ts` | 85 |

O `npm run check` avisa sobre 11 arquivos acima de 300 linhas: `team-page` (1.459), `site-header` (865), `tactical-map` (651), `builds-page` (629), `ui-versions` (528), `compositions-page` (513), `build-details` (474), `matchup-bar` (374), `battlefield-layer` (373), `team-controls` (310) e `ward-layer` (303).

Os scripts clássicos `public/assets/shell.js` e `public/assets/sync.js` ficam fora do TypeScript e do FSD. Eles controlam login, troca de time, backup e a comunicação com os iframes por variáveis globais (`captainAccess`, `canManageTeam`, `TEAM_NAME`, `renderCaptainPanel`, `weblolImages`). Detalhes em [arquitetura](arquitetura.md#comunicação-entre-o-shell-e-os-iframes).

## 4. Estilos

- 16 arquivos CSS globais em `public/assets/`, 5 CSS modules em `src/` e classes Tailwind por cima.
- Cores hexadecimais fora dos tokens: `base.css` (105), `team.css` (58), `tactics.css` (10), `draft-layout.css` (9), `shell.css` (5) e `compositions.css` (5).
- Muitos espaçamentos não são múltiplos de 4 px, o que contraria a escala de 8 px da [skill weblol-ui](../.agents/skills/weblol-ui/SKILL.md).

## 5. Fluxo de trabalho

- **Publicação:** o Pages servia a raiz da `main`, e cada publicação versionava o build (632 arquivos em `assets/` e os 4 HTMLs). O `soloq.yml` diário fazia `git reset --hard` e tentava o push até três vezes. Resolvido na Onda 2b pelo deploy por artefato: [ADR 0003](decisoes/0003-publicacao-por-artefato.md).
- **Verificação:** na linha de base, nenhum workflow rodava `npm run check` ou testes, e não havia lint, formatação nem teste unitário. Desde a Onda 1, o `ci.yml` roda tudo em cada push.
- **Revisão:** só 6 merges em 159 commits. Há branches remotas antigas: quatro `claude/project-thread-*` e `codex/revisao-ui`.
- **Agentes:** na linha de base não havia `.claude/settings.json`, e nenhum gancho rodava depois das edições. Desde a Onda 1, o `PostToolUse` roda o Biome no arquivo editado e o `Stop` roda o Biome e o `npm run check`. A configuração dos agentes fica em três lugares (`docs/agentes/`, `.claude/agents/`, `.codex/agents/`). `node scripts/sincronizar-skills.mjs --check` falhava porque `grill-me` e `grilling` não tinham cópia em `.claude/skills/`. Corrigido na Onda 0.
- **Testes:** `tests/tactical-map.spec.ts` tem mais de 1.100 linhas. Na linha de base, o Playwright passou em 33 de 34 testes. Falhava `tests/team.spec.ts:397` ("Táticas: monta picks na gaveta e arrasta uma adversária para criar o confronto"), que esperava o título "Nossa base x Time rival". O teste passou depois do commit de Táticas 9990e74, que atualizou o fluxo e o teste juntos. A Onda 1 acrescentou 8 testes de acessibilidade no Playwright e 33 testes unitários no Vitest.

## 6. Desempenho

- `dist/` tem 27 MB e `dist-soloq/` tem 21 MB.
- O bundle do Worlds tem 1,98 MB porque inclui os dados.
- Os maiores chunks são o Excalidraw (1,8 MB, mais 1,06 MB no esboço de captura de tela), o Tiptap (440 KB), o cytoscape (441 KB) e o katex (258 KB). Os dois últimos vêm do `mermaid`, que o Excalidraw traz por `@excalidraw/mermaid-to-excalidraw`.
- A Área do time monta todas as abas ao abrir, inclusive o mapa realista de 2 MB.
- O `?v=hash` que o `prepare-pages.mjs` acrescenta aos ativos públicos duplica requisições de `modulepreload`.
- Cada rota faz de 68 a 221 requisições e baixa de 4,7 a 9,8 MB ([auditoria de requisições](auditoria-requisicoes.md)).

## Avisos que ainda não barram

Contagem de 20/11/2026, depois da Onda 1. Estas regras acusam código anterior e por isso só avisam. Cada uma vira erro quando chegar a zero ([convenções](convencoes.md#verificação-automática)).

### Avisos do Biome

`npm run lint` mostra 555 avisos e 89 sugestões. As regras com mais avisos:

| Regra | Avisos | Onde corrigir |
| --- | ---: | --- |
| `style/noNonNullAssertion` (`!` depois de valor que pode faltar) | 147 | Ondas 3 e 4, ao tipar os arquivos com `@ts-nocheck` |
| `style/noDescendingSpecificity` (CSS) | 144 | Onda 5 |
| `nursery/useConsistentBooleanName` | 142 | Onda 3 |
| `style/useNamingConvention` | 37 | Onda 3 |
| `suspicious/useIterableCallbackReturn` | 28 | Onda 3 |
| `complexity/noImportantStyles` (CSS) | 12 | Onda 5 |
| `suspicious/noImplicitAnyLet` | 12 | Ondas 3 e 4 |

As outras regras têm até 7 avisos cada. O `sync.js` e o `shell.js` ficam fora das regras de nomes, de `const` e de variáveis sem uso, e das correções automáticas de `useOptionalChain`, `noUselessEscapeInRegex` e `noPrototypeBuiltins` (`biome.jsonc`): são scripts clássicos que compartilham variáveis globais, e o Biome os lê como módulos isolados. As 89 sugestões de `style/useTemplate` só saem com `npx biome check --write --unsafe .`, revisando o diff.

### Avisos do Steiger

`npm run check:fsd` mostra 26 avisos:

| Regra | Avisos | O que acusa |
| --- | ---: | --- |
| `fsd/no-public-api-sidestep` | 19 | Imports direto de `shared/config/theme`, `dataset` e `storage-keys` e de `shared/ui/arc` (`tabs`, `switch`, `navigation-hover`, `motion-tokens`, `blocks/site-header`) |
| `fsd/public-api` | 3 | `shared/config`, `shared/ui/arc` e `shared/ui/reui` sem `index.ts` |
| `fsd/insignificant-slice` | 2 | `widgets/team-knowledge` e `widgets/tactical-map`, usados só por `pages/team` |
| `fsd/no-reserved-folder-names` | 1 | Pasta `lib` dentro de `shared/ui/arc` |
| `fsd/no-segmentless-slices` | 1 | `entities/tactical-play` sem segmentos |

Os dois primeiros somem juntos quando `shared/config` e as pastas de `shared/ui` ganharem `index.ts`, o que cabe na Onda 3 com a troca dos nomes de fornecedor.

### Violações do axe

`tests/accessibility.spec.ts` aceita só a regra `label-content-name-mismatch`, nos picks do draft (`draft-board.ts`) e nos seletores do confronto (`matchup-bar.tsx`) em Composições. O `aria-label` desses botões não contém o texto visível na mesma ordem, o que atrapalha quem usa comando de voz (critério 2.5.3 da WCAG). Corrigir na Onda 3, junto com os nomes da Área do time.

## Backlog por ondas

Cada onda é uma ou mais entregas M ou G com pedido em `docs/pedidos/`. As ondas 3 a 7 mexem nos arquivos da Área do time e começam depois que o trabalho de Táticas em andamento for commitado. As ferramentas e versões estão na [ADR 0004](decisoes/0004-ferramentas-de-qualidade.md).

### Onda 0. Processo e vocabulário

Esta entrega: [SDLC](sdlc.md), [glossário](glossario.md), [convenções](convencoes.md), [arquitetura](arquitetura.md), [revisão](revisao.md), ADRs 0001 a 0004, skills `weblol-pedido` e `weblol-padronizar`, agente `change-verifier`.

**Pronta quando** Fabiano e Bruno aceitarem as ADRs 0001, 0002 e 0004 ou pedirem mudanças.

### Onda 1. Verificação automática

**Situação:** implementada em 20/11/2026 ([pedido](pedidos/2026-11-20-onda-1-verificacao.md)). Falta ver o CI rodar no GitHub, no primeiro push da branch.

1. Biome para formatação e lint, com a reformatação inicial num commit isolado listado em `.git-blame-ignore-revs`.
2. Steiger ao lado de `scripts/check-architecture.mjs`. O script caseiro continua com o aviso de 300 linhas.
3. Vitest nas regras puras de `model/`, começando por `composition-side.ts`, `draft-order.ts` e `matchups.ts`.
4. `@axe-core/playwright` nos testes Playwright das telas principais, com as tags da WCAG 2.2 AA.
5. Lefthook: no `pre-commit`, Biome nos arquivos staged; no `pre-push`, `npm run check` e Vitest.
6. `.github/workflows/ci.yml` em todo push: `npm ci`, Biome, `npm run check`, `sincronizar-skills --check`, Vitest, build e Playwright.
7. Ganchos do Claude Code em `.claude/settings.json`: Biome no arquivo editado em `src/`, `tests/` ou `scripts/`, e Biome com `npm run check` antes de encerrar o turno.
8. Um módulo único que declara as chaves locais (`localStorage`) e seus formatos: `src/shared/config/storage-keys.ts`.
9. Investigar e corrigir `tests/team.spec.ts:397`. Passou com o commit de Táticas 9990e74.

**Pronta quando** um push com erro de tipo, de formatação ou de arquitetura falhar no CI, e o Playwright passar em todos os testes.

### Onda 2. Publicação e higiene

Dividida em duas partes. A **2a** (itens 3, 4 e 5) é aditiva e está implementada ([pedido](pedidos/2026-11-20-onda-2-higiene.md)). A **2b** (itens 1, 2 e 6) muda a publicação e depende do Bruno.

1. Deploy por artefato do Actions ([ADR 0003](decisoes/0003-publicacao-por-artefato.md)). Depende do Bruno mudar a fonte do Pages.
2. Tirar da `main` os HTMLs e o `assets/` gerados.
3. Knip para arquivos, exports e dependências sem uso, com as entradas dos quatro HTMLs e de `public/assets/*.js`.
4. Oxlint só com as regras que dependem de tipos (`no-floating-promises`, `no-misused-promises`).
5. `size-limit` com orçamento por entrada e `rollup-plugin-visualizer` sob demanda.
6. Apagar as branches remotas antigas, `.ua/knowledge-graph.json` e `src/components/examples/` (feito em 2026-11-20, por decisão do Fabiano, sem confirmação do Bruno).

**Pronta quando** o site publicar sem nenhum arquivo gerado no Git e o CI barrar um bundle acima do orçamento.

### Onda 3. Nomes e tipos da Área do time

1. Composição: `owner: "ours" | "enemy"` no código, convertendo o campo salvo `team: "mine" | "enemy"` na leitura e na escrita.
2. Adversária do draft: `enemyId` no código, mantendo `draft.rival` no formato salvo até a migração.
3. Bans fora de `lanes`, numa lista `bans` própria, com migração da chave `lol-comps-time-v1`.
4. Dividir `team-page.ts` por aba e remover o `@ts-nocheck`.
5. Campeões e posições como objetos tipados no lugar de `CH` e `LANES`.
6. Validação com Zod Mini (`zod/mini`) nas fronteiras que mudarem: `localStorage`, parâmetros da URL e conversores do Firestore.
7. Renomear arquivos em PascalCase para kebab-case.

Renomeações vão em commits próprios, sem mudança de comportamento, de preferência com `ts-morph`.

**Pronta quando** o glossário e o código usarem o mesmo termo na Área do time, `team-page.ts` não existir mais como arquivo único com `@ts-nocheck`, e uma composição salva no formato antigo abrir igual.

### Onda 4. Scripts clássicos para TypeScript

1. ~~Migrar `shell.js` e `sync.js` para slices em `src/`~~ (feito na Onda 4: `features/auth`, `shared/lib/team-changes`, `shared/api/firestore`).
2. Trocar as variáveis globais entre frames por um contrato tipado de mensagens.
3. Manter os nomes salvos do Firestore e as rotas.

**Pronta quando** `public/assets/` não tiver mais JavaScript de aplicação e login, troca de time, backup e sincronização passarem nos testes.

### Onda 5. Estilos

1. Levar os CSS globais de `public/assets/` para `src/`, junto dos slices que os usam.
2. Trocar as cores hexadecimais por tokens semânticos.
3. Ajustar espaçamentos e alturas à escala de 8 px, com ajustes de 4 px.

**Pronta quando** nenhum CSS de `src/` tiver cor hexadecimal fora do arquivo de tokens e as capturas das telas principais não mudarem sem intenção.

### Onda 6. Desempenho

1. Montar só a aba ativa da Área do time.
2. Carregar o mapa realista e o Excalidraw sob demanda.
3. Tirar os dados do Worlds do bundle e dar nomes legíveis às chaves de `worlds.json`.
4. Corrigir o `modulepreload` duplicado pelo `?v=hash`.
5. Apertar os orçamentos do `size-limit`.

**Pronta quando** cada rota baixar menos da metade do que baixa hoje, medido como na [auditoria de requisições](auditoria-requisicoes.md).

### Onda 7. Testes

1. Dividir `tests/tactical-map.spec.ts` por fluxo.
2. Cobrir com Vitest cada regra de `model/` tocada nas ondas 3 e 4.
3. Rodar axe em todas as telas.

**Pronta quando** nenhum arquivo de teste passar de 400 linhas e toda regra de `model/` tiver teste unitário.
