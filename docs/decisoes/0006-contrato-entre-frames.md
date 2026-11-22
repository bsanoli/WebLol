# 0006. Contrato tipado entre o app principal e as telas em iframe

- **Situação:** aceita em 2026-11-20 (Onda 4a, [pedido](../pedidos/2026-11-20-onda-4-scripts-classicos.md))
- **Data:** 2026-11-20
- **Decidido por:** Fabiano (a 4c não depende de aprovação do Bruno)

## Contexto

- O app principal (`shell.js`, `sync.js`, hoje `features/auth`) e as telas em iframe (`camp`, `worlds`) conversavam por variáveis globais da janela pai, lidas com `as any` ou casts soltos em cada tela.
- Cada consumidor repetia a mesma proteção contra janela pai ausente ou bloqueada.

## Decisão

1. `src/shared/host-bridge/host-bridge.ts` é o único ponto em que uma tela em iframe fala com a janela pai: tipos `HostGlobals`, `HostImages`, `HostNavigation` e `FrameHandlers`, leitores com valor de reserva (`hasHostCaptainAccess`, `hostTeamName`, `hostImages`...), `navigateHost` para o evento `weblol:navigate` e `exposeFrameHandlers` para o que o app principal chama na tela.
2. Os nomes das globais não mudam nesta parte. Com a migração do `shell.js` e do `sync.js` (4b e 4c, feita), só cinco globais restam no `window` (`exposeHostGlobals`); o adaptador troca as globais por mensagens tipadas sem tocar nas telas.

3. Diferenças aceitas em relação ao código anterior: uma exceção síncrona de `renderCaptainPanel` agora é engolida pelo valor de reserva (sem log), e uma tela aberta sozinha usa direto o armazém local de prints, sem procurar `weblolImages` na própria janela.

## Consequências

- Melhora: um lugar só para tipos e proteção; as telas não conhecem mais o formato das globais.
- Piora: o contrato continua sendo as cinco globais por baixo.

## Alternativas consideradas

- **`postMessage` já nesta parte:** exigiria mexer no `shell.js` e no `sync.js` ao mesmo tempo; fica como evolução possível, já sem scripts clássicos.
