---
name: weblol-ui
description: Implemente ou ajuste a interface do WebLol, incluindo tabelas, cards, menus, filtros, tooltips e layouts responsivos, com validação visual no navegador.
---

# Ajustar a interface do WebLol

1. Localize a tela, a interação e os componentes existentes. Antes de implementar, consulte [OP.GG](https://op.gg/lol), [OP.GG Esports](https://esports.op.gg/), [Mobalytics](https://mobalytics.gg/lol) e [League of Graphs](https://www.leagueofgraphs.com/). Aproveite padrões relevantes de densidade, organização ou navegação dentro da identidade do WebLol.
2. Aplique a regra dos 8 em toda criação ou alteração de UI, incluindo ajustes pequenos e todos os breakpoints envolvidos. Em menus flutuantes, preserve a interação interna e permita fechar por clique ou toque fora.
3. Confira a rota no navegador em desktop e celular. Compare o alinhamento dos cards equivalentes, a altura dos controles vizinhos e a separação entre grupos. Exercite a ação alterada e, conforme a interação, verifique foco, teclado, toque e ausência de rolagem horizontal acidental. Para listas e filtros, inclua um estado vazio ou com dados escassos quando isso puder mudar o layout.
4. Rode `npm run build` e `git diff --check`. Informe o que mudou, como verificar localmente e qualquer limitação relevante da validação.

## Regra dos 8

- Use múltiplos de 8 px como padrão para margens, padding, gaps e alturas de controles. Use subdivisões de 4 px para ajustes finos, mantendo todos esses valores na mesma escala. Reutilize os tokens de espaçamento e de componentes de [base.css](../../../public/assets/base.css) ao definir margens, padding, gaps e alturas. Quando o mesmo espaçamento cumprir um papel recorrente na tela e variar por breakpoint, atribua esse papel a um token da tela.
- Use distâncias menores dentro de um grupo e maiores entre grupos. Como ponto de partida, use 8 px entre título e descrição, 16 px de padding em cards compactos, 24 px em painéis padrão e 32 px entre seções. Ajuste a densidade conforme o conteúdo.
- Alinhe as bordas e o início do conteúdo em cards do mesmo nível. Reutilize as variantes de botão existentes e use a mesma altura para controles de função equivalente na mesma barra. Confira se as áreas de toque continuam confortáveis no celular.
- Ao compactar uma fase do draft, mantenha o alinhamento à esquerda usado nas demais fases para número, retrato e texto.
- Aplique a escala tanto aos valores novos quanto aos espaçamentos que alterar. Confira no diff se eles usam os tokens da escala. Tipografia, espessura de bordas e desenhos de ícones seguem seus próprios tokens.
- Use a **Visão geral do Worlds** como referência. Ela usa margens de 32 px no desktop e 16 px no celular, painéis de rankings alinhados no desktop e empilhados em telas estreitas. O CSS fica em [analytics.css](../../../public/assets/analytics.css).

- Em modais e painéis, alinhe o botão de fechar no canto superior direito, na mesma altura do cabeçalho. Reserve espaço horizontal para o controle e confira que ele não cria uma linha vazia acima do conteúdo em desktop ou celular.

## Bordas

- Nos retratos de campeões com indicador de lado no draft, use uma faixa sólida de 4 px na esquerda, reta e com pontas quadradas, cobrindo toda a altura do ícone. Use a cor do lado da equipe com a mesma intensidade em picks e bans.
