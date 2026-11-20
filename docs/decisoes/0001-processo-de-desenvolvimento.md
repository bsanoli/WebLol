# 0001. Adotar um processo de desenvolvimento com tamanhos, portões e ciclo de padronização

- **Situação:** proposta
- **Data:** 2026-11-19
- **Decidido por:** Fabiano, Bruno (a confirmar)

## Contexto

Os pedidos chegam por mensagens curtas em sessões do Claude Code e do Codex. A interpretação, o plano e as correções ficavam só na conversa e se perdiam no fim da sessão. As mesmas correções voltavam em sessões seguintes. Exemplos:

- três nomes para a composição adversária (`rival`, `enemy`, `opponent`);
- `ban` guardado como se fosse uma posição;
- documentação que diverge do código, como o caminho de `ui-versions.ts` e as entradas do Vite no README.

Não há CI de verificação, e quase todos os commits vão direto para a `main`.

## Decisão

Adotar o processo descrito em [docs/sdlc.md](../sdlc.md):

- tamanhos P, M e G, com fluxo e artefato próprios;
- pedidos M e G registrados em `docs/pedidos/`, com interpretação, critérios de aceite, plano e resultado;
- portões humanos na interpretação (M e G), no plano (G) e na publicação;
- verificação em contexto novo pelo agente `change-verifier` em M e G;
- ciclo de padronização: cada correção vai para o glossário, as convenções, uma ADR, uma skill ou uma verificação automática, e uma regra violada duas vezes vira automação.

## Consequências

- Pedidos M e G ganham um arquivo a mais para manter. Em troca, qualquer sessão retoma o trabalho pelo arquivo.
- Pedidos P continuam tão rápidos quanto hoje.
- As regras passam a morar em `docs/` e nas skills, e o AGENTS.md fica curto.
- O processo só se sustenta com as verificações automáticas da Onda 1 ([ADR 0004](0004-ferramentas-de-qualidade.md)). Sem elas, as regras dependem só da atenção dos agentes.

## Alternativas consideradas

- **Spec Kit (GitHub), BMAD Method ou Agent OS:** trazem um fluxo completo de especificação, com papéis de produto, arquitetura e QA. São pesados para duas pessoas e geram muitos arquivos por funcionalidade. O Spec Kit também exige Python 3.11 e `uv`. Os modelos de pedido e ADR em `docs/` cobrem o que precisamos.
- **superpowers:** impõe brainstorming, plano, subagentes e TDD estrito em toda tarefa. O pedido P perderia a agilidade de hoje.
- **Manter como está:** as correções continuariam se perdendo entre sessões.
