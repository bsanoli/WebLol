// Histórico de mudanças da interface, mostrado só na aba Administração.
// A cada mudança visível, acrescente uma versão no topo da lista.
export interface UiVersion {
  version: string
  date: string // AAAA-MM-DD
  changes: string[]
}

export const UI_VERSIONS: UiVersion[] = [
  {
    version: "1.60",
    date: "2026-11-19",
    changes: ["Táticas: seletor Draft / Picks prioritários acima da barra do time; Picks prioritários mostra os campeões de cada lane em ordem de prioridade, sem as notas."],
  },
  {
    version: "1.59",
    date: "2026-11-19",
    changes: ["Táticas: botão direito num pick abre um menu para trocar o campeão por um dos alternativos da comp; o pick mostra quantos alternativos tem (+1, +2…)."],
  },
  {
    version: "1.58",
    date: "2026-11-19",
    changes: ["Composições: nova aba Táticas, com um campo grande de texto à esquerda e, à direita, as comps do time e os picks e bans da comp escolhida em formato reduzido. Há também Táticas gerais, sem composição."],
  },
  {
    version: "1.57",
    date: "2026-11-19",
    changes: ["Builds (página do campeão): em Compras jogo a jogo, cada partida mostra abaixo do KDA os feitiços, a runa principal e a árvore secundária usados nela, na SoloQ e no Worlds."],
  },
  {
    version: "1.56",
    date: "2026-11-19",
    changes: ["Builds: SoloQ passa a ser a fonte principal. Fica à esquerda no seletor SoloQ | Worlds e abre por padrão ao entrar em Builds."],
  },
  {
    version: "1.55",
    date: "2026-11-19",
    changes: ["As abas Worlds, SoloQ e Área do time sempre conferem se há versão nova ao abrir, para as correções aparecerem sem esperar o cache do navegador."],
  },
  {
    version: "1.54",
    date: "2026-11-19",
    changes: ["Ordem do draft: o nome do campeão volta a ficar em uma linha, ao lado do nome do pick."],
  },
  {
    version: "1.53",
    date: "2026-11-19",
    changes: ["Composições: ao clicar numa composição, a lista mantém a posição do scroll em vez de voltar ao topo."],
  },
  {
    version: "1.52",
    date: "2026-11-19",
    changes: ["Ordem do draft: saiu o ícone pequeno do campeão ao lado esquerdo do nome no pick; a foto de fundo continua."],
  },
  {
    version: "1.51",
    date: "2026-11-18",
    changes: ["Botões de wave por lado, menu de limpeza por tipo e barra de ferramentas estável durante o zoom."],
  },
  {
    version: "1.50",
    date: "2026-11-18",
    changes: ["O menu do clique direito identifica e destaca o elemento selecionado no mapa."],
  },
  {
    version: "1.49",
    date: "2026-11-18",
    changes: [
      "O mapa usa toda a largura disponível e tem cursores próprios para as ferramentas.",
      "Uma wave por equipe em cada rota, com ícones de minions conjuradores.",
      "Menu de contexto para excluir elementos e controle de Lumes adicionais ligado à exibição dos Lumes.",
    ],
  },
  {
    version: "1.48",
    date: "2026-11-18",
    changes: ["A linha da seta reta termina dentro da ponta, sem ultrapassá-la."],
  },
  {
    version: "1.47",
    date: "2026-11-18",
    changes: ["Ícones próprios nas ferramentas do mapa e lista de composições com retratos dos campeões."],
  },
  {
    version: "1.46",
    date: "2026-11-18",
    changes: ["Camadas e Composições aparecem primeiro no painel do mapa."],
  },
  {
    version: "1.45",
    date: "2026-11-18",
    changes: ["O menu Área do time fecha ao clicar no conteúdo da página abaixo do cabeçalho."],
  },
  {
    version: "1.44",
    date: "2026-11-18",
    changes: ["Ferramentas disponíveis em todas as visões e encaixe mais limpo na ponta da seta de traço livre."],
  },
  {
    version: "1.43",
    date: "2026-11-18",
    changes: ["Visão junto às ferramentas do mapa e card de abas com menos espaço interno."],
  },
  {
    version: "1.42",
    date: "2026-11-18",
    changes: [
      "Troca de visão em um clique, câmera no canto do mapa e abas agrupadas no painel.",
      "Atalhos de desenho, Borracha para wards e ponta de seta mais estável nas curvas.",
    ],
  },
  {
    version: "1.41",
    date: "2026-11-18",
    changes: [
      "As waves passam pelo centro das curvas do Topo e da rota Inferior no mapa realista.",
      "O lado da ward é editado em um menu junto à peça, sem redimensionar o mapa.",
    ],
  },
  {
    version: "1.40",
    date: "2026-11-18",
    changes: [
      "Menu Arquivos na barra do mapa e painel em abas com paginação dos passos.",
      "O zoom do mapa usa toda a área livre ao redor da imagem.",
    ],
  },
  {
    version: "1.39",
    date: "2026-11-18",
    changes: ["O menu Área do time usa as transições e a navegação por teclado do Intent UI."],
  },
  {
    version: "1.38",
    date: "2026-11-18",
    changes: [
      "Mapa tático inteiro na janela, camadas no painel lateral e colocação de waves pela rota mais próxima.",
      "A Área do time ganhou um menu no cabeçalho. Os quatro Lumes extras agora têm um controle próprio.",
    ],
  },
  {
    version: "1.37",
    date: "2026-11-18",
    changes: [
      "O mapa tático ganhou espaço com uma barra compacta e uma única lateral.",
      "Campeões podem ser movidos em todas as visões. Resetar mapa restaura posições e torres e limpa anotações.",
    ],
  },
  {
    version: "1.36",
    date: "2026-11-18",
    changes: [
      "Controles compactos no mapa tático, zoom com a roda e navegação ao segurar Espaço.",
      "Uma wave de seis minions por rota e opção de ponta de seta no traço livre.",
    ],
  },
  {
    version: "1.35",
    date: "2026-11-18",
    changes: [
      "Mapa tático com zoom, tela cheia, traço livre e ajustes de estilo de desenho.",
      "Visão tática por lado, wards móveis, waves por rota e alcance de ataque das torres.",
      "Rift Elemental por jogada, com terreno esquemático e ícones de rota nos marcadores.",
    ],
  },
  {
    version: "1.34",
    date: "2026-11-18",
    changes: [
      "Mapa tático centralizado, com ferramentas e sequência da jogada nas laterais.",
      "Mapa realista, Lumes Feéricos e alcance de visão por tipo de ward.",
      "Limpar tudo remove setas e wards em uma ação reversível.",
    ],
  },
  {
    version: "1.33",
    date: "2026-11-13",
    changes: [
      "Builds reúne Worlds e SoloQ, com filtros por posição e adversário na página do campeão.",
      "As frequências das runas usam a amostra da árvore selecionada.",
      "Compras jogo a jogo mostra cinco partidas por vez e abre com itens completos e botas.",
    ],
  },
  {
    version: "1.32",
    date: "2026-11-13",
    changes: [
      "Topo: botão Cadastrar à esquerda do seletor de tema para quem não entrou com usuário.",
      "Área do time: quem entra sem usuário vê uma comp de exemplo genérica, e não mais a comp do time.",
    ],
  },
  {
    version: "1.31",
    date: "2026-11-13",
    changes: [
      "Gestão do time: todos do time veem a aba, com os jogadores e o histórico das comps; só o capitão aceita pedidos e exclui jogadores.",
      "Gestão do time: o histórico inteiro fica num item recolhível.",
      "Ver como (admin): novas visões Capitão do time e Membro do time (não capitão).",
    ],
  },
  {
    version: "1.30",
    date: "2026-11-13",
    changes: [
      "Área do time: nova aba Gestão do time, só para o capitão (e admins), para aceitar ou recusar pedidos de entrada, excluir jogadores do time, ver os jogadores e o histórico das versões das comps com cada alteração.",
    ],
  },
  {
    version: "1.29",
    date: "2026-11-13",
    changes: [
      "Builds (Worlds e SoloQ): Compras jogo a jogo abre em Todas as compras, que agora é a primeira opção; Itens completos e botas fica como alternativa.",
    ],
  },
  {
    version: "1.28",
    date: "2026-11-13",
    changes: [
      "Menu da conta (só admin): novo campo \"Ver como\" para ver o site como um usuário sem admin ou como quem não tem conta. É só uma simulação: nada é enviado, e as comps do admin voltam ao sair dessa visão.",
    ],
  },
  {
    version: "1.27",
    date: "2026-11-13",
    changes: [
      "Composições: cada comp mostra uma bolinha azul ou vermelha ao lado do nome, indicando o lado escolhido para ela.",
    ],
  },
  {
    version: "1.26",
    date: "2026-11-13",
    changes: [
      "Ordem do draft: em todos os picks, o nome do pick e o campeão ficam sempre abaixo da lane e das alternativas, mesmo em telas mais baixas.",
    ],
  },
  {
    version: "1.25",
    date: "2026-11-13",
    changes: [
      "Ordem do draft: a área de comps do centro mostra exatamente duas fileiras; as demais comps aparecem pela rolagem.",
    ],
  },
  {
    version: "1.24",
    date: "2026-11-13",
    changes: [
      "Composições (tela larga): o nome da comp fica na mesma linha, à esquerda de Opções por posição / Ordem do draft.",
      "Composições (tela larga): Copiar link da composição fica ao lado esquerdo de Limpar alterações, e Salvo neste navegador desce para a linha de Anotações da composição.",
    ],
  },
  {
    version: "1.23",
    date: "2026-11-13",
    changes: [
      "Catálogo de campeões: Ordenar por e Lane do time ficaram mais compactos.",
      "Catálogo de campeões: saíram o rodapé com a contagem de campeões e a dica com os números do Worlds ao passar o mouse.",
    ],
  },
  {
    version: "1.22",
    date: "2026-11-13",
    changes: [
      "Composições: saiu a opção Participaram do Worlds do catálogo de campeões.",
    ],
  },
  {
    version: "1.21",
    date: "2026-11-13",
    changes: [
      "Ordem do draft: os cartões das comps no centro esticam e ocupam toda a largura do campo, sem espaço vazio à direita.",
    ],
  },
  {
    version: "1.20",
    date: "2026-11-13",
    changes: [
      "Composições: quando a comp tem anotação, o item Anotações da composição recolhido fica em destaque, com um ícone de lápis, para o time saber que há algo escrito.",
    ],
  },
  {
    version: "1.19",
    date: "2026-11-13",
    changes: [
      "Worlds e SoloQ abrem sem usuário nem time. O login e a escolha de time só aparecem ao entrar na Área do time.",
      "Área do time: novo botão \"Entrar sem usuário\" no login. As comps e alterações feitas ficam só até recarregar a página.",
      "Administração > Times: coluna \"Versão das comps\" com a versão atual de cada time, quantas comps tem, quando e por quem foi publicada.",
    ],
  },
  {
    version: "1.18",
    date: "2026-11-13",
    changes: [
      "Nova área SoloQ no menu do topo, com a aba Builds: builds de jogadores profissionais nas ranqueadas solo/duo (KR, EUW, NA e BR), no mesmo formato das Builds do Worlds.",
      "SoloQ: os dados vêm da API oficial da Riot e são atualizados automaticamente uma vez por dia. Em Compras jogo a jogo aparecem o pro, o servidor e a data de cada partida.",
    ],
  },
  {
    version: "1.17",
    date: "2026-11-13",
    changes: [
      "Ordem do draft: os campeões mostrados em cada comp seguem a ordem de pick do lado escolhido (First Pick primeiro).",
      "Admins: no menu da conta, o campo Ver o time troca o time que está sendo visto para conferir as comps e jogadas de outros times.",
    ],
  },
  {
    version: "1.16",
    date: "2026-11-12",
    changes: [
      "Ordem do draft: os picks têm nome pela ordem do draft (First Pick, Dupla B2/B3, Dupla B4/B5, Dupla R1/R2, Solo R3, Solo R4, Last Pick) no lugar de B1, R1...",
      "Ordem do draft: para escolher o lado do time, clique em Lado azul ou Lado vermelho acima das comps. Em telas menores continuam os botões Nossa equipe.",
    ],
  },
  {
    version: "1.15",
    date: "2026-11-12",
    changes: [
      "Ordem do draft: os picks não têm mais nota nem menu ⋯. Clique no retrato para torná-lo principal, arraste para reordenar e use o botão direito para excluir.",
      "Ordem do draft: saiu a faixa com a ordem de bans e picks acima do catálogo de campeões.",
      "Catálogo de campeões: a lane de destino fica ao lado de Ordenar por, no lugar do quadro de destino que ficava acima.",
      "Picks e opções por posição: a arte do campeão agora vem em alta resolução do Data Dragon, com a cópia local como reserva.",
    ],
  },
  {
    version: "1.14",
    date: "2026-11-12",
    changes: [
      "Ordem do draft (tela larga): layout no estilo drafter.lol, com os picks em faixas largas nas laterais (azul à esquerda, vermelho à direita) e os bans acima dos picks.",
      "Ordem do draft: o catálogo de campeões fica no centro, entre os dois lados, com os nomes Lado azul e Lado vermelho no topo.",
      "Ordem do draft: as comps do time aparecem como abas no centro, mostrando o primeiro campeão de cada lane, com botão + para criar uma nova.",
    ],
  },
  {
    version: "1.13",
    date: "2026-11-12",
    changes: [
      "Login: cada jogador entra com Riot ID e senha. No primeiro acesso ele cria a senha.",
      "Times: cada jogador fica em um time com capitão. Quem não tem time vê uma tela para criar um time, pedir para entrar em um time ou usar sem time (sem salvar as comps).",
      "Área do time: cada time só vê as próprias comps e jogadas. O botão no topo mostra o time e a versão oficial.",
      "Administração: o capitão aceita ou recusa pedidos para entrar no time e aprova os envios do time.",
      "Administração: membros, histórico da versão oficial, usuários, times e versões da interface ficam em itens recolhíveis.",
      "Administração: o admin pode excluir usuários e escolher ou trocar o time de cada um.",
    ],
  },
  {
    version: "1.12",
    date: "2026-11-10",
    changes: [
      "Conhecimento: objetivos, minions, torres e fast push usam ícones do League of Legends.",
      "Navegação e draft: ícones distintos para equipe, composições, campeões, builds e picks vazios.",
    ],
  },
  {
    version: "1.11",
    date: "2026-11-10",
    changes: [
      "O visual de Composições serviu de base para a tipografia, as cores, as bordas e os raios compartilhados no painel.",
    ],
  },
  {
    version: "1.10",
    date: "2026-11-10",
    changes: [
      "Botões padronizados no cabeçalho, Worlds, Área do time e Administração, com o mesmo tratamento para ações principais, secundárias, seleções e exclusões.",
      "Mapa tático: as amostras de cor das setas ficam visíveis nos botões.",
    ],
  },
  {
    version: "1.9",
    date: "2026-11-09",
    changes: [
      "Composições: botão Limpar alterações restaura a última versão oficial sincronizada ou os dados iniciais, com confirmação e preservação do login e tema.",
    ],
  },
  {
    version: "1.8",
    date: "2026-11-09",
    changes: [
      "Composições: editor e catálogo atualizados, com arte de campeão nos picks definidos e menu de ações em cada composição.",
      "Composições: dez temas com amostras de cor. WebLol usa o dourado original e a escolha fica salva no navegador.",
    ],
  },
  {
    version: "1.7",
    date: "2026-11-09",
    changes: [
      "Composições: a escolha da comp voltou a ser uma coluna de botões à esquerda de \"Monte o plano\", com o nome da comp e os campeões principais.",
      "Ordem do draft: as anotações (plano do draft, anotações da comp e obs. das lanes) ficam no mesmo painel recolhível ao lado de \"Monte o plano\". A caixa de comentários do rodapé saiu.",
      "Ordem do draft: a barra Lado azul / Lado vermelho foi para o centro da linha dos bans.",
      "Ordem do draft: picks e bans têm numeração própria (1º a 10º cada).",
      "Ordem do draft: o card do pick tem as informações no canto, a lane logo abaixo e os campeões maiores.",
      "Composições: as anotações viraram um painel recolhível ao lado de \"Monte o plano\".",
      "Administração: novo item \"Versões da interface\" com este histórico.",
    ],
  },
  {
    version: "1.6",
    date: "2026-11-09",
    changes: [
      "Worlds: visão geral melhorada.",
      "Draft: interface do editor de draft atualizada.",
      "Mapa tático: interface atualizada.",
    ],
  },
  {
    version: "1.5",
    date: "2026-11-09",
    changes: ["Novo visual do painel inteiro (cabeçalho, abas, botões e cartões)."],
  },
  {
    version: "1.4",
    date: "2026-11-09",
    changes: [
      "Administração: seção Admins para liberar outro admin com senha provisória. No primeiro acesso ele cria a senha dele.",
    ],
  },
  {
    version: "1.3",
    date: "2026-11-09",
    changes: [
      "Login só com o Riot ID: não precisa mais escolher a pasta do OneDrive.",
      "Administração: botões \"Importar da pasta\" e \"Baixar backup completo\"; lista de usuários por aparelho.",
    ],
  },
  {
    version: "1.2",
    date: "2026-11-09",
    changes: [
      "Login com Riot ID (nome + #TAG) e admin com senha.",
      "Botão \"Enviar para aprovação\" e aba Administração para aprovar ou recusar envios.",
    ],
  },
  {
    version: "1.1",
    date: "2026-11-09",
    changes: ["Painel do time com as abas Worlds e Campeonato num só site."],
  },
]
