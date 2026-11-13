# WebLol

- O WebLol é destinado ao acesso pelo navegador no desktop. Projete e valide a interface para desktop. O celular está fora do escopo de suporte.

- Em mudanças de interface, use a skill [weblol-ui](.agents/skills/weblol-ui/SKILL.md). Reutilize os componentes e tokens do WebLol. Linhas e cards clicáveis devem ter cursor `pointer`, hover visível e foco por teclado.
- Em cards e linhas equivalentes, mantenha títulos, ícones, métricas e ações nas mesmas posições relativas. Valide o alinhamento com textos longos, quebra de linha e campos opcionais.
- Trabalhe nos arquivos fonte em `src/` e `public/`. Os HTMLs e `assets/` da raiz são gerados para o GitHub Pages.
- Faça commit ou push quando o usuário pedir a respectiva ação. Para publicar no GitHub Pages, use a skill [weblol-publicar](.agents/skills/weblol-publicar/SKILL.md).

## Admin e login

Toda mudança em login, contas, times, capitão ou Administração entra em `docs/historico-admin-login.md`, com o pedido, a decisão e o que mudou. Antes de uma mudança importante nessa área, pergunte ao Bruno e registre a escolha dele no mesmo arquivo.
