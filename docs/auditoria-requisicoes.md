# Auditoria de requisições por rota

Medição em 19 de novembro de 2026 sobre os artefatos do GitHub Pages da revisão `8fb2918`, servidos localmente. O Chromium usou viewport de 1440 × 900, um contexto novo por entrada direta e cache HTTP habilitado. A tabela conta os GET locais com resposta 200 até 700 ms após a tela ficar visível. O volume é a soma dos corpos das respostas, sem compressão. O tráfego do Data Dragon aparece separado e pode variar conforme a rede, o cache e o carregamento de imagens.

## Entradas pelo painel

| Rota | GET locais | Volume local | GET Data Dragon | Carregamento fora da tela ou repetido |
| --- | ---: | ---: | ---: | --- |
| `#/worlds` | 68 | 4.725.776 B | 0 | O bundle de 1.982.720 B inclui dados e código de Builds e Composições. |
| `#/composicoes` | 128 | 6.224.040 B | 0 | Mesmo bundle, com Builds. A Visão geral renderiza primeiro. Os dados e painéis de todos os drafts são preparados antes de abrir **Ver draft**. |
| `#/builds?fonte=worlds` | 195 | 7.565.647 B | 3 | A Visão geral renderiza primeiro. A lista baixa partidas individuais que alimentam os confrontos da ficha. |
| `#/builds/ahri?fonte=worlds` | 91 | 4.980.701 B | 12 | A Visão geral renderiza primeiro. A seção Compras jogo a jogo baixa um JSON de 382.747 B e usa apenas os jogos do recorte selecionado. |
| `#/builds?fonte=soloq` | 191 | 9.721.176 B | 5 | O bundle de 4.272.506 B inclui partidas individuais. A entrada solicita CSS de Composições do Worlds e uma folha de 38.313 B idêntica à folha base do painel, com outra URL. |
| `#/builds/jayce?fonte=soloq` | 98 | 9.865.634 B | 16 | A lista renderiza primeiro. O JSON de Compras jogo a jogo contém toda a SoloQ e pesa 2.497.944 B. |
| `#/time/composicoes` | 221 | 9.338.064 B | 5 | Baixa o mapa realista de 2.093.130 B, o mapa base de 67.366 B e imagens do HUD. Também monta Conhecimento. |
| `#/time/mapa` | 221 | 9.338.064 B | 5 | Monta Composições e Conhecimento. Os cinco GET externos são imagens dos campeões da composição inicial. |
| `#/time/conhecimento` | 221 | 9.338.064 B | 5 | Baixa o mapa e as imagens da composição inicial. Monta os dois guias na abertura. |

