# Glossário do WebLol

Este arquivo liga o termo que aparece na tela ao nome que o código usa. Consulte-o antes de nomear uma variável, função, tipo, arquivo, rota ou campo salvo. Para acrescentar um termo, escreva na sessão `termo: <termo da tela> = <significado>`. Claude ou Codex registra aqui pela skill [weblol-padronizar](../.agents/skills/weblol-padronizar/SKILL.md).

## Regras

1. **Um conceito, um nome.** Cada conceito tem um único termo no código. Os sinônimos ficam na coluna "Legado" e não aparecem em código novo.
2. **Código em inglês, tela em português.** Identificadores, tipos e nomes de arquivo usam o termo em inglês. Os textos da interface, a documentação e os commits ficam em português. A decisão está na [ADR 0002](decisoes/0002-idioma-e-nomes.md).
3. **O que está salvo é contrato.** Chaves do `localStorage` e do IndexedDB, campos guardados, coleções do Firestore, rotas e parâmetros da URL só mudam com uma migração e uma ADR. Até a migração, o módulo `api` ou `model` da fronteira converte o nome legado para o canônico, e o resto do código usa só o canônico.
4. **Mesma palavra, contextos diferentes.** Quando um termo da tela vale em duas áreas, como "Composições", o código usa o termo qualificado da tabela.

## Jogo e partida

| Na tela | No código | Significado | Legado (não usar em código novo) |
| --- | --- | --- | --- |
| Campeão | `champion` | Personagem do LoL. O catálogo fica em `entities/champion`. | `CH`, `c`, `n` (campos posicionais em `"Nome\|Id\|Posições"`) |
| Posição (Top, Selva, Meio, Atirador, Suporte) | `position`, tipo `PositionId = "top" \| "jg" \| "mid" \| "adc" \| "sup"` | Função do jogador na partida. Os ids curtos são o formato salvo e continuam. | `lane`, `role`, `DraftLane`, `ROLES`, `LANES`, `RN`, `k` |
| Rota (Top, Meio, Bot) | `lane` | Caminho físico do mapa, usado em waves e torres do Mapa tático. Não use para posição. | — |
| Lado azul / Lado vermelho | `side: "blue" \| "red"` | Lado do mapa e do draft. | `DraftSide`, prefixos `b_` e `r_`, `cb`/`cr` |
| Ban | `ban`, `bans` | Campeão banido no draft. Não é uma posição. | `lanes.ban` (formato salvo) |
| Pick | `pick` | Campeão escolhido para uma posição. Alternativos ficam na mesma posição, depois do principal. | — |
| Ordem do draft | `draftOrder` | Sequência das posições em que cada lado escolhe. | `order` |
| Partida | `match` | Jogo registrado no dataset (Worlds ou SoloQ). | — |
| Build | `build` | Itens, runas e feitiços de um jogador numa partida. | — |
| Oponente direto | `opponent` | Jogador da mesma posição no outro time de uma **partida registrada** (Builds). Só existe em dados de partidas, onde não há "nosso time". | `directOpponent`, `buildOpponent` |
| Equipe profissional | `proTeam` | Equipe do Worlds ou de um jogador profissional (T1, G2…). Não confundir com o time do WebLol. | campos `b` e `r` de `src/data/worlds.json` (formato do dataset) |
| Jogador profissional | `proPlayer` | Jogador das contas acompanhadas em `scripts/soloq-pros.json`. | `pro` |

## Área do time

| Na tela | No código | Significado | Legado (não usar em código novo) |
| --- | --- | --- | --- |
| Área do time | `teamArea` | Seção do time: Composições, Mapa tático, Conhecimento e Gestão. Rota `#/time`. | `camp`, `camp.html`, `v-camp` |
| Composição | `composition` | Picks por posição, bans, draft e notas de um time. | `comp`, `comps`, `cur`, `S.comps` |
| Nossa / Adversária | `owner: "ours" \| "enemy"` | De quem é a composição: do nosso time ou do time que vamos enfrentar. | campo salvo `team: "mine" \| "enemy"`, `CompTeam`, `tacticTeam`, `mine`, `rival` |
| Composição adversária | `enemyComposition` | Composição com `owner` igual a `"enemy"`. | `rival`, `rivalComp` |
| Adversária do draft | `enemyId` | Id da composição adversária colocada do outro lado do draft de uma composição nossa. | campo salvo `draft.rival`, `rivalId`, `setRival`, `rivalOf` |
| Confronto | `matchup` | Uma composição nossa contra uma adversária, com tática própria. | `MatchupEntry` |
| Táticas / Bloco de notas | `tacticNote` | Texto rico (Tiptap) de uma composição, de um confronto ou das "Táticas gerais". | `tactic` (também usado para a antiga "tática salva") |
| Tática salva (antiga) | — | Formato antigo de composição com tática. Só aparece na migração. | `tactic: true`, `tacticViews` |
| Print | `screenshot` | Imagem colada no bloco de notas. Em inglês, *print* significa impressão. | `print`, `print-store`, `print-sketch`, `img` |
| Desenho | `sketch` | Anotação Excalidraw sobre um print. | — |
| Mapa tático | `tacticalMap` | Quadro do mapa com campeões, wards e waves. | `map` |
| Jogada | `play` | Sequência de passos no Mapa tático. | `blankPlay`, `curPlay` |
| Passo | `step` | Um quadro de uma jogada. | — |
| Conhecimento | `teamKnowledge` | Guia de objetivos e controle de wave. | — |
| Gestão do time | `teamManagement` | Membros, capitão e pedidos de entrada. Rota `#/time/gestao`. | — |

