---
name: weblol-ui
description: Implemente ou ajuste a interface do WebLol, incluindo tabelas, cards, menus, filtros, tooltips e layouts responsivos, com validação visual no navegador.
---

# Ajustar a interface do WebLol

1. Localize a tela, a interação e os componentes existentes. Antes de implementar, consulte [OP.GG](https://op.gg/lol), [OP.GG Esports](https://esports.op.gg/), [Mobalytics](https://mobalytics.gg/lol) e [League of Graphs](https://www.leagueofgraphs.com/). Aproveite padrões relevantes de densidade, organização ou navegação dentro da identidade do WebLol.
2. Faça o ajuste na tela solicitada. Veja como a mudança afeta hierarquia, alinhamento e distribuição na página inteira. Agrupe informações relacionadas e alinhe cards de mesmo nível. Em menus flutuantes, preserve a interação interna e permita fechar por clique ou toque fora.
3. Confira a rota no navegador em desktop e celular. Exercite a ação alterada e, conforme a interação, verifique foco, teclado, toque e ausência de rolagem horizontal acidental. Para listas e filtros, inclua um estado vazio ou com dados escassos quando isso puder mudar o layout.
4. Rode `npm run build` e `git diff --check`. Informe o que mudou, como verificar localmente e qualquer limitação relevante da validação.
