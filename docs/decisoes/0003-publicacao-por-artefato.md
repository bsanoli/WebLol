# 0003. Publicar no GitHub Pages por artefato do GitHub Actions

- **Situação:** proposta. Depende do Bruno: o repositório `bsanoli/WebLol` é dele, e só quem tem permissão de admin muda a configuração do Pages. Fabiano tem permissão de escrita.
- **Data:** 2026-11-19
- **Decidido por:** Bruno, Fabiano (a confirmar)

## Contexto

O GitHub Pages serve a raiz da `main`. Para publicar, cada pessoa roda `npm run pages:prepare` e faz commit do build: `index.html`, `camp.html`, `worlds.html`, `soloq.html` e `assets/`. Os números em 19/11/2026:

- 636 arquivos gerados estão versionados na raiz (632 em `assets/` e os quatro HTMLs), e 142 dos 159 commits mexem neles;
- os diffs de revisão vêm cheios de bundles, e dois builds feitos em paralelo entram em conflito;
- o workflow diário `soloq.yml` faz `git reset --hard origin/main`, gera o site e tenta o push até três vezes, porque outras pessoas publicam na mesma branch;
- não há verificação automática antes de algo chegar ao site.

## Decisão

1. Um workflow `deploy.yml` roda em todo push na `main` e sob demanda:
   - `npm ci`;
   - `npm run build`, que já inclui o `npm run check`;
   - o `prepare-pages.mjs`, ajustado para gravar numa pasta `_site/` em vez da raiz;
   - `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5` e `actions/deploy-pages@v5`, com permissões `pages: write` e `id-token: write` e `concurrency: pages` sem cancelar a execução em andamento.
2. Em *Settings › Pages*, a fonte passa de "Deploy from a branch" para "GitHub Actions".
3. Os arquivos gerados saem do Git e entram no `.gitignore`.
4. O `soloq.yml` passa a commitar só `src/data/soloq/` e chama o deploy como workflow reutilizável (`workflow_call`). Push feito com o `GITHUB_TOKEN` não dispara outros workflows sozinho.
5. "publique" vira commit e push. O Actions faz o deploy, e a skill `weblol-publicar` acompanha a execução até o fim.
6. Opcional, depois que o CI existir: uma regra na `main` que exija o check `ci`, sem exigir aprovação, para que ninguém fique travado quando o outro estiver fora. O `soloq.yml` faz push direto na `main`. Se a regra também exigir pull request, o robô passa a gravar numa branch `data` ou a abrir PR com auto-merge.

## Consequências

- Os diffs mostram só o código-fonte, e acabam os conflitos em `assets/`.
- O site só muda se o build e o `npm run check` passarem no CI.
- O deploy fica reproduzível: sempre o mesmo Node, as mesmas dependências e um commit conhecido.
- Para voltar uma versão, basta reverter o commit ou rodar de novo o deploy de um commit anterior.
- O site depende do GitHub Actions estar no ar, o que é gratuito para repositório público.
- Na transição, o primeiro deploy por artefato precisa ser conferido no endereço público antes de apagar os arquivos da raiz.

## Alternativas consideradas

- **Manter a raiz da `main`:** os problemas de diff, conflito e falta de verificação continuam.
- **Branch `gh-pages` gerada pelo CI:** tira o build da `main`, mas mantém um histórico enorme de arquivos gerados e continua exigindo push.
