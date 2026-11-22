# Checklist de revisão

Use este checklist ao revisar um diff, ao pedir `revise` ou quando o agente [change-verifier](agentes/change-verifier.md) confere uma entrega. Cada achado tem uma severidade, o arquivo e a linha, o cenário em que falha e a correção sugerida.

## Severidades

| Severidade | Significa | Exemplos |
| --- | --- | --- |
| **Bloqueia** | Não publique antes de corrigir. | Erro ou regressão no fluxo, perda de dado salvo, contrato salvo alterado sem migração, chave de API no diff, regra do Firestore afrouxada, import que viola o FSD, `npm run check` falhando |
| **Importante** | Corrija nesta entrega, a menos que a pessoa decida adiar. | Termo fora do glossário em código novo, convenção violada, regra nova sem teste, critério WCAG 2.2 AA não atendido, rota mais pesada sem motivo, documentação da área desatualizada |
| **Detalhe** | Opcional. Junte vários num ajuste só. | Nome melhor em código legado que a mudança tocou de leve, comentário que repete o código, ordem de imports |

Não reporte como achado o que o lint, o formatador ou o `npm run check` já apontam. Rode as ferramentas e cite só o resultado.

## O que conferir

**Pedido**
- Cada critério de aceite tem evidência: teste, captura ou passo conferido no navegador.
- O diff não faz nada além do pedido, ou a mudança extra está explicada no resumo.

**Dados e contratos**
- Chaves de armazenamento, campos salvos, coleções do Firestore, rotas e parâmetros da URL continuam compatíveis, ou há migração com teste e ADR.
- Dados externos são validados na fronteira tocada.
- Mudanças em login, contas, times, capitão ou Administração estão em `docs/historico-admin-login.md`, com a escolha do Bruno quando foi importante.

**Arquitetura**
- Imports respeitam as camadas e as APIs públicas.
- Regra em `model`, renderização em `ui`, acesso a dados em `api`.
- Nenhum arquivo de camada passou de 300 linhas não vazias sem revisão de responsabilidade.
- Nenhum JavaScript novo em `public/assets`; o código entra em `src/`.

**Nomes e tipos**
- Termos do [glossário](glossario.md) e regras das [convenções](convencoes.md).
- Nenhum `@ts-nocheck` novo, `any` sem motivo ou encoding posicional novo.

**Interface** (quando houver mudança visível)
- Skill [weblol-ui](../.agents/skills/weblol-ui/SKILL.md): tokens, regra dos 8, Gestalt, foco por teclado, cursor e hover em itens clicáveis.
- Conferido em desktop com nomes longos, campos ausentes, estado vazio e valores extremos, nos temas que a tela usa.
- `prefers-reduced-motion` respeitado nas animações novas.
- Antes e depois da tela mostrados no chat antes de abrir o PR (navegador local, desktop 1440×900, mesmo fluxo da rota do ui-diff).
- Comentário do ui-diff no PR lido: cada mudança medida é pedida, e o que mudou sem ser pedido é corrigido ou explicado no resumo. Telas fora das três rotas (login, Administração, dados de time) seguem só pela conferência manual.
- Entrada nova no topo de `src/app/config/ui-versions.json` (o tipo fica em `ui-versions.ts`).

**Desempenho**
- Bibliotecas grandes (Excalidraw, Tiptap, mapas) carregam sob demanda.
- A rota não ficou mais pesada sem motivo. Compare o tamanho do build quando a mudança acrescentar dependência ou dado.

**Testes**
- Comportamento novo ou corrigido tem teste. Bug corrigido tem teste que falharia antes da correção.
- Os testes da área passam. Falhas anteriores à mudança estão nomeadas no resumo.

**Segurança**
- Nenhuma chave de API, `.riot-key` ou credencial no diff.
- Endereços de usuário (como o link do OP.GG) aceitam só http(s).
