# Auditoria do codebase

Retrato do código e do fluxo de trabalho em 19/11/2026, feito para planejar a refatoração. Os números vêm de `git`, `grep`, `npm run check`, `npm run build` e dos testes Playwright. Cada onda do [backlog](#backlog-por-ondas) diz quando está pronta e como medir de novo.

Os termos seguem o [glossário](glossario.md). As regras novas estão em [convenções](convencoes.md), e o processo está em [SDLC](sdlc.md).

## Resumo

1. **O mesmo conceito tem vários nomes.** A composição adversária aparece como `rival`, `enemy` e `opponent`, a posição como `lane`, `role` e `DraftLane`, e a Área do time como `camp`, `time` e `team`.
2. **Não há verificação automática antes de publicar.** Não existe CI, lint, formatação nem teste unitário. Quase todos os commits vão direto para a `main`.
3. **O build gerado mora no Git.** 636 arquivos gerados estão versionados, e 142 dos 159 commits mexem neles.
4. **O código mais usado é o menos tipado.** Nove arquivos com `@ts-nocheck` somam 3.030 linhas, entre eles a página do time (883 linhas).
5. **Três sistemas de estilo convivem.** São 16 CSS globais em `public/assets/`, 5 CSS modules e Tailwind, com cores soltas fora dos tokens.
6. **As páginas carregam mais do que mostram.** A Área do time monta todas as abas e o mapa realista de 2 MB, e cada rota faz de 68 a 221 requisições.

## 1. Nomes

| Problema | Evidência | Onde corrigir |
| --- | --- | --- |
| Sinônimos para a composição adversária | `rival` (160 ocorrências), `enemy` (154), `opponent` (142, quase todas em Builds, com outro sentido) | Onda 3 |
| Lado da composição chamado `team` | `team: "mine" \| "enemy"` em `Composition`, `CompTeam` em `composition-side.ts`, enquanto `team` também é o grupo do WebLol | Onda 3 |
| Ban guardado como posição | `lanes: Record<"top" \| "jg" \| "mid" \| "adc" \| "sup" \| "ban", string[]>` | Onda 3 |
| Posição com três nomes | `lane`, `role`, `DraftLane`, `ROLES` e `LANES` | Onda 3 |
| Nomes de uma a três letras | 78 em `public/assets/sync.js`, 78 em `public/assets/shell.js`, 62 em `src/pages/team/ui/team-page.ts`. Em `entities/tactical-play`: `RN`, `TOKS`, `sw`, `PRE`, `cb`, `cr` | Ondas 3 e 4 |
| Dados em posições de texto ou array | campeões como `"Nome\|Id\|Roles"` (`CH`), `LANES` com `{k, n, c}`, `worlds.json` com chaves `st`, `s`, `g`, `b`, `r`, `bw`, `p` e arrays posicionais | Ondas 3 e 6 |
| Prefixos de chave local misturados | `lol-comps-time-v1` e chaves `weblol-…` | Onda 1 (registro) e Onda 3 (migração) |
| Arquivos e pastas fora do padrão | `PrintSketch.tsx` e `TacticNotes.tsx` em PascalCase, pastas com nome de fornecedor (`shared/ui/arc`, `shared/ui/reui`), scripts com nomes em dois idiomas | Onda 3 |

## 2. Documentação

- O README cita `src/data/ui-versions.ts`, mas o arquivo é `src/app/config/ui-versions.ts`. Também fala em três entradas, quando são quatro HTMLs em dois builds, e não lista os arquivos com `@ts-nocheck`. Corrigido nesta entrega.
- Antes desta entrega não havia glossário, documento de arquitetura nem registro de decisões.
- `.ua/knowledge-graph.json` está versionado e desatualizado.
- `src/components/examples/` está vazia.
- `src/app/config/ui-versions.ts` tem 502 linhas de histórico de versões da interface, misturado com configuração.

## 3. Tipos e tamanho

Arquivos com `@ts-nocheck` (linhas não vazias):

| Arquivo | Linhas |
| --- | ---: |
| `src/pages/team/ui/team-page.ts` | 883 |
| `src/pages/worlds-compositions/ui/compositions-page.ts` | 577 |
| `src/pages/builds/ui/builds-page.ts` | 497 |
| `src/widgets/tactical-map/ui/tactical-map.ts` | 417 |
| `src/widgets/analytics-tooltip/ui/tooltip.ts` | 217 |
| `src/pages/worlds-compositions/ui/match-card.ts` | 135 |
| `src/app/entrypoints/worlds.ts` | 118 |
| `src/widgets/team-knowledge/ui/knowledge.ts` | 117 |
| `src/pages/worlds-overview/ui/overview.ts` | 69 |

O `npm run check` avisa sobre arquivos acima de 300 linhas: `team-page` (883), `compositions-page` (577), `ui-versions` (502), `builds-page` (497), `site-header` (469), `tactical-map` (417) e `build-details` (364).

Os scripts clássicos `public/assets/shell.js` e `public/assets/sync.js` ficam fora do TypeScript e do FSD. Eles controlam login, troca de time, backup e a comunicação com os iframes por variáveis globais (`captainAccess`, `canManageTeam`, `TEAM_NAME`, `renderCaptainPanel`, `weblolImages`). Detalhes em [arquitetura](arquitetura.md#comunicação-entre-o-shell-e-os-iframes).

## 4. Estilos

- 16 arquivos CSS globais em `public/assets/`, 5 CSS modules em `src/` e classes Tailwind por cima.
- Cores hexadecimais fora dos tokens: `base.css` (105), `team.css` (58), `tactics.css` (10), `draft-layout.css` (9), `shell.css` (5) e `compositions.css` (5).
- Muitos espaçamentos não são múltiplos de 4 px, o que contraria a escala de 8 px da [skill weblol-ui](../.agents/skills/weblol-ui/SKILL.md).

## 5. Fluxo de trabalho

- **Publicação:** o Pages serve a raiz da `main`, e cada publicação versiona o build (632 arquivos em `assets/` e os 4 HTMLs). O `soloq.yml` diário faz `git reset --hard` e tenta o push até três vezes. Proposta em [ADR 0003](decisoes/0003-publicacao-por-artefato.md).
- **Verificação:** nenhum workflow roda `npm run check` ou testes. Não há lint, formatação nem teste unitário.
- **Revisão:** só 6 merges em 159 commits. Há branches remotas antigas: quatro `claude/project-thread-*` e `codex/revisao-ui`.
- **Agentes:** não há `.claude/settings.json`, então nenhum gancho roda depois das edições. A configuração dos agentes fica em três lugares (`docs/agentes/`, `.claude/agents/`, `.codex/agents/`). `node scripts/sincronizar-skills.mjs --check` falhava porque `grill-me` e `grilling` não tinham cópia em `.claude/skills/`. Corrigido nesta entrega.
- **Testes:** `tests/tactical-map.spec.ts` tem 1.125 linhas. Na linha de base, o Playwright passou em 33 de 34 testes. Falhou `tests/team.spec.ts:397` ("Táticas: monta picks na gaveta e arrasta uma adversária para criar o confronto"), que esperava o título "Nossa base x Time rival". A falha provavelmente vem do trabalho de Táticas ainda não commitado.

## 6. Desempenho

- `dist/` tem 27 MB e `dist-soloq/` tem 21 MB.
- O bundle do Worlds tem 1,98 MB porque inclui os dados.
- Os maiores chunks são o Excalidraw (1,8 MB, mais 1,06 MB no esboço de captura de tela), o Tiptap (440 KB), o cytoscape (441 KB) e o katex (258 KB). Os dois últimos vêm do `mermaid`, que o Excalidraw traz por `@excalidraw/mermaid-to-excalidraw`.
- A Área do time monta todas as abas ao abrir, inclusive o mapa realista de 2 MB.
- O `?v=hash` que o `prepare-pages.mjs` acrescenta aos ativos públicos duplica requisições de `modulepreload`.
- Cada rota faz de 68 a 221 requisições e baixa de 4,7 a 9,8 MB ([auditoria de requisições](auditoria-requisicoes.md)).

## Backlog por ondas

Cada onda é uma ou mais entregas M ou G com pedido em `docs/pedidos/`. As ondas 3 a 7 mexem nos arquivos da Área do time e começam depois que o trabalho de Táticas em andamento for commitado. As ferramentas e versões estão na [ADR 0004](decisoes/0004-ferramentas-de-qualidade.md).

### Onda 0. Processo e vocabulário

Esta entrega: [SDLC](sdlc.md), [glossário](glossario.md), [convenções](convencoes.md), [arquitetura](arquitetura.md), [revisão](revisao.md), ADRs 0001 a 0004, skills `weblol-pedido` e `weblol-padronizar`, agente `change-verifier`.

**Pronta quando** Fabiano e Bruno aceitarem as ADRs 0001, 0002 e 0004 ou pedirem mudanças.

### Onda 1. Verificação automática

1. Biome para formatação e lint, com a reformatação inicial num commit isolado listado em `.git-blame-ignore-revs`.
2. Steiger ao lado de `scripts/check-architecture.mjs`. O script caseiro continua com o aviso de 300 linhas.
3. Vitest nas regras puras de `model/`, começando por `composition-side.ts`, `draft-order.ts` e `matchups.ts`.
4. `@axe-core/playwright` nos testes Playwright das telas principais, com as tags da WCAG 2.2 AA.
5. Lefthook: no `pre-commit`, Biome nos arquivos staged; no `pre-push`, `npm run check`.
6. `.github/workflows/ci.yml` em push e pull request: `npm ci`, Biome, `npm run check`, Vitest, build, Playwright e `sincronizar-skills --check`.
7. Ganchos do Claude Code em `.claude/settings.json`: Biome no arquivo editado depois de cada edição em `src/`, e `npm run check` antes de encerrar o turno.
8. Um módulo único que declara as chaves locais (`localStorage`) e seus formatos.
9. Investigar e corrigir `tests/team.spec.ts:397`.

**Pronta quando** um push com erro de tipo, de formatação ou de arquitetura falhar no CI, e o Playwright passar em todos os testes.

### Onda 2. Publicação e higiene

1. Deploy por artefato do Actions ([ADR 0003](decisoes/0003-publicacao-por-artefato.md)). Depende do Bruno mudar a fonte do Pages.
2. Tirar da `main` os HTMLs e o `assets/` gerados.
3. Knip para arquivos, exports e dependências sem uso, com as entradas dos quatro HTMLs e de `public/assets/*.js`.
4. Oxlint só com as regras que dependem de tipos (`no-floating-promises`, `no-misused-promises`).
5. `size-limit` com orçamento por entrada e `rollup-plugin-visualizer` sob demanda.
6. Apagar as branches remotas antigas, `.ua/knowledge-graph.json` e `src/components/examples/`, depois de confirmar com o Bruno.

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

1. Migrar `shell.js` e `sync.js` para slices em `src/` (`features/auth`, `features/team-sync`, `shared/api/firestore`).
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
