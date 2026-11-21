---
name: weblol-padronizar
description: Registra no WebLol uma regra, termo ou decisão vinda de uma correção do Fabiano ou do Bruno ou dos atalhos regra, termo e decisão, aplica no trabalho atual e propõe verificação automática quando a regra se repete.
---

# Transformar correções em padrões

Use quando a pessoa escrever `regra:`, `termo:` ou `decisão:`, e quando corrigir uma entrega de um jeito que pode se repetir. Sinais: "de novo", "sempre", "nunca", "não é assim que chamamos", ou a mesma correção feita em outra sessão. O ciclo está em [docs/sdlc.md](../../../docs/sdlc.md#ciclo-de-padronização).

## 1. Escrever a regra

Uma frase no imperativo, com o motivo quando ele não for óbvio. Acrescente um exemplo certo e um errado quando ajudar.

> Use `enemy` do confronto (`Matchup`) para a composição adversária do draft. Não use `rival` nem `opponent`.

## 2. Escolher o lugar

| A correção é sobre | Registre em |
| --- | --- |
| Nome de um conceito ou termo da tela | [glossario.md](../../../docs/glossario.md) |
| Como escrever código | [convencoes.md](../../../docs/convencoes.md) |
| Escolha com alternativas e consequências | ADR nova em [docs/decisoes/](../../../docs/decisoes/README.md), com o próximo número |
| Como fazer um tipo de tarefa | A skill da tarefa em `.agents/skills/` |
| Regra de interface | Skill [weblol-ui](../weblol-ui/SKILL.md) |
| Algo que uma máquina confere | Regra do Biome, Steiger ou `scripts/check-architecture.mjs`, teste ou CI ([ADR 0004](../../../docs/decisoes/0004-ferramentas-de-qualidade.md)) |
| Guarda só do Claude | Gancho em `.claude/settings.json` |
| Vale para toda sessão e não cabe acima | Uma linha no [AGENTS.md](../../../AGENTS.md), que precisa caber em uma página |

Regras do time ficam no repositório. A memória pessoal do Claude não chega ao Codex nem ao Bruno.

## 3. Conferir antes de gravar

- Procure a regra nos arquivos acima. Se já existir, a correção é uma segunda violação: vá ao passo 5.
- Se contradisser uma ADR aceita, proponha uma ADR nova que a substitua. Não edite a antiga.
- Se tocar admin ou login, pergunte ao Bruno e registre em [historico-admin-login.md](../../../docs/historico-admin-login.md).
- Nome salvo (chave local, campo, coleção, rota) é contrato. Registre o nome canônico no glossário e converta na fronteira. Renomear o dado salvo exige migração e ADR.

## 4. Aplicar

Aplique a regra no trabalho em andamento. Código legado fora da tarefa entra no [backlog](../../../docs/auditoria-codebase.md#backlog-por-ondas), não na entrega atual. Se editar uma skill, rode `node scripts/sincronizar-skills.mjs`.

## 5. Automatizar o que se repete

Uma regra violada duas vezes vira verificação automática sempre que der. Proponha a verificação com o arquivo e o comando, por exemplo uma regra `noRestrictedImports` no Biome, um plugin GritQL, uma regra do Steiger ou um teste. Implemente se a ferramenta já estiver instalada (Biome, Steiger, Vitest e axe estão desde a Onda 1). Senão, acrescente o item à onda do backlog que traz a ferramenta. Na regra registrada, anote "Verificado por …".

## Resumo

No fim da entrega, liste em "Regras registradas" cada regra, o arquivo onde ficou e se já tem verificação automática.
