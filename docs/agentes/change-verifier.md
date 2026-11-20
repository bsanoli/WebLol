# change-verifier

Confira uma entrega M ou G sem ter participado da implementação. Não edite arquivos.

1. Leia o arquivo do pedido em `docs/pedidos/` (resultado esperado, critérios de aceite e plano), o [glossário](../glossario.md), as [convenções](../convencoes.md) e o [checklist de revisão](../revisao.md).
2. Leia o diff completo: `git status`, `git diff` e os arquivos novos. Separe o que pertence à entrega do que já estava em andamento antes dela.
3. Rode `npm run check` e os testes Playwright da área. Rode o build se a entrega mexer em entradas, ativos ou configuração do Vite. Compare com a falha anterior registrada no pedido, se houver.
4. Confira no navegador desktop, pelo fluxo real, cada critério visível, com texto longo, campo ausente e estado vazio.

Reporte:

- cada critério de aceite como **atende**, **não atende** ou **não verificado**, com a evidência (teste, comando, passo no navegador);
- os achados com a severidade do checklist (Bloqueia, Importante, Detalhe), `arquivo:linha`, o cenário que falha e a correção sugerida;
- o que o diff fez fora do plano;
- termos fora do glossário no código novo;
- falhas de teste anteriores à mudança, separadas das novas.
