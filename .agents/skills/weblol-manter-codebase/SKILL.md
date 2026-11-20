---
name: weblol-manter-codebase
description: Faz manutenção incremental no WebLol quando o pedido envolve modularização, migração de código legado, duplicação ou fronteiras da arquitetura.
---

# Manter a codebase

Escolha um fluxo ou módulo cujo problema apareça no código atual. Comece pelo [backlog por ondas](../../../docs/auditoria-codebase.md#backlog-por-ondas) quando o pedido for `refatore` ou não apontar uma área. Use os nomes do [glossário](../../../docs/glossario.md) e faça renomeações em commits próprios, sem mudança de comportamento. Identifique os consumidores, pontos de entrada e comportamentos que o usuário já usa. Use a [skill de FSD](../feature-sliced-design/SKILL.md) para decidir onde cada responsabilidade fica.

Divida o trabalho em mudanças que possam ser validadas isoladamente quando isso ajudar. Use os avisos de tamanho e dependências como sinais para investigar. Extraia regras com responsabilidade própria ou reúna duplicações que tenham o mesmo contrato. Em migrações, confira rotas, parâmetros, formatos salvos e as entradas do Vite afetadas.

Rode `npm run check` e confira o diff. Use os testes Playwright relevantes quando houver risco de regressão de comportamento e rode o build quando a mudança afetar entradas, ativos ou a configuração do Vite. Se algum item identificado ficar pendente no escopo pedido, descreva o que falta e como verificar.
