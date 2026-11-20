# Convenções de código

Estas regras valem para código novo e para os trechos que uma mudança tocar. Código legado que a tarefa não toca continua como está e entra no [backlog da auditoria](auditoria-codebase.md). Para acrescentar uma regra, escreva na sessão `regra: <a regra>`. A skill [weblol-padronizar](../.agents/skills/weblol-padronizar/SKILL.md) decide onde ela fica e se dá para verificar por máquina.

Os nomes de conceitos vêm do [glossário](glossario.md). A arquitetura segue a [skill de FSD](../.agents/skills/feature-sliced-design/SKILL.md), e a interface segue a [skill weblol-ui](../.agents/skills/weblol-ui/SKILL.md).

## Idioma

- Identificadores, tipos, nomes de arquivo e de pasta: inglês.
- Textos da interface, mensagens de erro exibidas, documentação, comentários, nomes de teste e commits: português do Brasil.
- Termos do jogo que o time usa em inglês (pick, ban, build, wave, ward) entram no texto da interface como no jogo.

## Nomes

- **Diga o que é, não como é guardado.** `selectedComposition`, não `cur`. `championById`, não `CH`.
- **Sem nomes de 1 a 3 letras**, com estas exceções: `i`, `j` e `k` como índice de laço curto, `x`, `y` e `z` como coordenadas, `id`, `url`, `db` e `api`, e os ids de posição (`jg`, `adc`, `sup`).
- **Sem siglas inventadas.** Siglas do jogo (`kda`, `cs`, `opgg`) podem ficar. `ws`, `ln`, `rn` e `tks` não.
- **Booleanos** começam com `is`, `has`, `can` ou `should`: `isEnemy`, `canManageTeam`.
- **Funções** começam com um verbo e dizem o alvo:
  - `handle…` para eventos de interface (`handleRivalSelect` → `handleEnemySelect`);
  - `render…` para gerar marcação e `mount…` para ligar um componente ao DOM;
  - `create…` para montar um valor novo sem efeito colateral (como `createCompositionCopy`);
  - `read…` e `write…` para armazenamento local, `fetch…` para rede e `load…` para ler e preparar;
  - `to…` e `parse…` para converter formatos.
- **Constantes** de módulo em `UPPER_SNAKE_CASE` só quando forem valores fixos (`DEFAULT_DRAFT_ORDER`). Funções e objetos de configuração usam `camelCase`.
- **Tipos** em `PascalCase`, no singular: `Composition`, `Matchup`, `PositionId`.
- **Arquivos e pastas** em `kebab-case`, inclusive componentes React (`tactic-notes.tsx`, não `TacticNotes.tsx`). A pasta diz para que serve: `shared/ui/blocks`, não o nome do fornecedor, em código novo.
- **Formato salvo da composição** (`team: "mine"`, `draft.rival`) é traduzido para `owner` e `enemyId` só em `pages/team/model/composition-storage.ts`.
- **Classes CSS** novas descrevem o papel (`.matchup-bar`, `.draft-card`), não a aparência (`.red-box`).
- **Testes** descrevem o comportamento em português: `"Ordem do draft: arrastar campeão para fora remove da composição"`.

## Dados e tipos

- Não introduza `@ts-nocheck`. Ao extrair código de um arquivo com `@ts-nocheck`, o módulo novo sai tipado.
- Objetos com campos nomeados no lugar de strings ou arrays posicionais (`"Nome|Id|T"`, `[x, y]` sem nome, `{k, n, c}`). Formatos de dataset já publicados se convertem na fronteira.
- Valide dados externos na fronteira que a mudança tocar: parâmetros da URL, `localStorage`, Firestore e JSON importado. A fronteira devolve o tipo canônico do glossário.
- Toda chave do `localStorage` é declarada em [`src/shared/config/storage-keys.ts`](../src/shared/config/storage-keys.ts), com o formato do valor, e o código usa `STORAGE_KEYS.<nome canônico>`. Chaves novas seguem `weblol-<área>-<dado>`. O teste `storage-keys.test.ts` falha quando uma chave `lol-` ou `weblol-` aparece no código sem estar declarada.
- Mudar o nome ou o formato de algo salvo exige migração, teste da migração e uma ADR.

