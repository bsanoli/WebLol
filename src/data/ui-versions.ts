// Histórico de mudanças da interface, mostrado só na aba Administração.
// A cada mudança visível, acrescente uma versão no topo da lista.
export interface UiVersion {
  version: string
  date: string // AAAA-MM-DD
  changes: string[]
}

export const UI_VERSIONS: UiVersion[] = [
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
