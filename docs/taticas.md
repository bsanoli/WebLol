# Aba Táticas

Endereço: `#/time/composicoes/<id>?modo=taticas` (Área do time > Composições > Táticas).

## Para que serve

A aba Táticas é o bloco de notas do time. Serve para analisar o adversário ou o próprio time e para guardar anotações gerais. Cada composição, nossa ou adversária, tem o próprio bloco de notas, onde você pode:

- escrever o plano ou a análise, com formatação e campeões citados com `@`;
- colar prints e desenhar por cima deles (setas, círculos, texto);
- conferir os picks e bans dos dois lados do draft.

## Composições nossas e adversárias

Toda composição é **nossa** ou **adversária**. A Área do time tem duas abas de composição: **Ordem do draft** (a principal) e **Táticas**. A antiga aba Opções por posição saiu, e links com `?modo=lane` abrem a Ordem do draft.

- **+ Nova composição nossa** e **+ Nova adversária** são o primeiro item de cada lista da barra de confronto; a gaveta de Táticas tem um **+** em cada grupo.
- Para mudar de quem é uma composição, use o menu **⋯** na Ordem do draft: **Mover para adversárias** ou **Mover para nossas**. No cabeçalho da Táticas, a etiqueta **Nossa** ou **Adversária** só informa.
- O link do OP.GG se cadastra na barra de confronto (botão **+ OP.GG** ao lado da adversária; com link, o lápis edita), no menu **⋯** (Link do OP.GG…) ou no botão da aba Táticas. O título "Nome x Adversária" aparece nos confrontos (veja [Confrontos](#confrontos)); as listas Nossas e Adversárias mostram só o nome da comp.
- A composição adversária tem o botão **OP.GG**: o clique esquerdo abre o OP.GG do time numa nova aba, e o botão direito (ou Shift+F10) troca o link. Sem link, o clique esquerdo pede o endereço. Apagar o endereço remove o link. Só são aceitos endereços http(s); sem protocolo, a página assume https.
- As táticas salvas antigas viraram composições comuns, com o texto e os prints preservados. A antiga "Equipe adversária" da tática salva define o lado dela.

## Confrontos

Um **confronto** é uma comp nossa contra uma adversária (por exemplo, "Pant Taliyah x Picks Banco Mestre"), com tática própria. A mesma comp nossa pode ter vários confrontos.

- Ficam na 3ª aba da gaveta de Táticas, **Confrontos**, ao lado de Nossas e Adversárias. Clicar numa linha abre o draft dele (a nossa de um lado, a adversária do outro) e o bloco de notas do confronto, separado das notas da comp nossa e da adversária. O botão **OP.GG** do cabeçalho é o da adversária.
- **+ Novo confronto**, no fim da lista, abre um diálogo para escolher a comp nossa e a adversária (ou **+ Nova adversária…**). Pares repetidos são permitidos; cada confronto tem id, nome (lápis do título) e tática próprios.
- Escolher uma adversária na barra do draft sem confronto aberto cria um confronto novo; com um aberto, troca a comp dele. **Sair do confronto** volta à comp sozinha. Comps que já tinham adversária no draft viram confrontos sozinhas, sem perder nada.
- A lixeira da linha exclui o confronto e a tática dele, depois de confirmar. As composições continuam.
- Excluir uma comp não remove os confrontos dela: eles ficam com aquele lado vazio, e o aviso de exclusão lista quais. Arrastar a nossa comp para o lado da adversária (ou usar ⇄) troca os lados, com aviso e **Desfazer**.

## Ordem do draft com a adversária

No topo da Ordem do draft fica a **barra de confronto**:

A barra espelha o quadro: o bloco do lado azul fica à esquerda e o do vermelho à direita.

1. **Nossa:** escolhe a composição nossa aberta, com busca por nome ou campeão. O primeiro item da lista é **+ Nova composição nossa**. O menu **⋯** ao lado move para adversárias, renomeia, duplica ou exclui.
2. **⇄ Trocar lados:** leva o nosso time para o outro lado, e a barra e o quadro se invertem juntos.
3. **Adversária:** escolhe a composição adversária que ocupa o outro lado, ou "Sem adversária". O primeiro item da lista é **+ Nova adversária**, que já entra como a adversária da comp aberta. Com uma escolhida, aparecem o menu **⋯** dela e o link do OP.GG, se houver.

O quadro mostra os dois lados com bans, picks, posição de cada pick e alternativos. Clique num pick ou em "Bans" de qualquer lado para editá-lo; o título "Editando: …" diz qual slot está ativo. O seletor de campeões, no centro, preenche o lado em edição. O que você muda do lado adversário grava na composição adversária. Sem adversária escolhida, o outro lado mostra o botão **Escolher adversária**.

A ordem das posições do lado adversário vem da própria composição adversária, no lado em que ela está.

### Arrastar campeões entre cards

- Cada card (pick ou ban) é um destino: ao passar o campeão por cima, só aquele card fica destacado.
- Arrastar um campeão de um card para outro o move. Num card ocupado, ele entra como alternativa e o principal não muda. Vale também entre os lados (da nossa para a adversária e o contrário).
- Arrastar um campeão para fora dos cards o remove da composição. Um aviso "X removido" traz o botão **Desfazer** por alguns segundos. Cancelar o arraste com Esc não remove.
- Com o lado adversário vazio, os cards ficam visíveis: soltar um campeão em um deles cria a adversária com o campeão naquela posição.

## Layout da Táticas

A tela tem duas colunas em desktop.

- **Esquerda:** o bloco de notas (veja [Bloco de notas](#bloco-de-notas)). O título mostra "Táticas gerais" ou "Táticas · nome da comp", com a etiqueta "Adversária" quando for o caso.
- **Direita:** uma gaveta recolhível. O botão **Composições e draft**, no cabeçalho, abre e fecha a gaveta. Fechada, o bloco de notas ocupa a largura toda. O site lembra se ela estava aberta (começa aberta).
- **Cabeçalho:** o alternador **Esta composição | Gerais** troca entre a tática da comp aberta e as táticas gerais (ideias que valem para qualquer comp). Funciona com a gaveta fechada.
- **Gaveta, em cima:** as abas **Nossas | Adversárias | Confrontos** (com a contagem), cada uma com linhas compactas (nome e retratos) e o botão de nova composição no fim da lista. A aba abre na do tipo da comp atual. Um lápis ao lado do nome indica que o item já tem texto ou print. Uma bolinha azul ou vermelha à esquerda dos retratos mostra o lado salvo na comp; nos confrontos, a bolinha do nosso lado vem antes do nome. A lista de troca de composição da Ordem do draft mostra a mesma bolinha.
- **Gaveta, embaixo:** o quadro de picks e bans, com o desenho da Ordem do draft em versão compacta. Mostra sempre os dois lados, em todas as abas: a comp aberta ocupa o lado salvo dela e o outro lado espera uma composição. Clicar num pick ou ban abre o seletor de campeões, e a escolha grava na própria comp (nos dois lados do confronto), valendo também na Ordem do draft. Dá para arrastar uma composição da lista para o lado que quiser: ela fica nesse lado, e uma adversária solta com uma nossa aberta (ou o contrário) cria ou abre o confronto; sem par aberto, só abre a comp. O botão **Editar na Ordem do draft** abre o quadro completo.
- **Draft | Lane:** acima do quadro, o alternador troca a visão. **Draft** é o quadro descrito acima, com a arte dos campeões. **Lane** mostra só os ícones, uma linha por posição (Bans, Top, Jungle, Mid, ADC, Suporte), com o lado azul à esquerda, o nome da posição no meio e o lado vermelho à direita, como na Draft. Os dois lados apontam para o centro: a barra da cor da posição fica na borda de dentro, junto aos nomes das posições, e os ícones começam logo depois dela. O maior, com a borda da cor da posição, é o principal e fica mais perto do centro; os menores são as alternativas, seguindo para fora. Os cabeçalhos não têm a linha colorida, a bolinha nem o nome do lado: mostram só "Nossa" ou "Adversária" com o nome da composição, junto ao centro. Na visão Draft, o cabeçalho de cada lado também fica junto ao centro. Os nomes aparecem ao passar o mouse. Na visão Lane valem as mesmas ações: clicar no principal ou no **+** abre o seletor, clicar numa alternativa a torna principal, arrastar ícones move campeões (entre posições e entre os lados), arrastar para fora remove com **Desfazer** e soltar uma composição num lado funciona igual. O site lembra a última visão escolhida (começa em Draft).

As anotações antigas da composição (Plano geral e Plano do draft) entram no início do bloco de notas da comp. Na primeira edição, elas passam a fazer parte das notas e saem dos campos antigos. As observações por lane continuam guardadas, mas não aparecem mais na tela.

## Bloco de notas

Editor de texto rico ([Tiptap](https://tiptap.dev), MIT). O salvamento é automático, cerca de meio segundo depois da última tecla.

- **Barra de formatação:** Negrito (Ctrl+B), Itálico (Ctrl+I), Título, Subtítulo, Lista, Lista numerada, Lista de tarefas, Adicionar print, Desfazer e Refazer. Os atalhos de Markdown também funcionam (`## `, `- `, `1. `, `[ ] `).
- **Lista de tarefas:** cada item tem uma caixa de marcar; o item marcado fica riscado.
- **`@campeão`:** digite `@` e o começo do nome. A lista sugere até 8 campeões (setas para escolher, Enter ou Tab para inserir, Esc para fechar). O campeão entra como etiqueta com ícone e nome.
- Uma tática antiga, só com texto e miniaturas, abre convertida: cada linha vira um parágrafo e os prints entram no fim. Nada muda nos dados até alguém editar.

## Prints e desenho

- Para adicionar, cole com **Ctrl+V** no texto, arraste a imagem para o ponto do texto onde ela deve ficar ou use **Adicionar print** (entra no cursor).
- O print fica dentro do texto, com os botões **Desenhar** (ou **Editar desenho**) e **Remover**. Também dá para arrastar o print para outro ponto do texto.
- Clicar no print ou em **Desenhar** abre a janela de desenho ([Excalidraw](https://excalidraw.com), MIT), em tela quase cheia:
  - o print fica travado no fundo e não se move;
  - setas, formas, traço livre e texto ficam como objetos separados, que continuam editáveis quando você reabre;
  - **Salvar desenho** grava os riscos e uma prévia do print já desenhado, que é o que aparece no texto; **Cancelar** descarta.
- A imagem é reduzida no navegador (WebP, lado maior até 1600 px, até cerca de 700 KB) antes de ser guardada. A prévia do desenho passa pela mesma redução.
- O Tiptap e o Excalidraw são carregados só quando usados: o bloco de notas ao abrir a aba Táticas, o Excalidraw ao abrir a janela de desenho.

## Onde os dados ficam

- O texto de cada tática fica na lista `tactics` dos dados do time. Cada item tem o id `geral` ou `comp-<id da comp>` e:
  - `doc`: o documento do bloco de notas (JSON do Tiptap). Cada print é um nó `tacticPrint` com `src` (o print original), `sketch` (a cena do desenho) e `preview` (o print desenhado), todos ids de `imagens`;
  - `text`: o texto puro tirado do `doc` (campeões viram `@Nome`), usado na aprovação do capitão e no lápis da lista;
  - `images`: todos os ids que o `doc` usa.
- Cada composição fica na lista `comps` com `team` (`mine` ou `enemy`) e, na adversária, `opgg` (o link). Os confrontos ficam na lista `matchups` do time (`{ id, name?, ours?, enemy?, side, updated }`, ver [ADR 0009](decisoes/0009-confronto-proprio.md)); a tática de um confronto tem o id `comp-mx-<id>`. Comps antigas sem `team` são lidas como nossas, ou como adversárias quando tinham `tacticTeam: "enemy"`. Os campos `tactic`, `tacticViews` e `tacticTeam` saem na primeira edição.
- Cada print fica num documento próprio do Firebase em `times/{time}/imagens/{print}`, fora dos dados do time, que têm limite de 1 MB. Essa escolha foi do Bruno em 19/11/2026 e está no [histórico de admin e login](historico-admin-login.md).
  - A regra `match /imagens/{id}` do `firestore.rules` precisa estar publicada no console do Firebase.
  - Todo membro ativo do time, o capitão e os admins conseguem ver os prints e desenhos.
  - Sem time, ou se o envio falhar, o print fica neste navegador numa fila (`lol-img-pendentes`) e é reenviado com o mesmo id ao sincronizar, enviar para aprovação ou publicar. Enquanto não chega, os colegas veem "Este print ainda não chegou ao time".
  - A cena do desenho é guardada como texto JSON num documento de `imagens`, sem a imagem de fundo (ela já está em `src`).
  - A regra só permite criar. Por isso, cada vez que um desenho é salvo, surgem uma cena e uma prévia novas, e as antigas ficam sem uso no banco. O capitão ou um admin pode apagá-las.
- O que um membro altera vai para a aprovação do capitão, como as comps e jogadas. O texto aparece como "Tática", com o resumo "Texto da tática alterado", "Prints ou desenhos alterados" ou "Formatação da tática alterada". A composição mostra também "Lado alterado" e "Adversária do draft alterada".

## Código

| Parte | Arquivo |
| --- | --- |
| Tela da Táticas (cabeçalho, gaveta, grupos, resumo do draft) | `src/pages/team/ui/tactics.ts` |
| Visão Lane do quadro (só ícones, uma linha por posição) | `src/pages/team/ui/tactic-position-board.ts` |
| Barra de confronto | `src/pages/team/ui/matchup-bar.tsx` |
| Quadro da Ordem do draft (dois lados) | `src/pages/team/ui/draft-board.ts` |
| Nossa ou adversária, adversária do draft | `src/pages/team/model/composition-side.ts` |
| Confrontos (criar, excluir, limpar, migrar) | `src/pages/team/model/matchups.ts` |
| Diálogo de novo confronto | `src/pages/team/ui/matchup-dialog.tsx` |
| Bloco de notas (Tiptap, barra, `@campeão`, nó do print) | `src/pages/team/ui/tactic-notes/` |
| Janela de desenho (Excalidraw) | `src/pages/team/ui/print-sketch/` |
| Documento da tática (conversão antiga, notas da comp, texto puro, ids dos prints) | `src/pages/team/model/tactic-doc.ts` |
| Acesso aos prints (banco do time ou navegador) | `src/pages/team/api/print-store.ts` |
| Eventos e ligação com o editor de comps | `src/pages/team/ui/team-page.ts` |
| Regras das táticas (texto, prints, notas antigas da comp, OP.GG) | `src/pages/team/model/tactics.ts` |
| Compressão dos prints | `src/pages/team/lib/compress-image.ts` |
| Estilos | `src/pages/team/ui/tactics.css` |
| Envio e leitura dos prints e sincronização de `tactics` | `src/features/auth` e `src/shared/host-bridge/host-bridge.ts` (`window.weblolImages`) |
| Regra dos prints | `firestore.rules` (`match /imagens/{id}`) |
