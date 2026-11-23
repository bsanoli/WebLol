# Fechamento das Ondas 6 e 7

Tamanho: M. Pedido do Fabiano (22/11/2026): fechar as Ondas 6 e 7, incluindo o tipo único do resumo em `entities/`.

## Resultado esperado
As duas ondas aparecem como prontas na auditoria e nada que elas prometiam fica sem teste ou sem registro. O site se comporta igual.

## Entregue
- **Tipo único do resumo:** `TournamentSummary` e os tipos de partida, campeão, rota e jogador em `src/entities/match/model/summary.ts`, exportados pela API pública de `entities/match`. `@dataset/summary` passa a ter esse tipo (declaração em `src/vite-env.d.ts`), no lugar do tipo inferido do JSON; Builds e Composições usam os tipos nomeados.
- **Validação na fronteira:** `parseTournamentSummary` confere o formato e aponta o campo que saiu dele. Roda ao abrir as telas Worlds e SoloQ, e um teste confere os dois JSONs (`worlds.json` e `soloq/summary.json`), então o gerador não quebra o formato sem o CI avisar.
- **Rotas do Worlds sem amostra:** o tipo separa `SummaryLanePicks` (só `picks`, comum no Worlds) de `SummaryLaneSample`; antes o código assumia a amostra em toda rota.
- **Testes do roteador:** eventos dos iframes (`route-ready`, `load`, `weblol:navigate`), menu do topo (cliques com Ctrl, botão do meio, seção já aberta, erro de carga), botão voltar, copiar link (com e sem permissão da área de transferência), recarga da Área do time e o caminho do capitão (`router-events.test.ts`).
- **`adminUnlock`:** senha errada do cofre sobe o erro e nem tenta entrar no banco; senha do banco diferente da do cofre usa a do banco.
- **Glossário:** termo `encounter` e o motivo de o Knip ignorar `src/data/soloq/encounters.ts`.

## Fora, registrado como dívida
- Linhas de `lanes` e `matchups` continuam arrays posicionais (formato de dado publicado).
- `compGames` é número no Worlds e `[]` na SoloQ (o gerador `scripts/soloq.py` grava lista vazia) e nenhum código lê esse campo; ficou fora do tipo.
- `meta` da SoloQ passa a ser validado; linhas de confronto só têm as contagens conferidas (o filtro de 3 colunas fica em `build-matchups`).
- `tests-rules/` fora do `tsconfig`, porta 8080 fixa e JAR do emulador sem cache no CI.
