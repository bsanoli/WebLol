# Como trabalhamos no WebLol

Este é o caminho de uma ideia até o código publicado. Vale para Fabiano, Bruno, Claude Code e Codex. O processo segue o [AI-native SDLC playbook](https://claude.com/resources/articles/the-ai-native-sdlc-playbook) da Anthropic em três pontos:

- cada etapa termina num arquivo versionado, que a próxima sessão consegue ler;
- as pessoas decidem nos portões (interpretação, plano, publicação), não linha a linha;
- uma regra que se repete vira verificação automática.

## Papéis

| Quem | Faz |
| --- | --- |
| Fabiano | Descreve pedidos, decide produto e interface, aprova planos e publicações |
| Bruno | Coautor. Só entra quando a tarefa exige algo na conta dele (senha, conta admin) ou a publicação de regras do Firestore ([historico-admin-login.md](historico-admin-login.md)) |
| Claude Code e Codex | Interpretam o pedido, planejam, implementam, verificam, registram as regras novas e resumem o que ficou pendente |

## Tamanho do pedido

Todo pedido recebe um tamanho logo no início. A skill [weblol-pedido](../.agents/skills/weblol-pedido/SKILL.md) faz essa classificação.

| Tamanho | Quando | Fluxo | Fica registrado em |
| --- | --- | --- | --- |
| **P**, ajuste | Uma tela ou comportamento local, sem dado salvo, rota, dependência ou regra nova. Ex.: texto, espaçamento, bug com causa clara. | Implementar → verificar → resumo | Commit |
| **M**, funcionalidade | Muda comportamento visível, toca mais de um slice ou precisa de teste novo. | Pedido → plano → implementar → verificar com o agente verificador → resumo | `docs/pedidos/AAAA-MM-DD-assunto.md` e commit |
| **G**, estrutural | Área ou aba nova, dado salvo (localStorage, Firestore, URL), login ou Administração, dependência nova, refatoração de arquitetura. | Pedido e especificação → ADR → aprovação → plano em ondas → branch → PR → revisão → publicação | Arquivo do pedido, ADR em `docs/decisoes/` e PR |

Na dúvida entre dois tamanhos, escolha o maior só se a mudança tocar algo salvo ou a área de admin e login. Nos outros casos, escolha o menor.

## Etapas

| Etapa | O que acontece | Portão | Artefato |
| --- | --- | --- | --- |
| 1. Pedido | Claude reescreve a mensagem como resultado esperado e critérios de aceite, com os termos do [glossário](glossario.md), e classifica o tamanho. | Em M e G, a pessoa confirma ou corrige a interpretação. Em M, se a mensagem já autoriza a execução (`implemente`, `corrija`, `bora`) e nenhuma dúvida muda a entrega, a interpretação fica registrada e a implementação segue. A dúvida vem como pergunta com opções, a recomendada primeiro. | Seção "Pedido" do [modelo](pedidos/_modelo.md) |
| 2. Especificação (só G) | Telas e estados (vazio, texto longo, erro, carregando), dados e migração, rotas, impacto nos builds Worlds e SoloQ, termos novos. | Fabiano aprova. O Bruno só age no que exigir a conta dele ou as regras do Firestore. | Seção "Especificação" e ADR, se houver decisão |
| 3. Plano | No modo de planejamento: arquivos por camada FSD, testes a criar ou ajustar, riscos. Em G, ondas que possam ser publicadas uma de cada vez. | Aprovação do plano em G. Em M, o plano é mostrado e a implementação segue. | Seção "Plano" |
| 3b. Protótipo (opcional, interface nova) | Quando a interface é nova ou redesenhada e há mais de um caminho plausível, a skill [prototype](../.agents/skills/prototype/SKILL.md) (Emil Kowalski) monta 3 variantes realmente diferentes atrás de um seletor, usando os tokens do WebLol. Fabiano escolhe no navegador e a variante vencedora segue para a implementação. | Fabiano escolhe a variante | Variante escolhida registrada no "Plano" |
| 4. Implementação | Código conforme as [convenções](convencoes.md) e testes junto do código. Os ganchos rodam o Biome no arquivo editado e o `npm run check` no fim do turno. | — | Diff |
| 5. Verificação | `npm run verify`, testes Playwright da área e conferência no navegador desktop pelo fluxo real. Em M e G, o agente [change-verifier](agentes/change-verifier.md) confere o diff contra o pedido em contexto novo. | Tudo passa ou a falha é anterior e está registrada. | Resumo da verificação |
| 6. Revisão e publicação | Checklist de [revisão](revisao.md). "publique" aciona a skill [weblol-publicar](../.agents/skills/weblol-publicar/SKILL.md). Em G, um PR. Em PR que muda interface, antes de abrir o PR mostre no chat o antes e depois da tela (capturado no navegador local, desktop 1440×900, pelo mesmo fluxo da rota do ui-diff). Depois de aberto, leia o comentário do [ui-diff](decisoes/0010-ui-diff-nos-prs.md): cada mudança medida é intencional ou vira ajuste. | Pedido explícito de publicação | Commit, push e PR |
| 7. Aprendizado | Cada correção feita pela pessoa vira regra no lugar certo (veja o [ciclo de padronização](#ciclo-de-padronização)). | — | Glossário, convenções, ADR, skill ou verificação |

### Pronto para começar (M e G)

- O resultado esperado cabe em uma frase, em termos de uso.
- Os critérios de aceite podem ser conferidos no navegador ou em teste.
- Os termos estão no glossário, ou o termo novo foi proposto.
- Os dados salvos afetados estão listados, ou a lista diz "nenhum".
- As dúvidas que mudariam a entrega já foram respondidas.

### Concluído

- Os critérios de aceite foram conferidos pelo fluxo real em desktop.
- O `npm run check` passa sem erros.
- Os testes da área passam. Uma falha anterior à mudança fica registrada no resumo, com o nome do teste.
- O código novo segue o glossário e as convenções.
- A documentação da área foi atualizada, assim como `historico-admin-login.md` e `ui-versions.json` quando se aplicam.
- O resumo diz o que mudou, o que foi verificado, o que ficou pendente e quais suposições a pessoa precisa conferir.

## Como pedir

Escreva como de costume. As frases abaixo são atalhos que Claude e Codex reconhecem.

| Você escreve | O que acontece |
| --- | --- |
| Descrição livre ("o card some quando…") | Claude classifica e interpreta. P segue direto. M e G mostram a interpretação antes de editar, salvo o caso de M descrito na etapa 1. |
| `pedido: …` | Cria o arquivo em `docs/pedidos/` e para no portão da interpretação |
| `planeje …` | Só o plano, sem editar |
| `implemente`, `bora`, `sim`, `aplique a 1` | Segue com o que foi proposto |
| `regra: …` | Registra a regra no lugar certo e já aplica no trabalho atual |
| `termo: X = Y` | Acrescenta ao glossário |
| `decisão: …` | Cria uma ADR em `docs/decisoes/` |
| `/prototype <peça de interface>` | Monta variantes da peça atrás de um seletor, espera a escolha e promove a vencedora. Só roda quando chamada pelo nome. Veja [Protótipos](#protótipos) |
| `revise <área ou diff>` | Revisão pelo [checklist](revisao.md), com achados por severidade e sem editar |
| `padronize <área>` | Aplica o glossário e as convenções numa área, sem mudar o comportamento |
| `refatore <área>` | Pega o item do [backlog](auditoria-codebase.md#backlog-por-ondas), planeja e executa por ondas |
| `explique …`, `por que …?` | Só explica |
| `onde paramos?` | Lê `docs/pedidos/` e o backlog e resume o que está aberto |
| `publique` | Commit, push e GitHub Pages |

## Protótipos

A skill `prototype` vem de [emilkowalski/skills](https://github.com/emilkowalski/skills) pelo `npx skills`, registrada em `skills-lock.json`. Ela é de divergência: não revisa telas existentes.

- **Quando usar:** peça de interface nova ou redesenhada, com mais de um caminho plausível. Em P e em ajustes de caso único, não use.
- **Uma peça por vez.** Para uma tela inteira, escolha a peça de maior impacto e deixe o resto para outra rodada.
- **Onde vive:** fora das camadas FSD e do código de produção. Nada em `src/` importa o protótipo, e o `npm run check` continua passando. A superfície do protótipo é apagada depois da escolha (ou mantida só se a pessoa pedir) e nunca entra em commit.
- **Como fica:** as variantes usam os tokens e componentes do WebLol, conteúdo realista (times, campeões, números plausíveis) e valem para desktop. Cada variante respeita [weblol-ui](../.agents/skills/weblol-ui/SKILL.md), Gestalt e WCAG 2.2 AA.
- **Escolha:** `keep <variante>` promove a vencedora seguindo as convenções e o FSD. `riff <variante>` gera nova rodada ao redor dela.

## Ciclo de padronização

Quando a pessoa corrige uma entrega, a correção diz algo sobre o processo. Se puder se repetir, a skill [weblol-padronizar](../.agents/skills/weblol-padronizar/SKILL.md) a registra:

| A correção é sobre | Fica em |
| --- | --- |
| O nome de um conceito ou um termo da tela | [glossario.md](glossario.md) |
| Como escrever código (nomes, arquivos, tipos, estrutura) | [convencoes.md](convencoes.md) |
| Uma escolha com alternativas e consequências (biblioteca, formato de dado, fluxo) | ADR em [decisoes/](decisoes/README.md) |
| Como fazer um tipo de tarefa | Skill em `.agents/skills/` |
| Uma regra de interface | Skill [weblol-ui](../.agents/skills/weblol-ui/SKILL.md) |
| Algo que uma máquina consegue conferir | Regra do Biome (ou plugin GritQL), do Steiger ou de `check-architecture`, teste ou CI |
| Uma guarda que só vale para o Claude (ex.: nunca ler `.riot-key`) | Gancho em `.claude/settings.json` |
| Uma regra para toda sessão que não cabe acima | Uma linha no [AGENTS.md](../AGENTS.md) |

- **Duas violações, uma automação.** Se uma regra registrada for violada de novo, ela vira verificação automática sempre que der.
- **Skill orienta, gancho garante.** A skill ajuda o agente a acertar. A garantia vem do lint, do teste, do gancho e do CI.
- **AGENTS.md cabe em uma página.** Detalhes ficam nos documentos de `docs/`, e o AGENTS.md aponta para eles.

## Verificação automática

| Quando | O que roda | Situação |
| --- | --- | --- |
| A cada edição de arquivo pela sessão | Biome no arquivo editado em `src/`, `tests/` ou `scripts/` (gancho `PostToolUse` do Claude Code) | Ativo desde a Onda 1 ([ADR 0004](decisoes/0004-ferramentas-de-qualidade.md)) |
| Antes de a sessão encerrar o turno | Biome e `npm run check`, que inclui o Steiger (gancho `Stop`) | Ativo desde a Onda 1 |
| No commit | Biome nos arquivos staged, com as correções automáticas (Lefthook `pre-commit`) | Ativo desde a Onda 1, instalado pelo `npm install` |
| No push | `npm run check` (arquitetura, tipos e Oxlint com regras de tipos) e Vitest (Lefthook `pre-push`) | Ativo desde a Onda 1; Oxlint desde a Onda 2 |
| Em todo PR do repositório (fora rascunhos) | ui-diff: captura as telas afetadas na base e no PR e comenta o antes e depois, com as mudanças medidas ([ADR 0010](decisoes/0010-ui-diff-nos-prs.md)). Informativo, não bloqueia | Proposto, ativo depois do merge de `ui-diff.yml` |
| Em todo push para o GitHub | Biome, `npm run check`, `sincronizar-skills --check`, Knip, Vitest, build, `size-limit` e Playwright com axe (`ci.yml`). O PR mostra o resultado do push da branch | Ativo desde a Onda 1 |
| Na publicação | Build e deploy | Deploy por artefato do GitHub Actions a cada push na `main` ([ADR 0003](decisoes/0003-publicacao-por-artefato.md)). |

## Sessões em paralelo

- Trabalho G usa branch própria (ou worktree) e PR.
- No máximo duas sessões escrevendo código ao mesmo tempo, em arquivos diferentes. Quem coordena integra e verifica.
- Sessões só de leitura (revisão, pesquisa, auditoria) podem rodar junto, sem limite.

## Como saber se está funcionando

Revise estes sinais quando perguntar "onde paramos?" ou uma vez por mês:

- **Retrabalho:** quantas correções uma entrega precisou depois de pronta.
- **Erros repetidos:** regras registradas que voltaram a ser violadas e ainda não viraram verificação.
- **Desvio do plano:** entregas M e G cujo diff saiu do plano aprovado.
- **Saúde da base:** avisos de tamanho do `npm run check`, arquivos com `@ts-nocheck`, tempo da suíte Playwright e peso por rota.
