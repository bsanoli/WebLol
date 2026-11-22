# Triagem dos comentários do código

- **Tamanho:** G
- **Situação:** interpretação
- **Pedido por:** Fabiano
- **Data:** 2026-11-22

## Pedido

> Revisar todos os comentários do código e classificar cada um como tautologia, desculpa, desatualizado ou registro de decisão. Tautologia e desatualizado: apagar. Desculpa: apagar e abrir uma issue para corrigir a implementação. Registro de decisão: levar para uma ADR. Depois, criar uma regra de lint que proíba comentários, com catraca (nem todos saem neste PR), criar a skill `/delete-comment` para repetir o processo e estimar quantas linhas saem ao apagar todos.

**Resultado esperado:** quem mexe no WebLol encontra o porquê das decisões nas ADRs e em `docs/`, e o código novo não ganha comentários fora das exceções combinadas; os comentários que sobraram só diminuem.

**Critérios de aceite**

- [ ] Cada comentário de `src/`, `tests/`, `tests-rules/`, `scripts/` e das configs da raiz tem categoria registrada num inventário.
- [ ] Tautologias e desatualizados apagados; desculpas apagadas com issue aberta; registros de decisão levados para ADR ou para o documento da área em `docs/`.
- [ ] `npm run check` falha quando um arquivo ganha comentário novo e passa quando um arquivo perde comentários (catraca por arquivo, como `legacyLongFiles` em `scripts/check-architecture.mjs`).
- [ ] Skill `delete-comment` em `.agents/skills/` e espelhada em `.claude/skills/` pelo `scripts/sincronizar-skills.mjs`.
- [ ] `npm run verify` e `npm test` passam; nenhuma mudança de comportamento.

**Fora do escopo:** mudar comportamento do app; dados gerados em `src/data/`.

**Suposições:** ver a decisão pendente abaixo sobre o TSDoc exigido por `docs/convencoes.md`.

## Especificação (só G)

- **Telas e estados:** nenhuma tela muda.
- **Dados salvos:** nenhum.
- **Builds:** nenhum efeito no Worlds e no SoloQ.
- **Termos novos:** nenhum.
- **Decisões:** ADR 0011 (comentários no código), que altera a seção "Comentários e documentação" de `docs/convencoes.md`.

### Inventário inicial (2026-11-22)

| Medida | Valor |
| --- | --- |
| Arquivos analisados (TS, TSX, MJS, CSS, sem `src/data/`) | 315, 42.363 linhas |
| Comentários | 790 em 191 arquivos |
| Linhas ocupadas só por comentário | 841 (cerca de 2% do código) |
| TSDoc (`/** … */`) | 341, 392 linhas |
| Diretivas de ferramenta (`@vitest-environment`, `@vite-ignore`) | 6, ficam |
| Comentários em inglês (contra `docs/convencoes.md`) | cerca de 73 |
| Arquivos com mais comentários | `tactics.css` (45), `site-header.tsx` (29), `local-state.ts` (20), `team.css` (19), `storage-keys.ts` (18) |

## Plano

| Onda | Arquivos ou slices | Testes | Risco |
| --- | --- | --- | --- |
| 1 | ADR 0011, `convencoes.md`, catraca em `scripts/check-architecture.mjs` com a contagem atual por arquivo | `npm run check` | baixo |
| 2 | `shared`, `entities`, `app`, `scripts`, configs | `npm run verify` | baixo |
| 3 | `features`, `widgets` | `npm run verify`, `npm test` | baixo |
| 4 | `pages` (392 comentários, a maior parte em `pages/team`) | `npm run verify`, `npm test` | médio: muitos registros de decisão de Táticas e Ordem do draft vão para `docs/taticas.md` |
| 5 | Skill `delete-comment`, issues das desculpas, resultado | — | baixo |

## Resultado

- **Mudou:** …
- **Verificado:** …
- **Pendências:** …
- **Regras registradas:** …
