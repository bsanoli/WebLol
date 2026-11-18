---
name: weblol-ui
description: Implemente ou ajuste a interface do WebLol, incluindo tabelas, cards, menus, filtros, tooltips e layouts desktop, com validação visual no navegador.
---

# Ajustar a interface do WebLol

Localize a tela, a interação e os componentes existentes. Reutilize os padrões do WebLol e aplique a escala de espaçamento da seção abaixo. Em menus flutuantes, preserve a interação interna e permita fechar por clique fora.

Use [visual-review](../visual-review/SKILL.md) para conferir no navegador desktop os estados afetados. Escolha as verificações de código pelo impacto da mudança. Use o build quando houver impacto na compilação e os testes Playwright quando cobrirem comportamentos afetados. Revise o diff.

Quando a tarefa pedir uma direção visual ou comparação, OP.GG, OP.GG Esports, Mobalytics e League of Graphs podem servir de referência para densidade, organização ou navegação. Use recursos complementares de design e acessibilidade se ajudarem a resolver o pedido e estiverem disponíveis.

## Gestalt e acessibilidade

- **Proximidade e região comum.** Aproxime ícone e rótulo, campo e mensagem de erro, métrica e unidade. Use mais espaço entre grupos. Quando uma borda ou superfície delimitar um grupo visual, associe o título ao grupo também no HTML.
- **Semelhança e continuidade.** Use a mesma variante para ações equivalentes. Alinhe bordas, retratos, valores e ações nas linhas repetidas, inclusive com dados ausentes. Preserve a hierarquia da tarefa principal e faça a ordem de leitura no HTML acompanhar a ordem visual.
- **Semântica e estados.** Prefira botões, links, campos rotulados e cabeçalhos de tabela nativos. Inclua o rótulo visível no nome acessível e dê nome explícito a controles só com ícone. Comunique seleção, erros e mudanças de estado por texto ou ícone com significado e exponha o estado à tecnologia assistiva. Mantenha os dados de gráficos disponíveis em rótulos, texto ou tabelas.
- **Contraste e interação.** Conforme a [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/), confira 4,5:1 para texto comum, 3:1 para texto grande e 3:1 para componentes e gráficos quando exigido. Use áreas clicáveis de pelo menos 24 × 24 CSS px ou uma exceção prevista pelo critério. Permita uso por teclado com foco visível e sem obstrução, ofereça alternativa de ponteiro para ações de arrastar e respeite a preferência por movimento reduzido.
- **Validação.** Abra o fluxo em desktop e confira a tela inteira e as distâncias internas dos componentes alterados. Teste nomes longos, campos opcionais e estados vazios quando aplicáveis. Verifique que o conteúdo e as ações seguem disponíveis a 200% de zoom, confira o contraste nos temas afetados e valide nomes, estados e foco dos controles alterados no navegador.

## Área do Time → Composições

- Ao alterar a barra da composição, confira a troca entre **Opções por posição** e **Ordem do draft** nos dois sentidos. Nome, abas, copiar link e status de salvamento devem ficar no mesmo lugar.

## Regra dos 8

- Use múltiplos de 8 px como padrão para margens, padding, gaps e alturas de controles. Use subdivisões de 4 px para ajustes finos, mantendo todos esses valores na mesma escala. Reutilize os tokens de espaçamento e de componentes de [base.css](../../../public/assets/base.css) ao definir margens, padding, gaps e alturas. Quando o mesmo espaçamento cumprir um papel recorrente na tela e variar por breakpoint, atribua esse papel a um token da tela.
- Use distâncias menores dentro de um grupo e maiores entre grupos. Como ponto de partida, use 8 px entre título e descrição, 16 px de padding em cards compactos, 24 px em painéis padrão e 32 px entre seções. Ajuste a densidade conforme o conteúdo.
- Alinhe as bordas e o início do conteúdo em cards do mesmo nível. Reutilize as variantes de botão existentes e use a mesma altura para controles de função equivalente na mesma barra.
- Ao compactar uma fase do draft, mantenha o alinhamento à esquerda usado nas demais fases para número, retrato e texto.
- Aplique a escala tanto aos valores novos quanto aos espaçamentos que alterar. Confira no diff se eles usam os tokens da escala. Tipografia, espessura de bordas e desenhos de ícones seguem seus próprios tokens.
- Use a **Visão geral do Worlds** como referência para as margens de 32 px e o alinhamento dos painéis de rankings no desktop. O CSS fica em [analytics.css](../../../public/assets/analytics.css).

- Em modais e painéis, alinhe o botão de fechar no canto superior direito, na mesma altura do cabeçalho. Reserve espaço horizontal para o controle e confira que ele não cria uma linha vazia acima do conteúdo.

## Ações de detalhe em cards e linhas

- Em grades de cards equivalentes, alinhe título, ícone e métrica pelo topo das respectivas linhas. Deixe informações opcionais abaixo do conteúdo principal e confira a grade com nomes que quebram linha e cards com e sem nota.
- Em listas repetidas, dê ao link de histórico uma posição própria e consistente. Em **Compras jogo a jogo**, use o ícone de link externo em uma coluna fixa à direita do confronto, com nome acessível e indicação do destino.

- Use o “Ver página” da build expandida como referência para ações secundárias que abrem detalhes, ou que ocupam a mesma posição no fim do cabeçalho com função equivalente. Reutilize o botão `ghost` pequeno, alinhado à direita, com rótulo curto, ícone à direita, hover visível e foco por teclado.
- Use chevron para a direita quando a ação abre uma página ou modal de detalhes. Em expansões no próprio card, use um chevron vertical que indique o estado aberto ou fechado. Mantenha a hierarquia das ações primárias.

- Em páginas de detalhe com retorno à lista, siga o padrão visual de “Ver página”: botão `ghost` pequeno com hover visível e foco por teclado. Para voltar, coloque o chevron à esquerda do rótulo e alinhe a ação ao início da linha.

## Bordas

- Nos retratos de campeões com indicador de lado no draft, use uma faixa sólida de 4 px na esquerda, reta e com pontas quadradas, cobrindo toda a altura do ícone. Use a cor do lado da equipe com a mesma intensidade em picks e bans.
