# 0009 · Confronto como item próprio

Data: 21/11/2026 · Status: aceita

## Contexto

O confronto morava dentro da comp nossa (`Composition.matchups[]`), e o lado do draft e a adversária aberta ficavam em `draft.side` e `draft.rival`. Isso impedia nome próprio, trocar as comps de um confronto, dois confrontos com o mesmo par e lados diferentes por confronto.

## Decisão

- O estado do time ganha a lista `matchups` na raiz: `{ id, name?, ours?, enemy?, side, updated }`. O `side` é o lado da nossa comp no draft.
- A tática do confronto continua com a chave `mx-<id>` (id preservado na migração).
- Migração idempotente (`withOwnMatchups`): leva `Composition.matchups[]`, `draft.side` e `draft.rival` para a lista e remove os campos antigos. Roda ao carregar, ao ler dados do time e ao importar backup.
- Nome opcional; sem nome o título é "Nossa x Adversária". Pares repetidos são permitidos.
- Excluir uma comp não apaga confrontos: eles ficam com aquele lado vazio, e o aviso lista quais.
- Soltar a nossa comp no lado da adversária inverte os lados, com aviso e **Desfazer**.
- A sincronização trata `matchup` como um tipo ao lado de comp, play e tática.

## Consequências

- Comp aberta sem confronto usa o lado azul.
- Backups antigos continuam importando; o formato novo traz `matchups`.
- Chave local e coleções não mudam de nome; só o formato dos dados.

## Limites conhecidos

- Na migração, um confronto embutido cuja adversária não existe mais é descartado (a tática `mx-<id>` fica sem confronto).
- Um capitão com a versão antiga do site publica sem `matchups`; o `publish` mantém os confrontos do oficial nesse caso.
