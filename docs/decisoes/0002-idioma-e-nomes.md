# 0002. Usar inglês no código, português na tela e um termo por conceito

- **Situação:** proposta
- **Data:** 2026-11-19
- **Decidido por:** Fabiano, Bruno (a confirmar)

## Contexto

O código mistura idiomas e sinônimos. Contagem em `src/` e `public/assets/` em 19/11/2026:

- composição adversária: `rival` (160 ocorrências), `enemy` (154) e `opponent` (142, a maior parte em Builds, com outro sentido);
- posição: `lane`, `role`, `DraftLane`, `ROLES` e `LANES`, com `ban` guardado como posição;
- Área do time: `camp`, `time` e `team`, enquanto `team` também nomeia o lado de uma composição (`team: "mine" | "enemy"`);
- coleções do Firestore em português (`times`, `membros`, `envios`), chaves locais com prefixos `lol-` e `weblol-`, rotas em português (`#/time/composicoes`);
- nomes de uma a três letras: 78 em `sync.js`, 78 em `shell.js` e 62 em `team-page.ts`, além de encodings posicionais como `"Aatrox|Aatrox|T"`.

## Decisão

1. Identificadores, tipos, arquivos e pastas em inglês. Textos da interface, documentação, comentários, testes e commits em português.
2. Cada conceito tem um termo, definido no [glossário](../glossario.md). Ex.: composição nossa e adversária viram `owner: "ours" | "enemy"`, a adversária do draft vira `enemyId`, posição vira `position` e rota física vira `lane`.
3. Nomes salvos (chaves locais, campos, coleções, rotas e parâmetros) são contratos. Continuam como estão até uma migração com ADR. A fronteira (`api` ou `model`) converte para o nome canônico.
4. O código legado é renomeado por ondas ([backlog](../auditoria-codebase.md#backlog-por-ondas)), em commits só de renomeação, nunca misturados com mudança de comportamento.

## Consequências

- Uma sessão nova encontra o mesmo nome na tela, no glossário e no código.
- Renomear a Área do time e os scripts clássicos exige várias ondas, com testes Playwright como rede de segurança.
- As rotas em português continuam, porque são links que as pessoas já usam.

## Alternativas consideradas

- **Português também no código:** conflita com as bibliotecas e com a maior parte do código atual, que já está em inglês.
- **Renomear tudo de uma vez:** um diff enorme que mistura renomeação com o trabalho em andamento e é difícil de revisar.
