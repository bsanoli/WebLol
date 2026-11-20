# Onda 2b: deploy por artefato do Actions

- **Tamanho:** G
- **Situação:** etapa 1 de 3 implementada (workflow e script), aguardando commit
- **Pedido por:** Fabiano
- **Data:** 2026-11-20

## Pedido

> Sim (a "começar a 2b já com o workflow, para você poder mandar a mensagem logo depois do merge?")

**Resultado esperado:** o site passa a ser publicado pelo GitHub Actions a partir do código-fonte, sem HTMLs e `assets/` gerados na `main` ([ADR 0003](../decisoes/0003-publicacao-por-artefato.md)).

**Etapas e critérios de aceite**

1. Workflow e script (esta entrega)
   - [x] `node scripts/prepare-pages.mjs --out=_site` monta o site numa pasta, sem tocar a raiz.
   - [x] Sem argumento, o script continua gravando na raiz, para a publicação atual não mudar.
   - [x] `.github/workflows/deploy.yml` com `workflow_dispatch` e `workflow_call`, sem disparo por push.
2. Troca da fonte (Bruno, depois do merge da etapa 1)
   - [ ] Settings › Pages › Source = GitHub Actions.
   - [ ] Rodar o deploy manualmente e conferir o site no endereço público.
3. Limpeza (depois da etapa 2)
   - [ ] `deploy.yml` passa a rodar no push da `main`.
   - [ ] Remover HTMLs e `assets/` da raiz do Git e pôr no `.gitignore`.
   - [ ] `soloq.yml` commita só `src/data/soloq/` e chama o deploy.
   - [ ] Skill `weblol-publicar`, README e `arquitetura.md` descrevem o fluxo novo.
   - [ ] Item 6 da Onda 2 (branches antigas, `.ua/knowledge-graph.json`, `src/components/examples/`), depois de confirmar com o Bruno.

**Suposições:**

- O deploy só roda sob demanda até o primeiro deploy ser conferido, porque com a fonte ainda em "Deploy from a branch" o `configure-pages` falharia a cada push.
- O Bruno é quem muda a configuração do Pages.

## Resultado

- **Mudou (etapa 1):** `scripts/prepare-pages.mjs` aceita `--out=`, `.github/workflows/deploy.yml`, `/_site/` no `.gitignore`, README e ADR 0003.
- **Verificado:** `npm run build` e `prepare-pages --out=_site` geram `index.html`, `camp.html`, `worlds.html`, `soloq.html` e 211 arquivos em `assets/`, com `?v=` nos ativos de `public/`. O workflow não rodou no GitHub.
- **Pendências:** etapas 2 e 3.