## Contas, times e administração

| Na tela | No código | Significado | Legado (não usar em código novo) |
| --- | --- | --- | --- |
| Time | `team` | Grupo de jogadores do WebLol, com capitão. Só use `team` neste sentido. | `TEAM` (global), `times` (coleção), `TKEY` |
| Membro | `member` | Jogador que faz parte de um time. | `membros` (coleção) |
| Capitão | `captain` | Membro que aceita pedidos de entrada e aprova envios. | — |
| Conta | `account` | Riot ID com senha no WebLol. | `contas`, `usuarios` (coleções), `u`, `UKEY` |
| Riot ID | `riotId` | `nome#TAG`, normalizado em minúsculas para comparação. | `id`, `normId`, `dispId` |
| Visitante | `guest` | Quem usa a Área do time sem conta. As mudanças ficam só neste navegador. | `GKEY` |
| Admin | `admin` | Conta com a chave de administração. | `ADMIN`, `adminUnlock` |
| Envio | `submission` | Proposta de mudança que um membro manda para aprovação. | `envios` (coleção), `lol-sent`, `SKEY` |
| Versão oficial | `officialVersion` | Dados do time aprovados e assinados pelo admin. | `oficial` (documento), `OFF`, `publish` |
| Ver como | `previewAs` | Simulação, pelo admin, da visão de membro, capitão ou visitante. | `lol-preview`, `PKEY` |

## Dados e análise

| Na tela | No código | Significado | Legado (não usar em código novo) |
| --- | --- | --- | --- |
| Fonte (Worlds, SoloQ) | `dataset: "worlds" \| "soloq"` | Base de partidas usada nas telas. | parâmetro `?fonte=` da URL (contrato), alias `@dataset/*` |
| Visão geral | `worldsOverview` | Página inicial do Worlds. | rota `geral` |
| Composições do Worlds | `proComposition` | Composições jogadas por equipes profissionais. Não confundir com `composition` da Área do time. | `worlds-compositions` (nome do slice, mantido) |
| Versões da interface | `uiVersions` | Histórico de mudanças visíveis exibido na Administração. | — |

## Nomes salvos (contratos)

Estes nomes ficam como estão até uma migração com ADR. O nome canônico é o que o código usa depois da fronteira. Se a migração acontecer, a chave nova segue o prefixo `weblol-` e o formato `weblol-<área>-<dado>`.

### Navegador

| Chave | Onde | Guarda | Nome canônico |
| --- | --- | --- | --- |
| `lol-comps-time-v1` | `localStorage` | Estado da Área do time (composições, jogadas) | `teamAreaState` |
| `lol-guest` | `localStorage` | Estado temporário do visitante | `guestState` |
| `lol-user` | `localStorage` | Conta conectada | `account` |
| `lol-team` | `localStorage` | Time da conta | `team` |
| `lol-base` | `localStorage` | Cópia da versão oficial usada para calcular as mudanças pendentes | `officialBaseline` |
| `lol-sent` | `localStorage` | Último envio | `lastSubmission` |
| `lol-admin-fp` | `localStorage` | Impressão digital da chave do admin | `adminKeyFingerprint` |
| `lol-admin-view-team` | `localStorage` | Time que o admin está vendo | `adminViewedTeam` |
| `lol-preview`, `lol-preview-backup` | `localStorage` | Modo "Ver como" e cópia do estado real | `previewAs` |
| `lol-img-<id>`, `lol-img-pendentes` | `localStorage` | Prints locais e fila de envio | `screenshotCache`, `pendingScreenshots` |
| `lol-comps-time` | `localStorage` | Chave antiga da Área do time, lida só na migração | — |
| `lol-time` | IndexedDB | Chaves do admin neste computador | `adminKeyStore` |
| `weblol-composition-palette` | `localStorage` | Tema do editor de composições | — |
| `weblol-map-cursor-size`, `weblol-map-cursor-color`, `weblol-map-champion-size` | `localStorage` | Preferências do Mapa tático | — |

### Firestore

As regras ficam em `firestore.rules`.

| Caminho | Guarda | Nome canônico |
| --- | --- | --- |
| `times/{time}` | Time | `team` |
| `times/{time}/dados/oficial` | Versão oficial do time | `officialVersion` |
| `times/{time}/envios/{id}` | Envios do time | `submission` |
| `times/{time}/imagens/{id}` | Prints do time | `screenshot` |
| `membros/{conta}` | Vínculo da conta com o time | `member` |
| `contas/{conta}` | Conta | `account` |
| `oficial/admin`, `oficial/{doc}` | Chave pública e dados do admin | `adminConfig` |
| `envios/{id}`, `usuarios/{id}`, `versoes/{doc}`, `adminKeys` | Coleções da administração | — |

### URL

| Rota ou parâmetro | Tela |
| --- | --- |
| `#/worlds`, `#/composicoes` | Worlds e Composições do Worlds |
| `#/builds?fonte=worlds\|soloq` | Builds |
| `#/time/composicoes/<id>?modo=draft\|taticas` | Composição na Área do time. Links antigos com `modo=lane` abrem a Ordem do draft. |
| `#/time/mapa`, `#/time/conhecimento`, `#/time/gestao` | Demais abas da Área do time |
| `#/admin` | Administração |
