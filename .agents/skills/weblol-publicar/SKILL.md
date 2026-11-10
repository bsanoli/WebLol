---
name: weblol-publicar
description: Prepare a publicação do WebLol no GitHub Pages quando o usuário pedir commit e push, ou autorizar o envio das mudanças para a branch de publicação.
---

# Publicar o WebLol

O GitHub Pages serve a raiz de `main`, conforme o README. Cada mutação depende do pedido do usuário. Um pedido só de commit autoriza o commit. Um pedido de preparação autoriza as verificações e a geração dos arquivos.

1. Confira branch, remoto, histórico recente e diffs do índice e da árvore de trabalho. Identifique as mudanças da tarefa e preserve alterações locais de outros trabalhos, inclusive quando estão em um arquivo compartilhado.
2. Se houver alterações de aplicação, rode `npm run pages:prepare` com apenas o conteúdo destinado à publicação. O comando atualiza `index.html`, `camp.html`, `worlds.html` e `assets/` na raiz. Se houver mudanças de outra tarefa que seriam incorporadas ao build, gere em um checkout isolado ou separe os trechos com segurança e restaure a cópia local. Para alterações só de instruções ou documentação, confira o diff e dispense a regeneração dos arquivos estáticos.
3. Revise `git diff --cached` e rode `git diff --cached --check` antes de criar o commit. Envie a branch autorizada para o remoto verificado. Se o push for rejeitado, diagnostique a causa antes de tentar novamente e preserve o histórico do remoto.
4. Confirme o SHA no remoto e informe o commit, a validação executada e qualquer alteração local deixada fora. Trate o deploy do Pages como confirmado somente se tiver observado o resultado.
