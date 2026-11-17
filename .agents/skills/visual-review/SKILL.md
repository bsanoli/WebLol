---
name: visual-review
description: Revisa a interface desktop do WebLol e valida visualmente alterações de layout, estilos ou componentes.
---

# Revisar a interface

Use a rota e os dados representativos do fluxo para inspecionar a área afetada no navegador disponível. Se precisar iniciar o projeto, use `npm run dev`. Para a entrada SoloQ isolada, use `npm run dev:soloq`. O Playwright do projeto também pode abrir o site local.

Escolha larguras desktop pertinentes ao layout, incluindo janelas mais estreitas se a área mudar de comportamento. Observe a tela inteira e o efeito da mudança nos elementos vizinhos. Confira hierarquia, legibilidade, alinhamento, contraste, densidade e overflow. Exercite os estados que afetam a tarefa, como filtro, expansão, teclado, foco, nomes longos e campos opcionais.

Em revisão, descreva a evidência, o impacto e uma correção para cada achado relevante. Em implementação, corrija regressões no escopo e repita as verificações afetadas. Relate as rotas, estados e larguras conferidos e indique se a análise ficou restrita ao código ou a capturas.
