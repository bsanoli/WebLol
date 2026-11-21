# Testes de autenticação (`src/features/auth/model`)

Tamanho: G. Decisão do Fabiano (21/11/2026): primeiro PR só com doubles no Vitest, sem Java; o emulador do Firebase entra em um segundo PR.

## Resultado esperado
Os módulos de login sem teste (`membership`, `start`, `router`, `sync`, `admin-data`, `host-globals`, `session`) têm testes que pegam regressões de regra, sem tocar conta real nem publicar regras do Firestore.

## PR 1: doubles no Vitest
1. Mapear, por módulo, as dependências externas (Firebase Auth/Firestore, `localStorage`, `window.parent`) e criar doubles pequenos em um helper de teste do slice.
2. Escrever os testes na ordem de risco: `membership` (quem é capitão/membro), `router`, `sync`, `start`, `admin-data`, `host-globals`.
3. Cobrir casos de borda: sem sessão, sem time, capitão sem permissão, falha de rede.
4. `npm run verify` e registrar em `docs/historico-admin-login.md`.

## PR 2: emulador (depois que o Java estiver instalado)
`firebase-tools` como devDependency, regras lidas do arquivo do repositório e carregadas só no emulador; teste dos fluxos de gravação contra ele; job de CI com Java. Nunca publicar regras.

## Critérios de aceite
- Cada módulo do PR 1 tem testes de caminho feliz e de ao menos um erro.
- Nenhuma credencial ou conta real nos testes.
- `npm run verify` passa; registro no histórico de admin/login.
- Parar e avisar o Fabiano se a tarefa exigir a conta do Bruno ou publicar regras.
