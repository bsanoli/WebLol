# Onda 1: verificação automática

- **Tamanho:** G
- **Situação:** implementado, aguardando commit e o primeiro CI
- **Pedido por:** Fabiano
- **Data:** 2026-11-20

## Pedido

> Sim, Onda 1

Resposta à pergunta "Começo a Onda 1 (ferramentas de verificação) aqui?", depois da entrega da Onda 0 (processo, glossário, convenções, arquitetura e [auditoria](../auditoria-codebase.md#onda-1-verificação-automática)).

**Resultado esperado:** quem edita o WebLol, pessoa ou agente, recebe o erro de formatação, de lint, de tipo, de fronteira do FSD ou de acessibilidade na própria máquina e no CI, antes de a mudança chegar à `main`.

**Critérios de aceite**

- [ ] Um push com erro de tipo, de formatação ou de arquitetura falha no CI.
- [x] O Playwright passa em todos os testes, incluindo `tests/team.spec.ts:397`. 42 de 42.
- [x] `npm run check`, `npm run lint`, `npm run test:unit` e `npm run build` passam localmente.
- [x] O `pre-commit` roda o Biome nos arquivos staged e o `pre-push` roda `npm run check`.
- [x] Depois de uma edição em `src/`, o Claude Code recebe os erros do Biome daquele arquivo.
- [x] As telas principais passam no axe com as tags da WCAG 2.2 AA, ou as violações anteriores ficam listadas com o teste que as conhece.
- [x] As chaves locais (`localStorage`) e seus formatos estão declarados num módulo só.

**Fora do escopo:** renomear chaves locais ou campos salvos (Onda 3), deploy por artefato e remoção dos arquivos gerados (Onda 2), corrigir as violações de acessibilidade que o axe encontrar, a não ser as triviais.

**Suposições:**

- A Onda 1 entra na branch `onda-1-verificacao`, como manda o processo para G. Os commits só são criados quando o Fabiano pedir, em três partes: ferramentas, reformatação do Biome e `.git-blame-ignore-revs`.
- As regras do Biome que hoje acusam muitos erros começam como aviso e sobem para erro quando o código for corrigido.

## Especificação (só G)

- **Telas e estados:** nenhuma tela muda. O axe roda sobre as telas existentes.
- **Dados salvos:** nenhum formato muda. O registro de chaves só declara as chaves e os formatos já usados.
- **Builds:** nenhum efeito no Worlds e no SoloQ. O `npm run build` continua chamando `npm run check`.
- **Termos novos:** nenhum.
- **Decisões:** [ADR 0004](../decisoes/0004-ferramentas-de-qualidade.md).

## Plano

| Onda | Arquivos ou slices | Testes | Risco |
| --- | --- | --- | --- |
| 1a | `biome.json`, `package.json`, `.git-blame-ignore-revs` | `npm run lint` | A reformatação toca quase todos os arquivos de `src/` |
| 1b | `steiger.config.ts`, script `check:fsd` | `npm run check` | Regras do Steiger que discordam do `check-architecture` |
| 1c | `vitest.config.ts`, testes de `model/` | `npm run test:unit` | — |
| 1d | `tests/` com axe | `npm test` | Violações anteriores na interface |
| 1e | `lefthook.yml`, `.github/workflows/ci.yml`, `.claude/settings.json`, `scripts/hooks/` | Push de teste e edição de teste | Ganchos lentos ou quebrados no Windows |
| 1f | Registro das chaves locais em `shared/config` | `npm run check` | Imports novos entre camadas |
| 1g | `tests/team.spec.ts:397` | `npm test` | — |

## Resultado

- **Mudou:**
  - Biome 2.6.8 (`biome.jsonc`, `.gitattributes` com `eol=lf`), com a reformatação de `src/`, `tests/`, `scripts/` e `public/assets/*.{js,css}`.
  - Steiger 0.10.0 em `npm run check` (`steiger.config.ts`).
  - Vitest 5.1.1 com testes de `composition-side`, `draft-order`, `matchups` e do registro de chaves.
  - `tests/accessibility.spec.ts`: oito telas no axe com as tags da WCAG 2.2 AA e a lista `KNOWN_VIOLATIONS`.
  - Lefthook 2.2.2 (`lefthook.yml`), instalado pelo `npm install`.
  - `.github/workflows/ci.yml` e `playwright.config.ts` com `forbidOnly`, uma nova tentativa e o relatório `github` na CI. O `expect` espera até 10 s, porque a primeira tela do Worlds passava dos 5 s com os testes do axe em paralelo.
  - Ganchos do Claude Code em `.claude/settings.json` e `scripts/hooks/`.
  - Registro `src/shared/config/storage-keys.ts`, usado por `local-state`, `team-page`, `print-store`, `theme`, `map-cursor-color` e `champion-size`. `sync.js` e `shell.js` não usam o registro, porque são da área de login. Só foram reformatados, e o `biome.jsonc` os protege das correções automáticas. O teste do registro confere os nomes que eles usam.
  - Docs: ADR 0004, SDLC, convenções ("Verificação automática"), glossário, auditoria, README e a skill `weblol-padronizar`.
- **Verificado:** veja o resumo da entrega, com os comandos e os resultados.
- **Pendências:**
  - Ver o CI rodar no GitHub no primeiro push e conferir que um erro de tipo, de formatação ou de arquitetura falha a execução.
  - Corrigir os avisos listados na [auditoria](../auditoria-codebase.md#avisos-que-ainda-não-barram) nas ondas seguintes.
  - Pôr o hash do commit de reformatação em `.git-blame-ignore-revs` quando os commits forem criados.
- **Regras registradas:** chaves do `localStorage` só no registro, verificado por `storage-keys.test.ts` ([convenções](../convencoes.md#dados-e-tipos)). Política de avisos e de violações conhecidas do axe ([convenções](../convencoes.md#verificação-automática)).
