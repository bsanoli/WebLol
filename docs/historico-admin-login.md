# Histórico de admin e login

Registro de tudo o que muda em login, contas, times, capitão e Administração.
Regra do Bruno (13/11/2026): toda alteração nessa área entra aqui, com o pedido, a decisão tomada e o que mudou.
Mudança importante só é feita depois de perguntar ao Bruno, e a escolha dele também fica registrada aqui.

Formato de cada entrada: data, pedido (palavras do Bruno), decisão (quem escolheu e o quê), o que mudou, commit e regras do Firestore.

---

## 13/11/2026 — migração visual para shadcn/ui

- **Pedido:** “implemente toda a migração sugerida, e apenas finalize quando estiver tudo pronto”.
- **Decisão:** usar o Dialog do shadcn para os passos do login e o AlertDialog para as confirmações existentes da conta, da gestão e da Administração.
- **Mudança:** o menu da conta usa Popover, os campos de login têm rótulos agrupados e os erros são anunciados. As tabelas de capitão e Administração usam cabeçalhos de coluna e rolagem própria. Os passos de login e as regras de acesso continuam no fluxo existente.
- **Regras do Firestore:** nenhuma alteração.

## 13/11/2026: limpeza de rotinas sem uso

- **Pedido:** remover código sem uso e publicar a limpeza.
- **Decisão:** remover os auxiliares sem chamadas no código atual, incluindo a antiga seleção de pasta do OneDrive, a geração de chaves e a assinatura e criptografia legadas sem consumidores. A leitura de dados legados e as rotinas usadas pelo login e pela Administração continuam disponíveis.
- **Regras do Firestore:** nenhuma mudança.

## 13/11/2026: comp de exemplo para quem não tem cadastro e botão Cadastrar

- **Pedido:** "para a pessoa sem cadastro, coloque uma comp genérica para aparecer na área do time e não a do xlsx. Também coloque um botão à esquerda da escolha do tema para poder cadastrar."
- **Decisão:** pedido direto do Bruno, sem escolha extra.
  - A comp inicial que vinha do comps.xlsx do time saiu do código. Agora quem não tem as comps de um time (sem usuário, sem time) vê a "Comp de exemplo: luta em time": Ornn/Sion, Sejuani/Vi, Orianna/Azir, Jinx/Aphelios e Braum/Rell.
  - Quem está num time continua vendo a versão oficial do time.
  - O botão "Cadastrar" aparece no topo, à esquerda do tema, só para quem não entrou com usuário. Ele abre a Área do time com a tela do Riot ID, que serve tanto para criar a conta quanto para entrar. No "Ver como" sem conta, o botão aparece, mas só avisa que é uma visualização.
- **Regras do Firestore:** nenhuma mudança.
- Versão da interface 1.32.

## 13/11/2026: Gestão do time para todo o time e "Ver como" capitão e membro

- **Pedido:** "todos do time devem ter a aba de gestão do time com os jogadores que estão no time e o histórico de comps. Mas só o capitão pode aceitar a entrada no time ou excluir alguém do time. No histórico do time na gestão do time, faça um dropdown para o histórico inteiro para não ficar muito grande a tela. Com acesso de admin, faça algumas visões com essa variação da pessoa ser capitão ou não do time para eu ver como está ficando".
- **Decisão:** pedido direto do Bruno, sem escolha extra.
  - Todo membro ativo vê a aba, com os jogadores e o histórico.
  - Pedidos para entrar e o botão Excluir do time aparecem só para o capitão e para os admins.
  - O membro vê quem é o capitão.
  - O histórico inteiro fica num item recolhível ("Ver o histórico inteiro"), fechado por padrão. A versão atual continua visível.
- **"Ver como" dos admins:** as opções agora são Admin, Capitão do time, Membro do time (não capitão) e Sem conta cadastrada.
  - Em "Capitão do time" os botões aparecem, mas ficam desativados, também na aba Administração. Nada é gravado.
- **Regras do Firestore:** membro ativo pode listar os membros do próprio time. Ele não pode aceitar, editar nem excluir ninguém, e não vê os membros de outros times. Testado no emulador. O Bruno publica as regras à mão.
- Versão da interface 1.31.



