# Onda 2a: higiene automática (Knip, Oxlint, size-limit)

- **Tamanho:** G
- **Situação:** concluído (Onda 2 pronta)
- **Pedido por:** Fabiano
- **Data:** 2026-11-20

## Pedido

> o merge ja entrou, pode commitar as mudanças no docs, fazer a prova 2. e começar a onda 2

**Resultado esperado:** o CI barra arquivo e dependência sem uso, promessa esquecida e bundle acima do orçamento, sem mudar nada que a pessoa vê no WebLol.

**Critérios de aceite**

- [x] `npm run knip` passa e acusa arquivo ou dependência sem uso.
- [x] `npm run lint:types` passa. Faz parte de `npm run check`.
- [x] `npm run size` passa com os orçamentos e falha acima deles.
- [x] `npm run analyze` gera `stats.html`.
- [ ] CI verde no GitHub com os dois passos novos.
- [ ] Um bundle acima do orçamento falha o CI (prova a fazer num push de teste).

**Fora do escopo (2b):** deploy por artefato, tirar HTMLs e `assets/` da `main`, apagar branches remotas, `.ua/knowledge-graph.json` e `src/components/examples/`. Corrigir os 14 exports e tipos sem uso que o Knip lista como aviso.

**Suposições:**

- Exports e tipos sem uso começam como aviso, como o débito da Onda 1.
- `src/shared/ui/**` fica fora das checagens de exports do Knip.
- Orçamento por entrada, só do arquivo de entrada de cada HTML (sem os chunks pré-carregados), em gzip.

## Especificação (só G)

- **Telas e estados:** nenhuma muda.
- **Dados salvos:** nenhum.
- **Builds:** só o modo novo `analyze`. Worlds e SoloQ sem mudança.
- **Termos novos:** nenhum.
- **Decisões:** [ADR 0004, Onda 2](../decisoes/0004-ferramentas-de-qualidade.md).

## Plano

| Parte | Arquivos | Testes | Risco |
| --- | --- | --- | --- |
| 2a-1 | `knip.json`, script `knip` | `npm run knip` | Falso positivo por entrada faltando |
| 2a-2 | `.oxlintrc.json`, `tactical-map.ts` | `npm run lint:types` | `void` esconder erro real (as duas animações já eram sem espera) |
| 2a-3 | `.size-limit.json`, `vite.config.ts` | `npm run size`, `npm run analyze` | Hash no nome dos arquivos (o glob usa `*`) |
| 2a-4 | `ci.yml`, `package.json`, docs | CI | — |

## Resultado

- **Mudou:** Knip, Oxlint com regras de tipos, size-limit e visualizer, ligados ao `check`, ao `verify` e ao CI. Dois `void` em `tactical-map.ts`.
- **Verificado:** Biome, `npm run check`, Knip, `npm run size` e Vitest passam localmente. Playwright e CI ainda não rodaram.
- **Pendências:** 2b. Corrigir os exports e tipos sem uso. Prova do CI barrando orçamento.
- **Regras registradas:** nenhuma nova.
