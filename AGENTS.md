# WebLol

O [catálogo de agentes e skills](docs/agentes.md) vale para Codex e Claude Code.

- O WebLol é destinado ao acesso pelo navegador no desktop. Projete e valide a interface para desktop. O celular está fora do escopo de suporte.
- Em relatos de bugs e pedidos de funcionalidades, use a descrição em linguagem comum para entender o resultado esperado e escolher a abordagem técnica. Se uma suposição fácil de reverter permitir avançar, siga e informe qual foi. Se a dúvida puder mudar de forma importante o que será entregue, faça uma pergunta com opções descritas em termos de como a pessoa usará o WebLol.

- Em mudanças de interface, use a skill [weblol-ui](.agents/skills/weblol-ui/SKILL.md). Reutilize os componentes e tokens do WebLol. Linhas e cards clicáveis devem ter cursor `pointer`, hover visível e foco por teclado.
- Em mudanças maiores, use agentes especializados quando a divisão ajudar e a sessão permitir. Em edições paralelas, atribua responsabilidades e arquivos distintos. Quem coordena a tarefa integra as mudanças e verifica o resultado.
- Em cards e linhas equivalentes, mantenha títulos, ícones, métricas e ações nas mesmas posições relativas. Valide o alinhamento com textos longos, quebra de linha e campos opcionais.
- Em páginas de detalhe, use o estilo compacto e sem borda de “Ver página” para voltar à lista, com o chevron à esquerda do rótulo.
- Trabalhe nos arquivos fonte em `src/` e `public/`. Os HTMLs e `assets/` da raiz são gerados para o GitHub Pages.
- Toda implementação no WebLol deve seguir a arquitetura Feature-Sliced Design. Consulte a skill [feature-sliced-design](.agents/skills/feature-sliced-design/SKILL.md) para decidir fronteiras entre módulos, organizar dependências ou migrar código. Respeite as responsabilidades das camadas, a direção dos imports e as APIs públicas dos slices, inclusive em correções pontuais.
- Faça commit ou push quando o usuário pedir a respectiva ação. Para publicar no GitHub Pages, use a skill [weblol-publicar](.agents/skills/weblol-publicar/SKILL.md).

## Processo

- Siga o [processo de desenvolvimento](docs/sdlc.md). No início de cada tarefa, use a skill [weblol-pedido](.agents/skills/weblol-pedido/SKILL.md) para classificar o tamanho (P, M ou G) e decidir se para antes de editar.
- Nomeie conceitos pelo [glossário](docs/glossario.md) e escreva código pelas [convenções](docs/convencoes.md). Chaves locais, campos salvos, coleções e rotas são contratos e só mudam com migração e ADR.
- Quando a pessoa corrigir uma entrega de um jeito que pode se repetir, ou escrever `regra:`, `termo:` ou `decisão:`, use a skill [weblol-padronizar](.agents/skills/weblol-padronizar/SKILL.md).
- Em entregas M e G, peça a verificação ao agente [change-verifier](docs/agentes/change-verifier.md) antes do resumo final.
- A [arquitetura](docs/arquitetura.md) explica as entradas, os iframes e as camadas. O [backlog de refatoração](docs/auditoria-codebase.md#backlog-por-ondas) diz o que vem a seguir.

## Design e acessibilidade

- Toda criação ou alteração de interface deve aplicar os princípios de Gestalt e atender aos critérios aplicáveis da [WCAG 2.2 nível AA](https://www.w3.org/TR/WCAG22/), do layout da tela ao espaçamento interno de cada controle.
- Na implementação e na revisão, siga a [seção de Gestalt e acessibilidade da skill weblol-ui](.agents/skills/weblol-ui/SKILL.md#gestalt-e-acessibilidade). Valide os componentes e estados afetados no fluxo real em desktop e registre o que conferiu.

## Organização do código

- Dê às funções nomes que indiquem a ação e seu alvo. Use `handle…` para eventos de interface. Separe regras e estado em `model`, renderização em `ui` e acesso a dados em módulos próprios. Em Composições, `createCompositionCopy` cria a cópia sem acessar o DOM ou o armazenamento, e `duplicateComposition` aplica a mudança na página.
- Mantenha componentes e funções no slice enquanto forem usados apenas por ele. Extraia para uma camada compartilhada quando houver consumidores reais com a mesma regra ou comportamento.
- Revise arquivos JS e TS das camadas FSD a partir de 300 linhas não vazias. Extraia responsabilidades que possam evoluir separadamente. Dados e arquivos gerados ficam fora dessa contagem.
- Evite introduzir `@ts-nocheck`. Ao refatorar código legado, tipifique os módulos extraídos e valide dados externos nas fronteiras que mudar, como parâmetros da URL e dados do armazenamento.
- Use `npm run check` para verificar a arquitetura e os tipos. O build também executa esse comando. O tamanho gera aviso, e dependências que violem a direção das camadas ou a API pública de outro slice fazem a verificação falhar.

## Admin e login

Toda mudança em login, contas, times, capitão ou Administração entra em `docs/historico-admin-login.md`, com o pedido, a decisão e o que mudou. Antes de uma mudança importante nessa área, pergunte ao Bruno e registre a escolha dele no mesmo arquivo.
