# Revisão da interface do WebLol

O painel tem duas tarefas distintas: consultar o Worlds e preparar o jogo do time. A revisão conserva a paleta escura e o dourado como sinal de ação ou seleção. Nas análises, azul e coral distinguem picks e bans, acompanhados de texto e legendas. As superfícies recebem bordas discretas e os números usam largura fixa para facilitar comparação.

| Tela | Intenção e dados | Problema encontrado | Ajuste |
| --- | --- | --- | --- |
| Visão geral | Entender quais campeões dominaram o draft. Jogos, campeões, picks, bans, presença e vitórias. | Rankings longos competiam entre si e os KPIs apareciam em todas as abas. | Resumo exclusivo da visão geral, presença primeiro, legendas e escalas explícitas. O ranking começa em 8 e expande para 15. |
| Campeões | Encontrar um campeão por posição e ler seus detalhes. Jogos na posição, taxa geral, bans, presença e K/D/A quando coletado. | Cabeçalhos pequenos, tabela larga e nenhum feedback ao filtrar sem resultados. | Controles e linhas mais legíveis, expansão com estado acessível e tabela rolável com foco. |
| Builds | Encontrar um campeão ou item e consultar frequência de itens, runas e feitiços. | Todos os detalhes eram montados em todos os cards. A build aberta tinha linhas largas e pouco agrupamento. | Catálogo com prévia e detalhe na rota do campeão, seções em colunas no desktop e uma coluna no celular. |
| Confrontos | Comparar o campeão selecionado com adversários na mesma posição. Jogos, vitórias, KDA dos dois lados. | Rótulos podiam soar como recomendação definitiva com amostras pequenas. | Destaques descritos como taxa observada, aviso sobre amostra e tabela com rolagem interna. |
| Composições do Worlds | Revisar as escolhas dos dois times por partida. Fase, vencedor, jogadores, campeões e K/D/A. | Identificação da partida e os dados de cada posição tinham pouco contraste de hierarquia. | Placares com títulos maiores, separação entre linhas e filtros com a mesma aparência das demais análises. |
| Jogadores | Ver a amostra coletada e comparar desempenho por posição. Jogos, vitórias, K/D/A e campeões. | A tabela exigia comparação manual e não explicava a ausência de resultados. | Comparação expansível de dois jogadores da mesma posição, com barras, valores e tamanho de amostra. |
| Composições do time | Selecionar e editar uma composição, ordenar o draft e registrar planos. | Três colunas espremiam o editor; ações e destino dos campeões eram pouco claros. | Biblioteca no topo, mais espaço para o editor, catálogo com destino explícito e atalho no celular. Sequência do draft sob demanda. |
| Mapa tático | Organizar posições, setas e etapas de uma jogada. | Controles apertados, rolagem dentro da lateral e instruções longas. | Agrupamento por tarefa, mapa fixo durante a rolagem no desktop e instruções expansíveis. |
| Conhecimento | Consultar objetivos, temporizadores e controle de ondas. | Texto pequeno e grade rígida. | Texto com mais altura de linha e grade adaptável. |
| Conta e administração | Identificar o usuário, acompanhar sincronização e revisar envios. | A troca de área podia mostrar uma tela vazia enquanto carregava. | Estado de carregamento e erro consistente no painel. Fluxos administrativos preservados; publicação e credenciais não foram exercitadas na revisão. |

Os blocos de resumo, ranking e comparação são componentes React/TypeScript. O restante das telas continua no fluxo existente. Não há nova dependência, consulta de rede ou alteração de dados. A comparação usa os totais já coletados, com médias por jogo calculadas a partir da amostra de cada jogador. A base não traz CS, dano ou visão e não há radar existente. Um radar futuro depende de métricas e referências comparáveis por posição.

Referências para decisões de navegação e densidade de informação: [OP.GG](https://op.gg/), [OP.GG Esports](https://esports.op.gg/), [Mobalytics](https://mobalytics.gg/lol) e [League of Graphs](https://www.leagueofgraphs.com/).

## Padrões compartilhados

“Explore por posição” serve de referência para a densidade das análises. As tabelas compartilham divisores discretos, cabeçalhos secundários e números tabulares. Os percentuais de vitória usam cor no texto e mantêm o mesmo arredondamento e os mesmos limiares de destaque.

Os tokens ficam em `public/assets/base.css`, carregado nas três entradas. Use `.wl-panel` para superfícies em HTML e `Card` para superfícies em React. Ambos compartilham fundo, borda e raio. Use `--wl-panel-padding` e `--wl-panel-gap` para painéis comuns e `.wl-card-title` para títulos compactos. Os botões React e HTML compartilham `data-slot="button"`, as variantes e os tamanhos. Campos de uma linha seguem a altura padrão dos botões, com a altura compacta no catálogo de campeões e nas calculadoras.

Worlds, Mapa, Conhecimento e Administração usam o mesmo limite de largura. O editor de Composições mantém o espaço necessário para mostrar biblioteca, editor e catálogo lado a lado. Os temas de Composições continuam a alimentar os tokens locais, e as cores de lado, resultado e posição ficam restritas aos pontos em que codificam informação.
