# Zerar os avisos do Biome

- **Tamanho:** M
- **Situação:** concluído
- **Pedido por:** Fabiano
- **Data:** 2026-11-21

## Pedido

> devemos usar o biome melhor, pois agora tem varios warnings, devemos corrigir todos eles

**Resultado esperado:** `npm run lint` termina sem avisos nem sugestões, e as regras que estavam rebaixadas para aviso voltam a barrar o commit, o push e o CI, para os avisos não voltarem.

**Critérios de aceite**

- [x] `npm run lint` mostra 0 avisos e 0 sugestões (eram 570 avisos e 51 sugestões em 2026-11-21).
- [x] As regras rebaixadas em `biome.jsonc` (seção "Débito anterior à Onda 1") voltam ao nível do preset, e `npm run lint` falha com qualquer aviso novo.
- [x] As telas continuam iguais em desktop: Área do time (Composições, Táticas, Draft, Lane), Builds, Worlds e SoloQ. A reordenação do CSS não muda nenhum estilo calculado.
- [x] `npm run verify`, o build e os testes Playwright passam.

**Fora do escopo:** mudanças de comportamento ou de visual, e os avisos do Knip.

**Suposições:**

- Nomes que são contrato (campos salvos no `localStorage` ou no Firestore, parâmetros da URL, ids e campos que vêm dos dados da Riot) ficam como estão. Onde a regra de nomes acusa um desses, a exceção fica num comentário `biome-ignore` com o motivo.
- O `!important` dentro de `prefers-reduced-motion` e o que vence estilos inline de bibliotecas ficam, sem `biome-ignore` por linha: um `override` em `biome.jsonc` desliga `noImportantStyles` só em `base.css` e `motion.css`, e os demais `!important` foram trocados por seletores mais específicos. Sem ele, a animação não desliga para quem pediu menos movimento.

## Plano

| Etapa | Arquivos | Verificação | Risco |
| --- | --- | --- | --- |
| 1. Correções automáticas (`useTemplate`, `noUnusedImports`, `useOptionalChain`, `useLiteralKeys`) | `src/`, `tests/`, `vite.config.ts` | Diff revisado, `npm run check` | Baixo |
| 2. `noNonNullAssertion`, nomes e regras pequenas | TS e TSX de `src/`, `tests/`, `scripts/` | `npm run check`, Vitest, Playwright | Médio: renomear booleanos em muitos arquivos |
| 3. CSS: `noDescendingSpecificity` e `noImportantStyles` | CSS de `src/` | Comparação dos estilos calculados antes e depois, nas telas principais | Médio: a ordem das regras muda a cascata |
| 4. Regras voltam a barrar | `biome.jsonc`, `package.json`, docs | `npm run lint` com aviso de teste falha | Baixo |

## Resultado

- **Mudou:** 0 avisos e 0 sugestões do Biome. Booleanos renomeados (`is/has/should/can`), `!` trocado por `requireElement`/`requireClosest` e checagens, `forEach` com retorno virou `for…of`, CSS reordenado sem mudar seletores (`!important` só em `base.css` e `motion.css`, via `override` central, sem `biome-ignore`). `biome.jsonc` sem rebaixamentos; `lint` e o CI usam `--error-on-warnings`. Quatro tetos de linhas em `scripts/check-architecture.mjs` subiram 1 ou 2 linhas (troca do `!`).
- **Verificado:** `biome check --error-on-warnings`, `npm run check`, `tsc`, 255 testes Vitest, build e 51 testes Playwright passam. Estilos calculados do CSS comparados antes e depois em 13 cenários de desktop (Worlds, Builds, Área do time, mapa tático): 0 diferenças. O Playwright pegou três renomes que estragaram atributos (`aria-current`, `aria-hidden`) e um `await`; corrigidos.
- **Pendências:** popover de confronto e diálogo do Excalidraw reais não foram abertos (cobertos por cópias de teste). Seletores CSS mortos (`comp-library`, `library-search`, `tmh`, `draft-comments`, `#notes`, `#dnote`, `plan-head`) ficam como sugestão de limpeza.
- **Regras registradas:** o Biome barra qualquer aviso; exceções só com `biome-ignore` e motivo.