- **Pedido:** "faça uma aba dentro de Área do Time para gestão do capitão do time. O capitão poderá aceitar os pedidos para entrar no time, excluir pessoas do time, ver os players do time dele e ter um histórico das comps e alterações do seu time".
- **Decisão:** a aba fica ao lado de Composições, Mapa tático e Conhecimento. Só o capitão do time e os admins desbloqueados veem a aba. No "Ver como" ela some. Pedido feito pelo Bruno, então não houve escolha extra.
- **O que mudou:**
  - Nova aba "Gestão do time" (rota /time/gestao).
  - Pedidos para entrar: o capitão pode aceitar ou recusar.
  - Jogadores do time, com papel e data de entrada. O capitão pode excluir do time (menos ele mesmo).
  - Histórico das comps: a versão oficial atual e cada versão com as alterações aprovadas e recusadas, e quem enviou.
  - A Administração continua com as mesmas funções.
  - Jogador excluído perde o acesso às comps do time (as regras já bloqueiam). Na próxima entrada, a cópia local do time é apagada e ele volta para a tela de escolher time.
  - **Escolha do Bruno (13/11/2026, cartão de decisão):** "Apagar a cópia local (como está)". Quem é excluído não fica com as comps do time.
- **Regras do Firestore:** nenhuma mudança.
- **Commit:** dbdce77. Versão da interface 1.30.

## 13/11/2026: "Ver como" para admins

- **Pedido:** "faça uma opção para o adm ter a visão da pessoa sem adm e da pessoa sem conta cadastrada".
- **Decisão:** a opção fica num seletor no menu da conta, com "Admin", "Usuário sem admin" e "Sem conta".
  - Nesse modo nada é publicado nem enviado.
  - As comps locais do admin são guardadas e voltam ao sair do modo.
- **Commit:** e3aa442. Versão da interface 1.28.

## 13/11/2026: login só na Área do time, entrar sem usuário e versão das comps por time

- **Pedido:** pedir usuário e time só ao entrar na Área do time. Worlds e SoloQ abrem sem login. Ter uma opção de entrar na Área do time sem usuário. Na Administração, em Times, mostrar a versão atual das comps de cada time.
- **Decisão:** o modo "Entrar sem usuário" é temporário: as alterações ficam só no navegador e somem ao recarregar. Em Times, a tabela mostra a versão atual, quantas comps tem, a data e quem publicou.
- **Commit:** 3cbc75a. Versão da interface 1.19.

## 13/11/2026: admins podem ver outros times

- Feito pela thread do Campeonato (commit 172b602): o admin escolhe no menu da conta qual time quer ver.

## 12/11/2026: times com capitão

- **Pedido:**
  - Todo usuário fica num time, e o capitão aceita quem entra.
  - Cada time vê só as próprias comps.
  - Tela para criar time, entrar num time ou usar sem time.
  - Todos os usuários vão para o Fraldinha, com brunoltz#LTZ como capitão.
  - Na Administração, histórico e usuários ficam em seções recolhíveis, com excluir usuário e trocar de time.
- **Decisão do Bruno:** "Riot ID + senha própria" para o login (cartão de decisão).
- **O que mudou:**
  - Contas Firebase `<nome_tag>@weblol.app`.
  - Coleções contas, times, membros, times/{id}/dados e times/{id}/envios.
  - Novas regras do Firestore, publicadas pelo Bruno em 12/11.
- **Correção no mesmo dia:**
  - **Pedido:** "foi resetado as comps que já estavam salvas, quero que aquelas comps vá para o time Fraldinha".
  - A v27 antiga e todos os usuários foram copiados para times/fraldinha-9kkn.
  - A migração passou a rodar uma vez só (marcador oficial/migracao).
- **Commits:** 8596795 e 079fd90. Versão da interface 1.13.

## 09/11/2026: banco online, segundo admin e versões da interface

- **Pedido:** trocar a pasta do OneDrive por um banco online. O Bruno escolheu o Firebase (projeto weblol-42ef7, região São Paulo).
- **Pedido:** "crie um login de admin no site para o seguinte usuário: panda #zada", que cria a senha no primeiro acesso.
  - Admins: brunoltz#LTZ (principal) e panda#ZADA.
  - Cada admin tem a sua senha.
  - O principal libera os outros com uma senha provisória.
- **Pedido:** histórico de "Versões da interface" na aba Administração.
- **Commits:** 07fa0e8, e2a103a, 2f9be1a, 93284c5 e bef478f.