O empacotamento do Pages acrescenta `?v=` ao `modulepreload` dos chunks do Vite. Os imports usam a URL sem query e o servidor recebe os dois GET. Na amostra, isso adicionou quatro transferências e **650.414 B** nas entradas de Worlds e Time, ou três transferências e **531.184 B** nas de SoloQ. A rota do iframe de estatísticas também é aplicada duas vezes, em `route-ready` e no evento `load`. A renderização repetida foi observada nas seis entradas de estatísticas. Os GET efetivos dependem da reutilização do cache de cada recurso. [Preparação do Pages](../scripts/prepare-pages.mjs#L34) · [Roteamento do painel](../public/assets/shell.js#L490) · [Inicialização do iframe](../src/app/entrypoints/worlds.ts#L121).

## Navegação e cache

Cada linha mede os novos GET locais no intervalo da interação, com a tela anterior já carregada. A janela de observação, o estado da rolagem e o carregamento de imagens podem mudar as contagens entre capturas.

| Interação | GET locais novos | Resultado |
| --- | ---: | --- |
| Visão geral → Composições do Worlds pelo menu | 41 | O iframe do Worlds e o bundle já estavam carregados. |
| **Ver draft** | 2 | Retratos de Kindred e Galio, 53.989 B. Os dados do draft já estavam embutidos. |
| Composições do Worlds → Builds pelo menu | 75 | Nenhum HTML novo. O mesmo iframe exibiu a lista Worlds. |
| Buscar Ahri e abrir a prévia | 28 | Sem GET do histórico de compras. O volume inclui os recursos solicitados após a busca. |
| Abrir a ficha de Ahri | 2 | O histórico de 382.747 B é um dos dois GET. |
| Trocar da lista Worlds para SoloQ e voltar | 35 na ida, 0 na volta | Abriu `soloq.html` na ida. As duas listas dispensaram o histórico de compras. |
| Trocar da ficha Worlds para SoloQ pela primeira vez | 22 | Abriu `soloq.html` e manteve a ficha de Ahri. O histórico inteiro de SoloQ veio nessa etapa. |
| Voltar da ficha SoloQ para Worlds | 0 | Reutilizou o iframe e o histórico já carregado. |
| Visão geral → Composições do Time pelo menu | 121 | Primeiro GET de `camp.html`. O volume de 5.446.255 B inclui as duas imagens de mapa solicitadas em Composições. |
| Composições → Mapa → Conhecimento → Controle de wave → Objetivos e tempos | 0 em cada etapa | Os recursos já tinham sido carregados com Composições. |
| Voltar a Worlds e reabrir Mapa pelo menu | 0 em cada etapa | Os dois iframes seguiram presentes. |
| Abrir o menu Conta | 0 | O popover usou o estado já carregado. |

### Entradas HTML e compatibilidade

| Entrada verificada | Comportamento observado |
| --- | --- |
| `/index.html`, `/#/rota-inexistente` | Abrem a Visão geral pelo painel e buscam o iframe do Worlds. |
| `/worlds.html`, `/worlds.html#/worlds/composicoes`, `/worlds.html#/builds/ahri` | Abrem Visão geral, Composições e a ficha, respectivamente. O mesmo bundle atende as três. Só a ficha pede o histórico de compras. |
| `/soloq.html`, `/soloq.html#/builds/jayce` | Abrem lista e ficha. Ambas solicitam o CSS de Composições do Worlds. Só a ficha pede o histórico de compras. |
| `/camp.html`, `/camp.html#/time/mapa` | Começam em Composições. O hash isolado do Time é interpretado pelo painel, e o mapa baixa nas duas entradas. |
| `/#/worlds/composicoes` | Normaliza para `#/composicoes`. |
| `/#/campeoes`, `/#/worlds/campeoes` | Normalizam para Builds do Worlds com filtro Top. |
| `/#/worlds/builds/ahri`, `/#/soloq`, `/#/soloq/builds/jayce` | Normalizam para Builds com a fonte e o campeão correspondentes, quando há campeão. |
| `/#/worlds/confrontos/mid/ahri`, `/#/worlds/jogadores` | Abrem, respectivamente, a ficha Worlds de Ahri em Mid e a Visão geral. |
| `/worlds.html#/campeoes`, `/worlds.html#mid`, `/worlds.html#jogadores`, `/worlds.html#confrontos` | As duas primeiras abrem Builds com filtro Top e Mid. As demais abrem a Visão geral. |
| `/#/time` | Abre Composições e já pede o mapa realista e o mapa base. |
| `/#/time/conhecimento/wave`, `/#/time/conhecimento/objetivos` | Abrem o guia solicitado. Os dois guias foram preparados durante a inicialização. |
| Links de Time para uma composição ou jogada ausente | O painel mostrou o aviso de indisponibilidade na seção correspondente. Os recursos das outras seções continuaram no carregamento inicial. |

## Sessões simuladas

As contagens abaixo são chamadas observadas na interface do SDK, com autenticação e documentos sintéticos. Elas representam o comportamento do aplicativo. Tráfego, cache interno e faturamento do Firebase real ficaram fora da medição.

| Sessão e rota | Abertura | Sondagem e origem |
| --- | --- | --- |
| Membro ativo em Worlds, Composições do Worlds, Builds de ambas as fontes e Composições, Mapa e Conhecimento do time | 3 leituras em cada entrada | A inicialização lê membro, time e documento oficial. A sondagem lê o oficial uma vez com a versão estável e duas vezes com a versão alterada, pois a sincronização busca de novo o resultado recém-lido. |
| Capitão em `#/time/gestao` | 5 leituras | Além da inicialização, a Gestão consulta membros do time e o documento oficial novamente. Com versão alterada, a sondagem gerou quatro leituras, três do oficial e uma de membros. |
| Admin desbloqueado em `#/admin`, com dois times e migração concluída | 17 leituras | A abertura renderiza o painel antes e depois da entrada no time. Na amostra, houve duas listas de contas, três de times, duas globais de membros, uma filtrada de membros, uma de envios, cinco documentos oficiais e três leituras de inicialização. O resumo recolhido de Times usa documentos oficiais completos. |

A verificação autenticada usou apenas dados sintéticos, com zero escritas observadas. [Inicialização e sondagem](../public/assets/shell.js#L610) · [Gestão do time](../public/assets/shell.js#L331) · [Administração](../public/assets/shell.js#L371) · [Leitura e sincronização do documento oficial](../public/assets/sync.js#L209).

- Abrir **Conta** fez zero novas leituras para visitante, membro, capitão e admin. O visitante viu a entrada, os três perfis autenticados viram a versão oficial e só o admin viu o seletor de time. A lista de times do seletor já tinha sido consultada antes de abrir o menu, em Worlds.
- Navegar de Worlds para Composições do Time pediu `camp.html` na primeira visita. Nos perfis autenticados, a ida e a volta fizeram zero novas leituras. O visitante recebeu o modal de login. A volta reutilizou o iframe do Worlds.
- Em Gestão, o membro viu jogadores e histórico. Capitão e admin também viram a ação para aceitar o pedido fictício. Visitante não recebeu o painel. Em Administração, visitante e membro permaneceram no Time, com zero novas leituras. Capitão e admin abriram Administração, com duas e sete leituras, respectivamente, após o carregamento da sessão.
- Com Gestão aberta e o iframe do Time já carregado, o capitão fez uma leitura em versão estável. Na mudança para v2, a tela exibiu a nova versão. Até a atualização ficar visível, foram quatro leituras do oficial e duas da lista de membros, contando a atualização do iframe. A medição da sondagem em entrada direta teve uma janela menor.

## Prioridades de correção

1. **Eliminar os downloads duplicados do Pages.** Preservar a URL emitida pelo Vite para chunks com hash e aplicar o versionamento aos arquivos estáticos copiados de `public/`. Conferir que cada URL de `modulepreload` é idêntica à do import correspondente. [Preparação do Pages](../scripts/prepare-pages.mjs#L34).
2. **Carregar o mapa, Composições e Conhecimento ao entrar em cada seção.** Inicializar a primeira rota efetiva do Time e adiar imagens e código próprios de cada seção. Conferir o mapa realista somente quando o modo estiver ativo e preservar os dados locais ao trocar de aba. Os dois guias de Conhecimento já são montados juntos, então a abertura de uma aba é o ponto de partida para medir o que pode ser adiado da outra. [Inicialização da Área do time](../src/pages/team/ui/team-page.ts#L562) · [Imagem do mapa](../src/widgets/tactical-map/ui/tactical-map.ts#L49) · [Guias](../src/widgets/team-knowledge/ui/knowledge.ts#L48).
3. **Separar dados e estilos das telas de estatísticas.** Visão geral e Composições podem dispensar dados de Builds. Na lista de Builds, preservar os agregados que alimentam a prévia, contagens e busca por item. O campo de jogos individuais ocupa cerca de 680 KB no Worlds e 2,44 MB na SoloQ em JSON minificado. A ficha usa esses dados nos confrontos por adversário e pode carregar o recorte pertinente. Carregar compras por campeão quando a seção aparecer, com posição e adversário filtrados a partir desse recorte. Em Composições, carregar o detalhe do draft quando o botão abrir. [Imports de estatísticas](../src/app/entrypoints/worlds.ts#L1) · [Dados de Builds](../src/pages/builds/ui/build-details.ts#L3) · [Histórico de compras](../src/pages/builds/ui/load-build-timeline.ts#L1) · [Drafts](../src/pages/worlds-compositions/ui/match-card.ts#L5).
4. **Reduzir as leituras do time.** Reaproveitar o resultado da sondagem quando ela aciona a sincronização. Nas telas públicas autenticadas, separar a informação que o cabeçalho precisa dos dados oficiais usados na Área do time. Em Gestão e Administração, aguardar os dados da sessão antes da primeira consulta completa e buscar o resumo de Times quando a seção precisar dele. Validar versão recebida, permissões e indicadores da conta com os três perfis antes de alterar os gatilhos. [Inicialização e renderização](../public/assets/shell.js#L610) · [Administração](../public/assets/shell.js#L371).

Os tamanhos candidatos se sobrepõem. O total da linha já inclui os recursos citados nela. A compressão e a política de cache em produção podem mudar o volume transferido. A análise dos artefatos exclui as alterações locais em andamento nos fontes do mapa.
