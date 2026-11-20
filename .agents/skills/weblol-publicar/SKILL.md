---
name: weblol-publicar
description: Prepare a publicação do WebLol no GitHub Pages quando o usuário pedir commit e push, ou autorizar o envio das mudanças para a branch de publicação.
---

# Publicar o WebLol

O GitHub Pages publica o artefato do workflow `deploy.yml`, que roda a cada push na `main`. Não há arquivos gerados para commitar. Cada mutação depende do pedido do usuário. Um pedido só de commit autoriza o commit. Um pedido de publicação autoriza as verificações, o commit e o push.

1. Confira branch, remoto, histórico recente e diffs do índice e da árvore de trabalho. Identifique as mudanças da tarefa e preserve alterações locais de outros trabalhos, inclusive quando estão em um arquivo compartilhado.
2. Se houver alterações de aplicação, rode `npm run build` para conferir que o site gera (opcionalmente `npm run pages:prepare`, que monta `_site/`, ignorado no Git). Inclua no commit só o conteúdo da tarefa; não existem HTMLs ou `assets/` gerados para versionar. Antes do push, se a branch local estiver atrás do remoto, faça `git pull`.
3. Revise `git diff --cached` e rode `git diff --cached --check` antes de criar o commit. Envie a branch autorizada para o remoto verificado. Se o push for rejeitado, diagnostique a causa antes de tentar novamente e preserve o histórico do remoto.
4. Confirme o SHA no remoto e informe o commit, a validação executada e qualquer alteração local deixada fora. Trate o deploy do Pages como confirmado somente se tiver observado o resultado do workflow Deploy na aba Actions (`gh run list --workflow=deploy.yml`) e, de preferência, o site público.
