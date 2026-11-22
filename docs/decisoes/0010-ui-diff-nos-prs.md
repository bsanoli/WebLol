# 0010. Mostrar o antes e depois das telas em cada PR com o ui-diff

- **Situação:** proposta
- **Data:** 2026-11-22
- **Decidido por:** Fabiano

## Contexto

A verificação visual de hoje é manual: a sessão confere a tela no navegador e descreve o que viu. O CI roda Playwright com axe, que pega erro de comportamento e de acessibilidade, mas não mostra o que mudou na aparência. Um PR de interface chega à revisão sem imagem do antes e do depois.

O [ui-diff](https://github.com/imuratalpay/ui-diff) captura as telas afetadas na base e no PR, compara os pixels, mede o que mudou nos elementos (padding, cor, tamanho) e posta um único comentário no PR.

## Decisão

- Um workflow novo, `.github/workflows/ui-diff.yml`, roda em todo PR do próprio repositório (fora rascunhos e forks) e mantém um comentário só, atualizado a cada push.
- O ui-diff é baixado na versão fixa por commit (`UI_DIFF_REF`). Não entra no repositório nem no `package.json`.
- A configuração fica em `ui-diff.config.json`. Captura em desktop 1440×900, relógio fixo, nas três páginas que o shell mostra em iframes: `/worlds.html`, `/soloq.html` e `/camp.html`. Cada rota lista os arquivos que a afetam, e `globalFiles` marca o que afeta todas.
- O repositório é público e o ui-diff recusa publicar imagens nele. O workflow usa `--allow-public-repo`, e as imagens ficam na branch órfã `ui-diff-assets`, visíveis a qualquer pessoa. Isso só é aceitável porque as rotas cobrem telas que o site já publica. Login e Administração (`index.html` com conta) ficam fora e não podem entrar na configuração sem nova decisão.
- A Área do time é capturada no estado vazio (sem `localStorage`), então o comentário mostra layout, não dados reais de um time.
- Táticas tem uma rota própria (`camp-taticas`). Como a página aberta sozinha começa na Ordem do draft, a rota abre Táticas por cliques (`actions`) e cria uma adversária de teste (`Adversária 1`), que só existe no navegador da captura. Assim o comentário mostra o cabeçalho, o bloco de notas e o quadro de Táticas.
- `detect.conventions` fica desligado. As pastas `src/pages/` do FSD não são rotas, e a convenção inventava caminhos como `/team/ui/tactics`. Só as rotas declaradas são capturadas.
- O comentário é informativo. Não bloqueia o merge, porque a mudança visual intencional é o caso normal de um PR de interface.
- No [processo](../sdlc.md), a etapa de revisão passa a incluir ler o comentário do ui-diff em PRs que mudam interface.

## Consequências

- O PR mostra o que mudou, com medidas, e a revisão deixa de depender só da descrição escrita pela sessão.
- Cada PR de interface ganha um job a mais no CI (o tempo será medido no primeiro PR) e uma branch `ui-diff-assets` com um único commit.
- Telas só alcançáveis por login, e dados reais de times, não são comparados.
- Atualizar o ui-diff é trocar o commit em `UI_DIFF_REF` depois de ler o CHANGELOG.
- Local: a ferramenta suporta macOS, Linux e WSL2. Este computador não tem WSL, então a conferência local fica fora até alguém instalá-lo. O CI cobre o caso.

## Alternativas consideradas

- **Comentário só com texto (`--no-upload`).** Mantém tudo privado, mas perde as imagens, que são o ponto da ferramenta.
- **Copiar a skill para `.claude/skills/`.** Obrigaria a sincronização e o Biome a lidar com código de terceiros. A versão fixa por commit dá o mesmo controle sem ruído.
- **Rodar só local.** Depende de WSL2 e de alguém lembrar de rodar. O CI roda sempre.
- **Tornar o resultado um check obrigatório.** Um diff visual intencional falharia o PR sem erro real.