## Estrutura

- Respeite as camadas FSD e as APIs públicas (`index.ts`) dos slices. O `npm run check` acusa violações.
- Separe regra e estado em `model`, renderização em `ui` e acesso a dados em `api`.
- Arquivos de camada com mais de 300 linhas não vazias recebem revisão de responsabilidade antes de crescer mais. Dados e arquivos gerados ficam fora dessa conta.
- Código usado por um slice só fica nele. Extraia para `shared` ou `entities` quando houver um segundo consumidor real com a mesma regra.
- Os scripts clássicos `public/assets/shell.js` e `sync.js` estão congelados para funcionalidades novas. O que for novo entra em `src/`, e o script legado só ganha uma ponte mínima.

## Comentários e documentação

- Comentário explica o porquê ou a restrição, não o que a linha faz.
- Funções e tipos exportados pela API pública de um slice têm TSDoc de uma linha em português.
- Cada área com regras próprias tem um documento em `docs/` (como [taticas.md](taticas.md)). Mudança de comportamento atualiza o documento na mesma entrega.

## Estilos

- Use os tokens `--wl-*` e os equivalentes do Tailwind. Cor nova entra como token com papel semântico, não como hexadecimal solto.
- Espaçamentos e alturas em múltiplos de 8 px, com ajustes de 4 px. Bordas de 1 px são a exceção.
- Componente React novo usa Tailwind ou CSS module do próprio slice. Os arquivos globais em `public/assets/*.css` só recebem ajustes no que já está lá.

## Verificação automática

O Biome formata e aponta problemas, o Steiger confere as fronteiras do FSD, o Vitest testa as regras de `model/` e o axe confere a acessibilidade nos testes Playwright. Os ganchos do Claude Code, o Lefthook e o CI rodam essas ferramentas sozinhos. A tabela da [verificação automática no SDLC](sdlc.md#verificação-automática) diz quando cada um roda.

| Comando | O que faz |
| --- | --- |
| `npm run lint` | Biome: formatação e lint, sem alterar arquivos |
| `npm run lint:fix` | Biome com as correções automáticas |
| `npm run check` | Arquitetura (`check-architecture.mjs` e Steiger) e tipos |
| `npm run test:unit` | Vitest, nos arquivos `*.test.ts` de `src/` |
| `npm run verify` | As três verificações rápidas acima, em sequência |
| `npm test` | Playwright, incluindo o axe |

- **Erro barra, aviso é dívida.** Regras com violações anteriores à Onda 1 estão como aviso, listadas na [auditoria](auditoria-codebase.md#avisos-que-ainda-não-barram). Corrija os avisos do trecho que você mudou e não crie avisos novos. Quando uma regra chegar a zero, ela vira erro no `biome.jsonc` ou no `steiger.config.ts`.
- **Violação de acessibilidade conhecida só diminui.** `KNOWN_VIOLATIONS`, em `tests/accessibility.spec.ts`, lista, por tela, as regras do axe que já falhavam e o máximo de elementos. Não acrescente regras nem aumente números. Quando corrigir uma, baixe o número ou tire a linha.
- **Regra de teste nova fica junto do código.** O teste unitário de `model/foo.ts` é `model/foo.test.ts`.
- **Pular um gancho é exceção.** `LEFTHOOK=0 git commit` só em emergência, com o motivo na mensagem do commit. O CI roda as mesmas verificações e vai acusar o problema.

## Commits

- Português, no presente, com até 72 caracteres no título: `Corrige…`, `Adiciona…`, `Documenta…` ou `<Área>: <mudança>`.
- Renomeações e movimentações de arquivo ficam em commit próprio, sem mudança de comportamento junto, para o diff ficar legível.
- Nunca inclua chaves de API (como a chave da Riot ou `.riot-key`) em arquivos versionados.
