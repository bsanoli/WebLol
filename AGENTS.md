# WebLol

- O WebLol é destinado ao acesso pelo navegador no desktop. Projete e valide a interface para desktop. O celular está fora do escopo de suporte.

- Em mudanças de interface, use a skill [weblol-ui](.agents/skills/weblol-ui/SKILL.md). Reutilize os componentes e tokens do WebLol. Linhas e cards clicáveis devem ter cursor `pointer`, hover visível e foco por teclado.
- Em mudanças maiores de interface, delegue a subagentes as subtarefas independentes que puderem avançar em paralelo, como pesquisa de referências, levantamento de casos de borda e revisão de acessibilidade. Se houver edição em paralelo, atribua arquivos distintos a cada agente. O agente principal integra os resultados e conduz a implementação, os testes e a validação no navegador desktop até concluir o pedido.
- Em cards e linhas equivalentes, mantenha títulos, ícones, métricas e ações nas mesmas posições relativas. Valide o alinhamento com textos longos, quebra de linha e campos opcionais.
- Em páginas de detalhe, use o estilo compacto e sem borda de “Ver página” para voltar à lista, com o chevron à esquerda do rótulo.
- Trabalhe nos arquivos fonte em `src/` e `public/`. Os HTMLs e `assets/` da raiz são gerados para o GitHub Pages.
- Toda implementação no WebLol deve seguir a arquitetura Feature-Sliced Design. Use a skill [feature-sliced-design](.agents/skills/feature-sliced-design/SKILL.md) ao criar, alterar ou refatorar código. Respeite as responsabilidades das camadas, a direção dos imports e as APIs públicas dos slices, inclusive em correções pontuais.
- Faça commit ou push quando o usuário pedir a respectiva ação. Para publicar no GitHub Pages, use a skill [weblol-publicar](.agents/skills/weblol-publicar/SKILL.md).

## Organização do código

- Dê às funções nomes que indiquem a ação e seu alvo. Use `handle…` para eventos de interface. Separe regras e estado em `model`, renderização em `ui` e acesso a dados em módulos próprios. Em Composições, `createCompositionCopy` cria a cópia sem acessar o DOM ou o armazenamento, e `duplicateComposition` aplica a mudança na página.
- Mantenha componentes e funções no slice enquanto forem usados apenas por ele. Extraia para uma camada compartilhada quando houver consumidores reais com a mesma regra ou comportamento.
- Revise arquivos JS e TS das camadas FSD a partir de 300 linhas não vazias. Extraia responsabilidades que possam evoluir separadamente. Dados e arquivos gerados ficam fora dessa contagem.
- Evite introduzir `@ts-nocheck`. Ao refatorar código legado, tipifique os módulos extraídos e valide dados externos nas fronteiras que mudar, como parâmetros da URL e dados do armazenamento.
- Use `npm run check` para verificar a arquitetura e os tipos. O build também executa esse comando. O tamanho gera aviso, e dependências que violem a direção das camadas ou a API pública de outro slice fazem a verificação falhar.

## Admin e login

Toda mudança em login, contas, times, capitão ou Administração entra em `docs/historico-admin-login.md`, com o pedido, a decisão e o que mudou. Antes de uma mudança importante nessa área, pergunte ao Bruno e registre a escolha dele no mesmo arquivo.
