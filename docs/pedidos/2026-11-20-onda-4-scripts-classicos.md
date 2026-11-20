# Onda 4: scripts clássicos para TypeScript

- **Tamanho:** G
- **Situação:** em andamento (4a, 4b e 4c mergeadas (PR #14); 4d em andamento)
- **Pedido por:** Fabiano
- **Data:** 2026-11-20

## Pedido

> siga para a proxima onda

Origem: [Onda 4 do backlog](../auditoria-codebase.md#onda-4-scripts-clássicos-para-typescript).

**Resultado esperado:** quem mexe em login, troca de time, backup e sincronização encontra o código em `src/`, tipado e testado, e quem usa o site não percebe nenhuma diferença: mesmas contas, mesmos times, mesmas composições e mesmas rotas.

**Critérios de aceite**

- [ ] `public/assets/` não tem mais JavaScript de aplicação (`shell.js` e `sync.js` migrados para `src/`).
- [ ] Os nomes salvos do Firestore (coleções, campos) e as rotas não mudam.
- [ ] As variáveis globais entre frames (`window.captainAccess`, `canManageTeam`, `renderCaptainPanel`, `weblolImages`, `applyWebLolRoute`, `weblolTeamChanged` e outras) viram um contrato tipado de mensagens.
- [ ] Login, criação de conta, troca de time, capitão, backup e envio de mudanças funcionam como antes, no navegador desktop.
- [ ] Os conversores `lol-comps-time-v1` ↔ código ficam num lugar só (a migração dos bans, adiada na 3b, é decidida aqui).
- [ ] `npm run verify`, `npm run build` e a suíte Playwright passam; o limite de tamanho dos pacotes continua cumprido.

**Fora do escopo:** estilos (Onda 5), desempenho e `worlds.json` (Onda 6), mudança visual, mudança de regras do Firestore.

**Suposições:**

- O `shell.js` (1.437 linhas) e o `sync.js` (779 linhas) são grandes e acoplados por globais; por isso a onda se divide em partes com PR próprio (ver Plano).
- Esta onda toca login, contas, times e capitão, mas só move código e mantém nomes salvos e comportamento. Por decisão do Fabiano (20/11/2026), nenhuma aprovação passa pelo Bruno, a não ser que a tarefa exija mexer na conta dele (senha, conta admin) ou publicar regras do Firestore. Cada parte entra em `docs/historico-admin-login.md` como registro.

## Especificação

- **Telas e estados:** login, criação de conta, troca de time, Gestão do time, Administração, botão de envio, status de sincronização, imagens pendentes. Estados: sem conta, sem time, offline, envio pendente, erro do Firestore.
- **Dados salvos:** nenhum formato muda. Firestore: contas, times, membros, `times/{id}/dados`, `times/{id}/envios`.
- **Builds:** shell (`index`) e `camp`; o contrato entre frames atravessa os dois.
- **Decisões:** ADR 0006 (contrato tipado entre frames e destino de `lol-comps-time-v1`), decidido pelo Fabiano.

## Plano

| Parte | Escopo | Testes | Risco |
| --- | --- | --- | --- |
| 4a. Contrato entre frames | tipos das mensagens e adaptador; as globais continuam funcionando por baixo | Playwright de login e Gestão | Médio |
| 4b. `sync.js` → `features/team-sync` e `shared/api/firestore` | sincronização, envios, imagens | Vitest dos conversores e do diff; Playwright | Alto |
| 4c. `shell.js` → `features/auth` e o shell | login, contas, navegação, Administração | Playwright; axe | Alto |
| 4d. Limpeza | remover as globais e `public/assets/*.js`; decidir a migração dos bans | verify, build, Playwright | Médio |

## Resultado

- **Mudou (4a):** `src/shared/api/host-bridge.ts` reúne os tipos (`HostGlobals`, `HostImages`, `HostNavigation`, `FrameHandlers`) e os leitores com valor de reserva que as telas em iframe usam para falar com a janela pai. `team-captain`, `team-send-button`, `print-store`, `team-page` e `builds-page` deixaram de ler globais com casts soltos. As globais do `shell.js` e do `sync.js` não mudaram. ADR 0006.
- **Verificado (4a):** typecheck, `npm run verify` (57 testes, 5 novos do adaptador), build e Playwright (42).
- **Mudou (4b, parte 1):** o `sync.js` e o `shell.js` compartilham variáveis globais mutáveis (`TEAM`, `MEMB`, `ADMIN`, `KEYS`, `FB`, `pendingId`: 60 nomes do sync usados no shell e 11 do shell usados no sync), então o `sync.js` não migra inteiro sem a 4c. Saíram dele os blocos sem estado: `shared/config/admins.ts`, `shared/lib/account-id.ts`, `shared/api/local-keys.ts` (IndexedDB) e `shared/lib/admin-crypto.ts` (Web Crypto), todos tipados e com 7 testes novos (cripto ida e volta, senha errada, fechadura de admin extra, envelope e assinatura). `app/classic-globals.ts` expõe esses nomes no `window` antes de os scripts clássicos carregarem, e o `sync.js` perdeu 113 linhas. Formatos gravados e Firestore não mudaram.
- **Mudou (4b, parte 2):** `shared/api/firestore.ts` (cliente do Firestore: `fb`, `dbGet`, `dbSet`, `dbList`, `dbDel`, `getJ`, `putJ`; a sessão `FB` chega ao `shell.js` por um getter no `window`) e `features/team-sync` (`diff`, `applyChanges`, `describe`, `itemName`, `shared`, `hsh`), com 8 testes novos sobre o formato salvo (`team`, `draft.rival`, `lanes.*`). O `sync.js` caiu de 779 para cerca de 500 linhas. Coleções, campos e hash das alterações não mudaram.
- **Verificado (4b, partes 1 e 2):** typecheck, `npm run verify` (72 testes), build e Playwright (42). Login real de admin com a senha e envio real ao Firestore não foram exercitados no navegador; o change-verifier aprovou só a parte 1.
- **Pendente (4b):** imagens e a sincronização com estado compartilhado (`TEAM`, `MEMB`, `OFF`, "Ver como", envios); ficam para junto da 4c, que dá o dono do estado (`features/auth`).
- **Mudou (4b parte 3 e 4c):** `features/auth` (`model`: sessão, identidade, adesão ao time, sincronização, imagens, rota, partida; `ui`: login, passo do time, status, Administração) passou a ser dono do estado (`TEAM`, `MEMB`, `OFF`, `ADMIN`, `KEYS`, `FB`). A regra de alterações do time foi para `shared/lib/team-changes.ts`, porque uma feature não importa de outra. `public/assets/sync.js`, `public/assets/shell.js` e `app/classic-globals.ts` foram removidos: `public/assets` não tem mais JavaScript. No `window` ficam só cinco nomes que os iframes leem (`captainAccess`, `canManageTeam`, `TEAM_NAME`, `renderCaptainPanel`, `weblolImages`), definidos em `shared/api/host-bridge.ts`. Coleções, campos, chaves locais, IndexedDB e rotas não mudaram.
- **Revisão (change-verifier):** corrigidos o duplo clique nos botões do capitão, o `fb()` fora do `try` na senha de login e o `teamPath` sem time ativo (agora lança erro). Ficam para a 4d: dependências `model → ui` em `model/sync.ts`, validação dos dados externos em `admin-data.ts` e `migrate.ts`, e exports sem uso no Knip.
- **Verificado (4c):** `npm run check`, Knip, Vitest (72), build e Playwright (42). No navegador: troca entre as rotas worlds, builds, composicoes, time e admin, redirecionamento de visitante da Administração para o time, abertura do diálogo de login e "Entrar sem usuário". **Não exercitado:** login real com Riot ID e senha, login de admin, envio ao Firestore e Administração logada.
- **Mudou (4d, parte 1):** `features/auth/model/sync.ts` não importa mais de `ui/`: pede a tela por `model/ui-hooks.ts`, ligado em `startPanel`. `model/external-data.ts` valida com Zod Mini a versão oficial e os envios vindos do Firestore (`parseOfficial`, `parseSubmission`), com 4 testes; envio inválido aparece como quebrado na Administração, e a migração não sobrescreve uma versão oficial ilegível. Exports sem uso no Knip removidos (Knip limpo).
- **Mudou (4d, parte 2):** os `@ts-nocheck` restantes saíram (`builds-page`, `compositions-page`, `match-card`, `overview`, `knowledge`, `tooltip`, `tactical-map`, `map-drawing`/`map-tools`), e `legacyNoCheckFiles` ficou vazio. Para caber nos limites de linhas, saíram `position-filter.ts` e `build-options.ts` (Builds), `comp-picker.ts` (Composições) e `map-session.ts`, `step-markup.ts` e `map-image.ts` (mapa tático). `app/entrypoints/worlds.ts` não usa mais `frameElement` nem `applyWebLolRoute`: fala com a janela pai por mensagens tipadas de `host-bridge.ts`. Detalhe visível: o botão de editar passo do mapa agora começa com `aria-pressed="false"` em vez de `"undefined"`.
- **Verificado (4d, parte 2):** `npm run verify` (76 testes), typecheck, build, `npm run size` (Shell 83,87 kB de 90) e Playwright (42). **Não exercitado:** login real, login de admin, envio ao Firestore e Administração logada.
- **Limpeza junto (Knip):** saíram `initializeMotionNav` (`shared/lib/motion.ts`), `LC` (`entities/match/ui/display.ts`) e o tipo `StorageKey`, todos sem uso.
- **Revisão (change-verifier, 4d parte 2):** sem bloqueios. Dívida registrada: casts duplos na fronteira com `entities/tactical-play` (`newPlay`, `asFramePositions`, `ensureTeamPlays`) e em `match-card.ts` (`DRAFTS`); o helper `$` assume que o elemento existe; `frameElement` ainda é usado em `team-page.ts` e `theme.ts`. Sem testes novos para `stepStatus`, `stepListMarkup`, `toLane` e `host-bridge`.
- **Mudou (4d, bans, etapa 1):** ADR 0007 (decidida pelo Fabiano: migrar em duas etapas). O site lê `lanes.ban` e `bans` e continua gravando `lanes.ban`; `team-changes` compara e descreve os dois formatos como o mesmo dado. 4 testes novos.
- **Pendente (4d, bans, etapa 2):** gravar `bans` na raiz, em publicação própria, depois que todos estiverem na etapa 1.
