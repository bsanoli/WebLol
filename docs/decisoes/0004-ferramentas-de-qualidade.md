# 0004. Adotar ferramentas de verificação que funcionem com o TypeScript 7

- **Situação:** Onda 1 aceita e implementada em 2026-11-20 ([pedido](../pedidos/2026-11-20-onda-1-verificacao.md)). Onda 2 proposta.
- **Data:** 2026-11-19
- **Decidido por:** Fabiano.

## Contexto

O WebLol não tem lint, formatação, teste unitário nem CI de verificação. As regras do [processo](../sdlc.md) dependem só da atenção dos agentes, e a mesma correção volta em sessões seguintes ([auditoria](../auditoria-codebase.md#5-fluxo-de-trabalho)).

O projeto usa `typescript@^7.0.2`. O TypeScript 7.0 não traz a API programática, que deve voltar no 7.1, ainda em beta. Por isso quebram hoje as ferramentas que importam o pacote `typescript`:

- typescript-eslint 8.73 aceita só TypeScript abaixo de 6.1;
- dependency-cruiser não resolve imports `.ts`;
- typescript-language-server depende do `tsserver`, que o TypeScript 7 não traz.

Versões e compatibilidade conferidas no registro npm, nos releases do GitHub e na documentação oficial em 19/11/2026.

## Decisão

Preferir ferramentas que não dependem do compilador TypeScript, em duas ondas do [backlog](../auditoria-codebase.md#backlog-por-ondas).

### Onda 1

| Ferramenta | Papel | Observação |
| --- | --- | --- |
| [Biome](https://biomejs.dev) 2.6 | Formatação e lint de TS, JSX, CSS e JSON. Regras de nomes (`useNamingConvention`, `useFilenamingConvention`, `useConsistentBooleanName`), de hooks do React e de imports proibidos. Regras próprias por plugins GritQL | A reformatação inicial vai num commit isolado, listado em `.git-blame-ignore-revs` |
| [Steiger](https://github.com/feature-sliced/steiger) 0.10 com `@feature-sliced/steiger-plugin` | Linter oficial do FSD: direção das camadas, API pública, cross-imports, nomes de segmentos | Ainda em beta: versão fixa. Roda ao lado de `scripts/check-architecture.mjs`, que guarda o aviso de 300 linhas |
| [Vitest](https://vitest.dev) 5 | Testes das regras puras em `model/` | Usa a configuração do Vite 8 |
| [@axe-core/playwright](https://playwright.dev/docs/accessibility-testing) 4.14 | WCAG 2.2 AA nos testes Playwright existentes | Tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` |
| [Lefthook](https://lefthook.dev) 2 | Ganchos do Git: Biome nos arquivos staged no `pre-commit`, `npm run check` no `pre-push` | Binário nativo no Windows, sem lint-staged |
| GitHub Actions `ci.yml` | `npm ci`, Biome, `npm run check`, Steiger, Vitest, build, Playwright e `sincronizar-skills --check` em push e pull request | Ações em `actions/checkout@v7` e `actions/setup-node@v7` |
| [Ganchos do Claude Code](https://code.claude.com/docs/en/hooks) em `.claude/settings.json` | `PostToolUse` em edições de `src/`: Biome no arquivo. `Stop`: Biome, Steiger e `npm run check` | Código de saída 2 devolve o erro ao agente. No Windows, chamar `node node_modules/@biomejs/biome/bin/biome` em vez de `npx`, e ler o JSON da entrada com Node em vez de `jq` |

#### Como a Onda 1 ficou

Versões fixas no `package.json`: Biome 2.6.8, Steiger 0.10.0 com o plugin 0.8.2, Vitest 5.1.1, Lefthook 2.2.2 e @axe-core/playwright 4.14.0. Diferenças em relação à tabela acima:

- **Avisos antes de erros.** As regras de nomes do Biome, as regras do preset que já tinham violações no código e 5 das 17 regras do Steiger (as que já tinham violações) começam como aviso; as outras 12 já barram. Elas sobem para erro quando o código daquela regra estiver limpo. A lista está na [auditoria](../auditoria-codebase.md#avisos-que-ainda-não-barram).
- **axe com violações conhecidas.** `tests/accessibility.spec.ts` passa as oito telas principais pelo axe e só aceita as violações listadas em `known`, por tela e com o máximo de elementos. Uma regra nova, uma tela nova ou mais elementos fazem o teste falhar.
- **CI em todo push e sob demanda (`workflow_dispatch`), sem `pull_request`.** O PR mostra o resultado do push da própria branch, então rodar nos dois eventos repetiria o mesmo trabalho.
- **`PostToolUse` em `src/`, `tests/` e `scripts/`**, fora `src/data/`, que é gerado. Erros voltam ao agente com código 2, e avisos voltam como contexto.
- **`Stop` barra uma vez.** Se o Biome ou o `npm run check` falharem, o turno continua para o agente corrigir. Se falharem de novo, o gancho só informa, para não prender a sessão.
- **`sync.js` e `shell.js` ficam fora das correções automáticas que renomeiam, trocam `let` por `const` ou apagam variáveis.** Eles rodam como scripts clássicos e compartilham variáveis globais; o Biome os analisa como módulos isolados e quebraria o login e a Administração. Só a formatação vale para eles.
- **`pre-push` também roda o Vitest**, que leva poucos segundos.
- **Registro das chaves locais** em `src/shared/config/storage-keys.ts`, com um teste que falha quando o código escreve uma chave `lol-` ou `weblol-` fora do registro.

### Onda 2

| Ferramenta | Papel |
| --- | --- |
| [Knip](https://knip.dev) 6 | Arquivos, exports e dependências sem uso. Declarar como entradas os scripts dos quatro HTMLs e `public/assets/*.js` |
| Oxlint com `--type-aware` (oxlint-tsgolint 7) | Só as regras que dependem de tipos e que o Biome ainda não tem estáveis: `no-floating-promises`, `no-misused-promises`, `await-thenable` |
| [size-limit](https://github.com/ai/size-limit) e [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) | Orçamento de tamanho por entrada no CI e mapa do bundle sob demanda |
| [Zod 4](https://zod.dev) (`zod/mini`) | Validação nas fronteiras: `localStorage`, parâmetros da URL e conversores do Firestore. Entra junto com a Onda 3 do backlog |
| [cspell](https://cspell.org) com `@cspell/dict-pt-br` | Ortografia nas docs, com dicionário de termos do LoL |
| Plugins oficiais do Claude Code: `hookify`, `security-guidance`, `claude-md-management` | Guardas só do Claude (por exemplo, nunca ler `.riot-key`), avisos de segurança e revisão do AGENTS.md. O `hookify` exige Python 3, ainda não testado neste Windows |

### Skills e métodos

- Continuar com o formato Agent Skills em `.agents/skills/`, copiado para `.claude/skills/` por `scripts/sincronizar-skills.mjs`. O Claude Code só procura skills em `.claude/skills/` e só lê o AGENTS.md quando não existe CLAUDE.md, então o `CLAUDE.md` com `@AGENTS.md` continua.
- Avaliar, de [mattpocock/skills](https://github.com/mattpocock/skills), `domain-modeling`, `grill-with-docs` e `retro`. Elas mantêm glossário e ADRs e transformam correções da sessão em regras. Instalar por `npx skills`, que já gera o `skills-lock.json`, e não também como plugin, para não duplicar nomes.
- Usar os comandos que já vêm no Claude Code: `/code-review`, `/simplify` e `/security-review`.
- Para renomeações em massa da Onda 3, usar [ts-morph](https://ts-morph.com), que traz o próprio compilador TypeScript 6 e não depende do 7 do projeto.

## Consequências

- Formatação, nomes, fronteiras do FSD e acessibilidade passam a ser barrados por máquina, para os dois agentes e para as pessoas.
- O primeiro commit do Biome reformata o projeto todo. Ele entra depois do trabalho de Táticas (commit 9990e74), num commit só de formatação listado em `.git-blame-ignore-revs`.
- O CI deixa cada push alguns minutos mais lento.
- O Steiger 0.10 funciona com o TypeScript 7 deste projeto, testado na Onda 1. Knip e oxlint-tsgolint ainda não foram testados, e a compatibilidade foi deduzida das dependências de cada pacote.
- Quando saírem o TypeScript 7.1 e o suporte do typescript-eslint, reavaliar ESLint, eslint-plugin-boundaries e dependency-cruiser.

## Alternativas consideradas

- **ESLint, typescript-eslint e Prettier:** o ecossistema maior, mas sem suporte ao TypeScript 7.0. A saída oficial instala o TypeScript 6 lado a lado (`"typescript": "npm:@typescript/typescript6@^6.0.2"`), o que deixa dois compiladores no projeto.
- **Husky, lint-staged e commitlint:** três pacotes no lugar do Lefthook. Os tipos do Conventional Commits são em inglês e só compensam quando há changelog e versões, que o WebLol não tem. Se quisermos validar mensagens, um regex no `commit-msg` do Lefthook confere o formato "Área: descrição".
- **dependency-cruiser e eslint-plugin-boundaries:** cobrem o mesmo que o Steiger, mas dependem do compilador TypeScript ou do ESLint.
- **Spec Kit, BMAD Method, Agent OS e superpowers:** fluxos completos de especificação ou de execução por subagentes, com cerimônia demais para duas pessoas. Do superpowers, valem as ideias de `systematic-debugging` e `verification-before-completion`, já cobertas pelo agente `change-verifier`.
- **ts-prune e depcheck:** sem manutenção. O Knip cobre os dois.
