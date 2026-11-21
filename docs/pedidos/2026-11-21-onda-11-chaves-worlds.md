# Onda 11: chaves legíveis no `summary` (worlds.json e soloq/summary.json)

Tamanho: G. Decisão do Fabiano (21/11/2026): migrar tudo de uma vez, sem camada de compatibilidade.

## Resultado esperado
Quem lê o código ou o JSON entende cada campo sem decifrar siglas (`st`, `s`, `g`, `b`, `r`, `bw`, `p`, `n`, `w`, `k`, `d`, `a`, `ch`, `mgames`). O site se comporta igual.

## Escopo
- Dado: `src/data/worlds.json` (Worlds) e `src/data/soloq/summary.json` (SoloQ), mesmo formato.
- Gerador: `scripts/soloq.py` (e `scripts/download-lol-assets.py` e `scripts/worlds-build-timeline.py`, que leem `comps`).
- Consumidores: páginas `builds`, `worlds-compositions`, `worlds-overview`, entrypoints `soloq.ts` e `worlds.ts`, e testes.
- Fora: tuplas posicionais (`p`, linhas de `matchups`) só viram objetos se o ganho de leitura compensar; decidir na etapa 1 medindo o tamanho antes e depois.

## Etapas
1. Inventário: listar cada chave e cada leitura (`grep`), definir o nome novo e registrar no glossário. Medir o peso do JSON com nomes longos (gzip).
2. Tipo único do summary em `entities/` (ou no slice dono) e validação na fronteira.
3. Gerador grava as chaves novas; converter `worlds.json` com script de uma vez (`scripts/` temporário, removido depois).
4. Migrar consumidores; o `tsc` aponta o que falta.
5. `npm run verify`, build, `size` e Playwright completo.

## Critérios de aceite
- Nenhuma sigla antiga no código, nos JSONs ou nos scripts (busca automática no PR).
- Listas e contagens iguais antes e depois (comparar os dados convertidos com o `HEAD`).
- Tamanho gzip do bundle dentro do orçamento do `size-limit`.
- Playwright e Vitest passam; telas de Composições e Visão geral conferidas no navegador.

## Riscos
- Chaves salvas pelo usuário ou rotas que usem as siglas: conferir antes (contratos só mudam com migração e ADR).

## Contexto: PR 29 já na main (Táticas)
O [PR 29](https://github.com/bsanoli/WebLol/pull/29) entrou em 21/11/2026 (19:19 UTC) e mexeu em Táticas: Draft e Lane com a mesma altura, barra única no topo do quadro, tag Confronto dourada, catálogo compacto e versão da interface 1.83. A branch da Onda 11 parte da main com ele.
- **Não perder:** o PR 29 alterou `src/pages/team/` (`local-state.ts`, `draft-board.ts`, `tactic-*`, `team-*`) e os testes de `tests/team-tactics.spec.ts`. O `comps` dessas telas é a composição salva do time, outro dado, e não entra na renomeação do summary. Ao trocar chaves, conferir esses arquivos e não alterá-los por engano.
- **Regra do Fabiano:** em Táticas, Draft e Lane ficam com abas semelhantes; divergir só perguntando antes (ver `docs/taticas.md`).
- **Conferência extra:** Playwright de `team-tactics` deve continuar passando, e a versão em `ui-versions.json` só muda se a Onda 11 alterar interface.

## Entregue
Renomeado em `worlds.json`, `soloq/summary.json`, `soloq.py`, `worlds-build-timeline.py` e nas telas:
- `comps`: `st`→`stage`, `s`→`series`, `g`→`game`, `b`→`blue`, `r`→`red`, `bw`→`blueWon`, `p`→`lanes`.
- `champs[].lanes`: `n`→`sampleGames`, `w`→`wins`, `k`/`d`/`a`→`avgKills`/`avgDeaths`/`avgAssists`.
- `players`: `n`→`games`, `w`→`wins`, `k`/`d`/`a`→`avg…`, `ch`→`champions`. Raiz: `mgames`→`compGames`.
- Decisão: as linhas de `lanes` e `matchups` continuam arrays posicionais (virar objeto aumentaria o JSON e mexeria em todas as colunas). A chave `series:game` dos drafts não mudou.
- Conferência: os dados convertidos, com as chaves de volta, são idênticos aos do `HEAD`. Bundle: Worlds 89,81 kB e SoloQ 205,13 kB gzip (antes 89,8 e 205,5).
- Não feito (fora dos critérios): tipo único do summary em `entities/` com validação na fronteira; os tipos seguem derivados de `typeof DATA`. Fica para a refatoração de tipos.
