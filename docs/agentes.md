# Agentes e skills do WebLol

Abra a raiz do WebLol no Codex ou no Claude Code. Os dois usam o [AGENTS.md](../AGENTS.md), que o Claude Code importa pelo [CLAUDE.md](../CLAUDE.md).

## Agentes

Peça pelo nome do perfil quando a especialização ajudar. Exemplo: “Use o agente ui-ux-designer para revisar a hierarquia das builds do Worlds”.

| Perfil compartilhado | Quando usar |
| --- | --- |
| [frontend-developer](agentes/frontend-developer.md) | Implementar e corrigir interfaces e interações |
| [ui-ux-designer](agentes/ui-ux-designer.md) | Avaliar usabilidade, composição e acessibilidade |
| [documentation-expert](agentes/documentation-expert.md) | Escrever ou revisar documentação |
| [task-decomposition-expert](agentes/task-decomposition-expert.md) | Planejar entregas, dependências e validação |
| [unused-code-cleaner](agentes/unused-code-cleaner.md) | Investigar e remover código sem uso |
| [change-verifier](agentes/change-verifier.md) | Conferir uma entrega M ou G contra o pedido e o checklist de revisão, em contexto novo e sem editar |

Atualize o perfil em `docs/agentes/`. Os arquivos em `.codex/agents/` (TOML) e `.claude/agents/` (Markdown) apontam para a mesma instrução. Ao cadastrar ou renomear um agente, mantenha nome, descrição e destino equivalentes nos dois adaptadores.

## Skills

| Skill | Quando usar |
| --- | --- |
| [weblol-pedido](../.agents/skills/weblol-pedido/SKILL.md) | Interpretar um pedido, classificar o tamanho e decidir o portão ([processo](sdlc.md)) |
| [weblol-padronizar](../.agents/skills/weblol-padronizar/SKILL.md) | Registrar regras, termos e decisões vindos de correções ou de `regra:`, `termo:` e `decisão:` |
| [grill-me](../.agents/skills/grill-me/SKILL.md) | Entrevista para afiar um plano ou ideia. Só roda quando chamada pelo nome |
| [grilling](../.agents/skills/grilling/SKILL.md) | A entrevista usada pela grill-me, em rodadas de perguntas com resposta recomendada |
| [feature-sliced-design](../.agents/skills/feature-sliced-design/SKILL.md) | Escolher fronteiras, APIs públicas e dependências entre slices |
| [weblol-ui](../.agents/skills/weblol-ui/SKILL.md) | Implementar ou ajustar interfaces do WebLol |
| [ui-refactor](../.agents/skills/ui-refactor/SKILL.md) | Reorganizar telas, hierarquia e componentes |
| [visual-review](../.agents/skills/visual-review/SKILL.md) | Revisar uma tela ou validar uma mudança visual |
| [weblol-manter-codebase](../.agents/skills/weblol-manter-codebase/SKILL.md) | Fazer manutenção incremental com base em problemas reais do código |
| [weblol-atualizar-soloq](../.agents/skills/weblol-atualizar-soloq/SKILL.md) | Atualizar os dados Solo/Duo dos profissionais ou regenerar o dataset |
| [weblol-publicar](../.agents/skills/weblol-publicar/SKILL.md) | Preparar e publicar no GitHub Pages conforme a autorização |

Edite a fonte em `.agents/skills/`. As skills `grill-me` e `grilling` vêm de [mattpocock/skills](https://github.com/mattpocock/skills) pelo `npx skills`, registradas em `skills-lock.json`. Se criar, renomear ou editar a descrição de uma skill, atualize e confira os adaptadores em `.claude/skills/`. O script mantém `disable-model-invocation: true` quando a fonte o declara:

```sh
node scripts/sincronizar-skills.mjs
node scripts/sincronizar-skills.mjs --check
```

No Claude Code, os ganchos de `.claude/settings.json` rodam o Biome no arquivo editado e, no fim do turno, o Biome e o `npm run check`. No Codex, esses ganchos não rodam, e a verificação fica com o Lefthook e o CI ([verificação automática](sdlc.md#verificação-automática)).

Os adaptadores são arquivos comuns, compatíveis com checkouts Windows sem suporte a links simbólicos. Após atualizar o catálogo, abra uma nova sessão na raiz. No Codex, confira as skills no seletor `$`. No Claude Code, confira a importação em `/memory` e as skills no menu `/`. Para conferir um perfil, peça uma revisão curta com o agente pelo nome. As ferramentas disponíveis dependem da sessão.
