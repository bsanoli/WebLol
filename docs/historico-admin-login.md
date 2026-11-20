# Histórico de admin e login

Registro de tudo o que muda em login, contas, times, capitão e Administração.
Regra do Bruno (13/11/2026): toda alteração nessa área entra aqui, com o pedido, a decisão tomada e o que mudou.
Desde 20/11/2026 (decisão do Fabiano), nenhuma mudança precisa de aprovação do Bruno, a não ser que exija mexer na conta dele (senha, conta admin) ou publicar regras do Firestore. Nesses casos a escolha dele fica registrada aqui.

Formato de cada entrada: data, pedido (palavras do Bruno), decisão (quem escolheu e o quê), o que mudou, commit e regras do Firestore.

---

## 20/11/2026 — login, contas e Administração em TypeScript (Onda 4b e 4c)

- **Pedido:** "Seguir para 4b" e "pode seguir" (Fabiano). Refatoração sem mudança de comportamento; nenhuma regra do Firestore foi alterada nem publicada.
- **Decisão do Fabiano:** a 4c não depende do Bruno; só avisar quando algo exigir a conta dele (senha, conta admin) ou publicar regras do Firestore.
- **O que mudou:** o código de `shell.js` e `sync.js` (login, reconexão, passo do time, rotas, Administração, sincronização) foi para `src/features/auth`, e `public/assets` ficou sem JavaScript. Nomes de chaves locais, coleções e campos não mudaram.
- **Não testado:** login real, login de admin e envio ao Firestore (só navegação, diálogo de login e modo sem usuário).

---

## 20/11/2026 — formatação automática e registro das chaves locais (Onda 1)

- **Pedido:** "Sim, Onda 1" (ferramentas de verificação, Fabiano). Não muda login, contas nem regras do Firestore.
- **Decisão do Fabiano:** o Biome formata `public/assets/sync.js` e `shell.js`, mas sem correções que renomeiem ou apaguem variáveis, porque os dois compartilham globais.
- **O que mudou:** só a formatação desses dois arquivos. As chaves de conta e de admin passaram a constar em `src/shared/config/storage-keys.ts`, e um teste confere que os nomes usados no `sync.js` continuam lá. Nenhum nome de chave mudou.

## 19/11/2026 — composições nossas e adversárias na aprovação do capitão

- **Pedido:** "quero poder diferenciar uma composição do meu time e uma composição do adversario" e "poder selecionar e diferenciar lado e composição adversaria" na Ordem do draft.
- **Decisão do Fabiano:** cada composição tem `team` (nossa ou adversária) e a nossa guarda em `draft.rival` a adversária que enfrenta. Não muda login, contas nem regras do Firestore.
- **O que mudou:**
  - Na aprovação do capitão, a composição mostra "Lado alterado: nossa → adversária" (ou o contrário) e "Adversária do draft alterada".
  - "Obs. das lanes alteradas" saiu do resumo, porque as anotações por lane não são mais editáveis.
  - Editar um pick da adversária no draft altera a composição adversária, que entra no envio como "Comp alterada".


## 19/11/2026 — bloco de notas e desenho nos prints das táticas

- **Pedido:** "a ideia dessa tela seria para usar como bloco de notas [...] quero poder tambem inserir imagens dentro do bloco, para conseguir desenhar e anotar por cima".
- **Decisão do Fabiano:** sincronia igual à de hoje (aprovação do capitão), com os prints e desenhos guardados à parte em `imagens`. Não muda login, contas nem regras do Firestore.
- **O que mudou:**
  - A tática ganhou o campo `doc` (texto rico com os prints dentro). `text` e `images` continuam e são derivados do `doc`.
  - Cada desenho salvo cria dois documentos em `imagens`: a cena (JSON) e a prévia (WebP). Os anteriores ficam sem uso, porque a regra só permite criar.
  - Na aprovação do capitão, a tática passa a mostrar também "Prints ou desenhos alterados" e "Formatação da tática alterada".

## 19/11/2026 — prints das táticas no banco do time

- **Pedido:** "permita colocar prints dentro do campo de escrever tática".
- **Decisão do Bruno:** "Banco do time, à parte" (cartão de decisão): cada print é um documento próprio, fora dos dados do time, que têm teto de 1 MB.
- **O que mudou:**
  - Nova coleção `times/{id}/imagens/{print}` com a imagem comprimida no navegador (WebP, até ~700 KB).
  - Regra nova no `firestore.rules`: membros ativos, capitão e admins leem e criam; capitão e admins apagam. **O Bruno precisa publicar a regra no console do Firebase.**
  - A tática guarda só os ids dos prints. Sem time, ou antes da regra publicada, o print fica só no navegador.
  - `public/assets/sync.js` ganhou `window.weblolImages` (salvar e carregar prints).

## 19/11/2026 — táticas entram na aprovação do capitão

- **Pedido:** "quero criar mais uma aba chamada \"Táticas\" [...] para fazer anotações sobre táticas dentro do jogo com base em uma composição ou não".
- **Decisão:** para as táticas chegarem ao time como as comps e jogadas, cada tática virou um item próprio ("Tática") no envio e na aprovação do capitão. Não muda login, contas nem regras do Firestore.
- **O que mudou:** `public/assets/sync.js` passou a incluir `tactics` nos dados do time, nas diferenças e na versão oficial; a lista de aprovação mostra "Tática" com o resumo "Texto da tática alterado".
- Versão da interface 1.58.

## 19/11/2026 — revisão de UX de Conta, Gestão do time e Administração

- **Pedido:** aplicar o Tapa de UX às telas do WebLol, incluindo as áreas restritas.
- **Decisão:** Bruno escolheu revisar as áreas restritas e aplicar ajustes pontuais de apresentação. Mudanças maiores ficam para uma decisão específica.
- **Mudança:** o acesso no cabeçalho identifica entrada e cadastro. A tela de Riot ID e a criação de senha indicam qual campo corrigir, separam espera de erro e explicam o modo sem usuário. A Gestão do time distingue falha de leitura de lista vazia. A Administração usa rótulos visíveis nos campos de senha e leva o foco ao campo que precisa de atenção.
- **Regras do Firestore:** nenhuma alteração.

## 18/11/2026 — revisão visual de conta, login e Administração

- **Pedido:** “revise detalhe por detalhe em cada tela, aplique oque estiver pendente”.
- **Decisão:** alinhar a Conta aos controles do cabeçalho, agrupar os elementos do formulário e usar o título da página como referência para os estados da Administração.
- **Mudança:** o menu da Conta acompanha o espaçamento do seletor de temas e o login aproxima campos, mensagens e ações. A Administração usa um único título, mantém as ações de cada linha na coluna da direita e aproxima os títulos das tabelas nas seções recolhíveis.
- **Regras do Firestore:** nenhuma alteração.

## 16/11/2026 — organização da duplicação de composições

- **Pedido:** “implemente a sua recomendação”.
- **Decisão:** usar a duplicação local de composições como primeiro exemplo da separação entre regras e interface.
- **Mudança:** a criação da cópia passou para um módulo tipado. A página continua responsável por selecionar, salvar e exibir a cópia.
- **Regras do Firestore:** nenhuma alteração.

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
