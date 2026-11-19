# Aba Táticas

Endereço: `#/time/composicoes/<id>?modo=taticas` (Área do time > Composições > Táticas).

## Para que serve

A aba Táticas é o bloco de notas do time. Serve para analisar outro time ou o próprio time e para guardar anotações gerais. Numa tática você pode:

- escrever o plano ou a análise;
- escolher os campeões (picks e bans);
- partir de uma composição existente;
- colar prints que ajudam na análise.

## Layout

A tela tem duas colunas em desktop.

- **Esquerda:** campo grande de texto. O título diz o que está aberto: "Táticas gerais", "Táticas · nome da comp" ou "Tática · nome da tática salva". Abaixo do texto ficam os prints.
- **Direita, em cima:** a lista de escolha, com duas linhas visíveis e rolagem. A ordem é:
  1. **Táticas gerais**: anotações que não dependem de composição.
  2. **Nova tática** (card com +).
  3. As táticas salvas (ícone de livro).
  4. As composições do time (bolinha azul ou vermelha com o lado).

  Um lápis ao lado do nome indica que aquele item já tem texto ou print.
- **Direita, embaixo:** a visão dos picks e bans do item escolhido, com a linha de controles no topo.

## Linha de controles

- **Draft | Lane**, à esquerda, troca a visão. O site lembra a última escolhida.
  - **Draft:** Lado azul e Lado vermelho, os 5 bans e os 5 picks na ordem do draft ("First Pick · Mid", "Dupla B2/B3 · Jungle" e assim por diante). O lado adversário aparece como "A definir". Um "+1", "+2" no pick mostra quantos alternativos a lane tem.
  - **Lane:** cada lane (Top, Jungle, Mid, ADC, Suporte e Bans) com os ícones em ordem de prioridade. O principal vem primeiro, com a borda da cor da lane. Os bans aparecem só como ícones, todos do mesmo tamanho.
- **Aplicar em**, no meio. Só aparece numa tática salva. Tem duas opções que se marcam e desmarcam: **Opções por posição** e **Ordem do draft**. Veja [Onde a tática aparece](#onde-a-tática-aparece).
- **À direita:**
  - **Salvar tática**, quando há uma comp ou as Táticas gerais abertas.
  - **Excluir tática**, quando há uma tática salva aberta.

## Trocar a ordem dos campeões

Valem para composições e táticas salvas:

- **Draft:** botão direito num pick abre "Trocar por alternativo". O campeão escolhido vira o principal da lane.
- **Lane:** clicar num alternativo o torna principal.
- **Lane:** arrastar um ícone para a esquerda ou a direita muda a ordem. Arrastar para antes do principal o torna principal.

Essas trocas alteram a composição ou a tática aberta.

## Táticas salvas

Uma tática salva é um item próprio. Ela não é uma composição e não entra em "Composições salvas" a menos que você a aplique.

- **Salvar tática** pede um nome e copia para a tática nova os picks, os bans, o lado, o texto e os prints do item aberto. Se o item aberto forem as Táticas gerais, copia só o texto e os prints.
- **Nova tática** pede um nome e cria uma tática vazia.
- Numa tática salva aparece o **seletor reduzido de campeões**, abaixo dos picks: só os ícones e uma busca por nome.
  1. Escolha onde colocar o campeão clicando num pick ou num ban, na visão Draft, ou no nome da lane, na visão Lane.
  2. Clique no ícone para colocar o campeão. Clique de novo para tirar.
  3. Os bans aceitam até 5 campeões.

  Clicar em "Lado azul" ou "Lado vermelho" troca o lado do time.
- O nome da tática é editado no campo "Nome da composição", no topo da página.
- **Excluir tática** pede confirmação e apaga a tática, o texto e as referências aos prints.

### Onde a tática aparece

Uma tática salva só aparece em **Opções por posição** ou na **Ordem do draft** quando a opção correspondente de "Aplicar em" está marcada. Nesse caso ela fica no topo da lista daquela aba. Tática nova começa com as duas opções desmarcadas.

Se você sair da aba Táticas com uma tática aberta que não está aplicada à aba de destino, a página abre a última composição usada, ou a primeira da lista, sem trazer os picks da tática.

## Prints

- Para adicionar, cole com **Ctrl+V** no texto, arraste a imagem para o texto ou use **Adicionar print**.
- Cada print vira uma miniatura abaixo do texto. Clique para ampliar e no × para remover.
- A imagem é reduzida no navegador (WebP, lado maior até 1600 px, até cerca de 700 KB) antes de ser guardada.

## Onde os dados ficam

- O texto de cada tática fica na lista `tactics` dos dados do time. Cada item tem o id `geral` ou `comp-<id da comp>`, o texto e os ids dos prints.
- A tática salva fica na lista de comps com `tactic: true` e `tacticViews: { lane, draft }`, que são as opções de "Aplicar em".
- Cada print fica num documento próprio do Firebase em `times/{time}/imagens/{print}`, fora dos dados do time, que têm limite de 1 MB. Essa escolha foi do Bruno em 19/11/2026 e está no [histórico de admin e login](historico-admin-login.md).
  - A regra `match /imagens/{id}` do `firestore.rules` precisa estar publicada no console do Firebase.
  - Sem a regra publicada, ou sem time, o print fica só no navegador, e a página avisa.
- O que um membro altera vai para a aprovação do capitão, como as comps e jogadas. O texto aparece como "Tática" e uma tática salva aparece como "Comp".

## Código

| Parte | Arquivo |
| --- | --- |
| Tela (texto, lista, Draft, Lane, seletor, prints) | `src/pages/team/ui/tactics.ts` |
| Eventos e ligação com o editor de comps | `src/pages/team/ui/team-page.ts` |
| Regras das táticas (texto, prints, táticas salvas, Aplicar em) | `src/pages/team/model/tactics.ts` |
| Compressão dos prints | `src/pages/team/lib/compress-image.ts` |
| Menu "Trocar por alternativo" | `src/pages/team/ui/team-controls.tsx` (`mountPickSwapMenu`) |
| Estilos | `public/assets/tactics.css` |
| Envio e leitura dos prints e sincronização de `tactics` | `public/assets/sync.js` (`window.weblolImages`) |
| Regra dos prints | `firestore.rules` (`match /imagens/{id}`) |
