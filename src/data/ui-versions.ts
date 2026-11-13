// Histórico de mudanças da interface, mostrado só na aba Administração.
// A cada mudança visível, acrescente uma versão no topo da lista.
export interface UiVersion {
  version: string
  date: string // AAAA-MM-DD
  changes: string[]
}

export const UI_VERSIONS: UiVersion[] = [
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
