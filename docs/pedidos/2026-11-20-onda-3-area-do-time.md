# Onda 3: nomes e tipos da Área do time

- **Tamanho:** G
- **Situação:** concluído
- **Pedido por:** Fabiano
- **Data:** 2026-11-20

## Pedido

> comece a onda 3

Origem: [Onda 3 do backlog](../auditoria-codebase.md#onda-3-nomes-e-tipos-da-área-do-time).

**Resultado esperado:** quem mexe na Área do time encontra no código os mesmos termos do glossário (composição nossa ou adversária, bans, posição), com tipos checados pelo compilador, e quem já tem composições salvas continua abrindo todas iguais.

**Critérios de aceite**

- [x] O código da Área do time usa (o `kind: "ours" | "rival"` do `matchup-bar` e `session.side` seguem com `"rival"`, ver Onda 5) `owner: "ours" | "enemy"`, `enemyId` e `bans`, e os nomes antigos (`team: "mine"`, `rival`, `lanes.ban`) só aparecem nos conversores de leitura e escrita. Nomes locais ficam para a 3c; as classes CSS (`rival`, `mine`, `data-empty-rival`) ficam para a Onda 5 (estilos).
- [x] Uma composição salva no formato antigo (`lol-comps-time-v1`, com `team`, `draft.rival` e `lanes.ban`) abre igual: mesmos picks, bans, draft, adversária e notas.
- [x] Depois de salvar, o formato gravado segue legível pela versão anterior do site até a migração ser decidida (ver suposições).
- [x] O backup exportado e a importação de backups antigos continuam funcionando.
- [x] A sincronização com o Firestore (versão oficial, envios) não muda de formato.
- [x] `team-page.ts` deixa de ser um arquivo único com `@ts-nocheck`: dividido por responsabilidade (não por aba; Mapa e Conhecimento já eram widgets), cada parte tipada.
- [x] Campeões e posições são tipados (`CatalogChampion[]` em `CH`, `SLOT_INFO`); o nome `CH` permanece.
- [x] Os dados lidos de `localStorage`, dos parâmetros da URL e do Firestore passam por validação nas fronteiras alteradas, e dado inválido não derruba a tela.
- [x] `PrintSketch.tsx` e `TacticNotes.tsx` passam para kebab-case.
- [x] Os dois avisos de axe `label-content-name-mismatch` (picks do draft e seletores do confronto) deixam de ser aceitos em `tests/accessibility.spec.ts`.
- [x] `npm run verify`, `npm run build` e a suíte Playwright passam; Área do time conferida no navegador desktop com composição antiga, vazia e com nomes longos.

**Fora do escopo:** `sync.js` e `shell.js` (Onda 4), estilos (Onda 5), `worlds.json` posicional (Onda 6), mudança visual.

**Suposições:**

- O formato salvo muda só na leitura e na escrita, via conversor. Nome de chave e campo salvo só mudam com migração e ADR (convenções). O item 3 (bans em lista própria) é a única mudança de formato salvo; proponho migrar `lol-comps-time-v1` com leitura dos dois formatos e escrita só no novo, o que impede a versão anterior de ler composições gravadas depois.
- O Zod Mini (`zod/mini`) é dependência nova, então entra por ADR 0005.
- O trabalho de Táticas em andamento, que o backlog cita como pré-requisito, já está commitado: a árvore está limpa na `main`.

## Especificação

- **Telas e estados:** Área do time inteira. Estados: sem composições, composição só no formato antigo, composição adversária sem ligação, bans vazios, nomes longos de campeão e de composição, dado salvo corrompido.
- **Dados salvos:** `lol-comps-time-v1` (campos `team`, `draft.rival`, `lanes.ban`), backup exportado (`app: "lol-comps-time"`), parâmetros `#/time/composicoes/<id>?modo=`. Firestore só leitura de conversor, sem mudar formato.
- **Builds:** só o shell e a Área do time (`camp`). Worlds e SoloQ sem efeito.
- **Termos novos:** nenhum; o glossário já define `owner`, `enemyId`, `bans`, `position`.
- **Decisões:** ADR 0005 (Zod Mini e migração dos bans). Pedido de admin e login não é tocado; se aparecer mudança em login, times ou capitão, pergunto antes.

## Plano

Proposta de divisão, cada onda com PR próprio:

| Onda | Arquivos ou slices | Testes | Risco |
| --- | --- | --- | --- |
| 3a. Nomes sem mudar formato | `entities/composition`, `pages/team`: `owner`, `enemyId` com conversores; renomear arquivos PascalCase | Vitest dos conversores; Playwright da Área do time | Médio |
| 3b. Bans e validação | `bans` próprio e migração de `lol-comps-time-v1`; Zod Mini nas fronteiras; ADR 0005 | Vitest com fixtures do formato antigo e novo | Alto (dado salvo) |
| 3c. Dividir `team-page.ts` | uma parte por aba, sem `@ts-nocheck`; `CH` e `LANES` como objetos; axe 2.5.3 | Playwright, axe, `npm run check` | Alto (1.459 linhas) |

## Resultado

- **Mudou (3a):** `owner: "ours" | "enemy"` e `draft.enemyId` no código da Área do time; `composition-storage.ts` converte na leitura, no salvar, no backup e na importação, sem mudar o formato salvo; `print-sketch.tsx` e `tactic-notes.tsx` em kebab-case.
- **Verificado (3a):** `npm run verify`, `npm run build` e Playwright (42) passam; testes de ida e volta byte a byte; no navegador, composição antiga abre com a adversária ligada e continua gravada com `team` e `rival`.
- **Mudou (3b):** `Composition.bans: string[]` e `lanes` só com as cinco posições; `composition-storage.ts` lê `lanes.ban` como `bans` e grava de volta igual. Zod Mini (`saved-data.ts`) valida as composições do `localStorage`, a versão oficial guardada e o parâmetro `modo`; dado inválido é corrigido ou descartado sem derrubar a tela. ADR 0005.
- **Desvio do pedido:** o formato salvo **não** migrou. `lanes.ban` continua gravado, porque `public/assets/sync.js` (Onda 4) compara as composições por JSON e lê `lanes.*`; migrar agora quebraria a sincronização e a versão anterior do site. A migração fica para a Onda 4, com ADR própria.
- **Verificado (3b):** `npm run verify` (51 testes), `npm run build` e Playwright (42) passam; limite do pacote `camp` subiu de 35 para 40 kB por causa do Zod Mini (38,77 kB).
- **Mudou (3c-1):** `LANES` e `LN` viraram `SLOT_LIST` e `SLOT_INFO` tipados em `model/champion-slots.ts` (posições e bans). Os dois avisos de axe `label-content-name-mismatch` foram corrigidos e saíram de `tests/accessibility.spec.ts`: o pick agora se chama "First Pick Orianna · Mid", a grade de campeões e os seletores do confronto usam o próprio texto visível como nome (iniciais, tags e prévia ficam fora do nome com `aria-hidden`), e `team.spec.ts` acompanha os novos nomes.
- **Verificado (3c-1):** axe nas 8 telas sem aviso aceito, `npm run verify`, Playwright; pacote `camp` em 38,16 kB.
- **Mudou (3c-2):** `team-page.ts` (1.524 linhas, `@ts-nocheck`) virou 13 módulos tipados em `pages/team/ui/`: `team-store` (estado e utilitários), `team-session` (posição e lado em edição, ganchos para evitar import circular), `team-grid` (grade de campeões), `team-comps` (composições e confrontos), `team-editor` (Ordem do draft e Táticas), `team-drag` (arrastar e soltar), `team-matchups` (confrontos e gaveta de Táticas), `team-backup` e `team-restore` (exportar, importar e restaurar), `team-captain` (Gestão), `team-tactic-notes` e a página, que ficou com 236 linhas só com as abas, as rotas e a inicialização. O `CH` virou `CatalogChampion[]` com `DraftLane[]`. Nomes locais `rival` → `enemy`/`boardEnemy`, `handleRivalSelect` → `handleEnemySelect`, props do `matchup-bar` e `mine` em `team-matchups`.
- **Trava automática:** `npm run check` agora falha para arquivo novo com 300 linhas não vazias ou mais e para `@ts-nocheck` fora de `legacyNoCheckFiles`; os arquivos antigos (`legacyLongFiles`, `legacyNoCheckFiles` em `scripts/check-architecture.mjs`) só podem encolher. Regra registrada em `docs/convencoes.md` e `docs/arquitetura.md`.
- **Verificado (3c-2):** `npm run verify`, Playwright (42) e axe nas 8 telas passam; a trava reprova arquivo de teste com `@ts-nocheck` e com 306 linhas.
- **Fica para a Onda 5 (estilos):** as classes e atributos `rival`, `mine`, `us`, `data-empty-rival`, `data-choose-rival`, `.draft-rival-*` e o `.tx-group.mine` sem uso em `tactics.css`, os valores `"us" | "rival"` do lado do quadro e o `kind: "ours" | "rival"` do `matchup-bar`/`focusMatchup`, porque são usados em cerca de 60 seletores de 4 arquivos CSS e nos testes. O `.mine` do quadro significa "lado com composição", não dono, então a troca pede um nome novo e não só `ours`. Os arquivos com `@ts-nocheck` fora da Área do time (8, entre eles `tactical-map`, `knowledge` e `worlds`) seguem nas listas.
- **Regras registradas:** nenhuma na 3a.
