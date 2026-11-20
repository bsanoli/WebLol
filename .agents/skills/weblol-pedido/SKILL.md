---
name: weblol-pedido
description: Interpreta um pedido do Fabiano ou do Bruno no WebLol, classifica o tamanho (P, M ou G), escreve o resultado esperado e os critérios de aceite com os termos do glossário e decide se para no portão antes de editar.
---

# Interpretar um pedido

Use no início de toda tarefa que muda o WebLol. O processo completo está em [docs/sdlc.md](../../../docs/sdlc.md).

## 1. Ler a mensagem

- Cada linha costuma ser um pedido. Trate todos e numere-os se forem mais de um.
- Reconheça os atalhos da [tabela "Como pedir"](../../../docs/sdlc.md#como-pedir): `pedido:`, `planeje`, `regra:`, `termo:`, `decisão:`, `revise`, `padronize`, `refatore`, `explique`, `onde paramos?`, `publique`.
- `regra:`, `termo:` e `decisão:` vão para a skill [weblol-padronizar](../weblol-padronizar/SKILL.md).
- A pessoa chama os elementos pelo texto da tela e às vezes cola a URL local. Abra a tela ou procure o texto no código antes de supor qual é o elemento.

## 2. Traduzir para resultado esperado

Escreva em uma frase como a pessoa vai usar o WebLol depois da mudança. Use os termos do [glossário](../../../docs/glossario.md). Se a mensagem usar um termo da tela que não está no glossário, proponha a entrada junto com a interpretação.

Escreva critérios de aceite que possam ser conferidos no navegador desktop ou num teste. Inclua os estados que a mudança afeta: vazio, texto longo, campo ausente, erro, sem permissão.

## 3. Classificar o tamanho

Responda na ordem e pare no primeiro "sim":

1. Toca dado salvo (chave local, campo, coleção do Firestore, rota ou parâmetro da URL), login, contas, times, capitão ou Administração, dependência nova, área ou aba nova, ou a arquitetura? **G.**
2. Muda comportamento visível, toca mais de um slice ou precisa de teste novo? **M.**
3. Caso contrário: **P.**

## 4. Decidir o portão

| Tamanho | O que fazer |
| --- | --- |
| P | Implemente. Informe a suposição no resumo final quando ela influenciar a entrega. |
| M | Crie `docs/pedidos/AAAA-MM-DD-assunto.md` a partir do [modelo](../../../docs/pedidos/_modelo.md) e preencha a seção "Pedido". Mostre a interpretação e espere a confirmação. Se a mensagem já autoriza a execução (`implemente`, `corrija`, `bora`) e nenhuma dúvida muda a entrega, registre a interpretação e siga. |
| G | Faça o mesmo que em M e preencha também a "Especificação". Proponha uma ADR quando houver decisão com alternativas. Pare sempre para aprovação e planeje no modo de planejamento, em ondas. |

`pedido:` para no portão em qualquer tamanho. `planeje` entrega só o plano.

Pedidos de admin e login: leia [historico-admin-login.md](../../../docs/historico-admin-login.md). Se a mudança for importante, pergunte ao Bruno antes e registre a escolha dele no mesmo arquivo.

## 5. Perguntar só o que muda a entrega

Avance com uma suposição fácil de reverter quando ela permitir. Pergunte quando interpretações plausíveis mudarem o que será entregue. Ofereça opções descritas pelo uso no WebLol, com a recomendada primeiro, e diga onde cada coisa fica na tela e como a pessoa interage com ela.

## Formato na conversa

```md
**Tamanho:** M (toca Composições e Ordem do draft)
**Resultado esperado:** …
**Critérios de aceite**
- …
**Fora do escopo:** …
**Suposições:** …
**Próximo passo:** espero a confirmação | sigo com a implementação
```

Ao concluir um pedido M ou G, preencha a seção "Resultado" do arquivo e marque a situação como "concluído".
