# 0005. Bans em lista própria no código e validação com Zod Mini

- **Situação:** aceita em 2026-11-20 (Onda 3b, [pedido](../pedidos/2026-11-20-onda-3-area-do-time.md))
- **Data:** 2026-11-20
- **Decidido por:** Fabiano

## Contexto

- O código trata o ban como uma posição: `lanes.ban` mora junto de `top`, `jg`, `mid`, `adc` e `sup`, e o `LANES` mistura os dois. O [glossário](../glossario.md) diz que ban não é posição.
- Os dados entram no código sem validação: `localStorage` (`lol-comps-time-v1`), backup importado, versão oficial vinda do Firestore e parâmetros da URL. Um campo fora do formato só aparece como erro mais adiante na tela.
- `public/assets/sync.js` (classe de script, fora do FSD) compara cada composição local com a oficial pelo JSON e monta o resumo das diferenças lendo `lanes.*`. Se o formato salvo mudasse só de um lado, toda composição apareceria como diferente.

## Decisão

1. **Código:** `Composition.bans: string[]` e `lanes` só com as cinco posições. Funções de `model/` leem e gravam a lista certa por `championsOf` e `setChampions`.
2. **Formato salvo:** continua `lanes.ban`. O conversor de `composition-storage.ts` faz a troca na leitura e na escrita, como já faz com `team` e `rival`, preservando ordem das chaves e ausências. Migrar o formato salvo fica para a Onda 4, junto com o `sync.js`, que passa a ler os dois formatos antes de qualquer escrita no novo. Assim nenhuma versão do site nem o `sync.js` deixa de ler o que a outra grava.
3. **Validação:** [Zod Mini](https://zod.dev/packages/mini) (`zod/mini`, zod 4.6.7) nas fronteiras que a onda altera: estado do `localStorage`, base oficial e parâmetro `modo`. A importação de backup mantém a validação manual atual (já lê pelo conversor) e passa pelo Zod numa onda própria. A validação normaliza o que o código exige (listas de campeões, nome, id) e descarta só o que não é uma composição; campos desconhecidos passam intactos.
4. **Bundle:** `zod/mini` é importável por partes e entra só no pacote do `camp`; o orçamento do `size-limit` vigia o custo. O pacote da Área do time passou de 35 kB para 38,77 kB gzip, e o limite subiu para 40 kB.

## Consequências

- Melhora: nomes do código batem com o glossário; dado corrompido não derruba a tela; nenhum dado salvo muda.
- Piora: mais uma dependência; durante a Onda 3 ainda existem dois nomes para o ban (um no código, outro no formato salvo), isolados no conversor.
- A migração de `lanes.ban` para `bans` no formato salvo continua pendente (Onda 4) e exige uma nova ADR.

## Alternativas consideradas

- **Migrar já o formato salvo (leitura dos dois, escrita só no novo):** era o plano inicial do pedido. Descartada porque o `sync.js` compara o JSON e leria `lanes.ban` de composições gravadas já sem ele, e a versão anterior do site perderia os bans.
- **Validar à mão:** sem dependência, mas cada fronteira teria regras próprias e erros diferentes; foi o que deixou os campos inválidos passarem até hoje.
- **Valibot ou ArkType:** menores ou mais rápidos, mas o Zod é o mais conhecido de quem vier mexer, e `zod/mini` mantém o custo baixo.

## Limite conhecido

Uma composição válida a que faltem campos (`lanes.ban`, `name`, `updated`, `laneNotes`, `notes`) recebe valores vazios na leitura e os grava no próximo salvamento, então o JSON dela pode mudar uma vez. As composições criadas pelo app já têm todos os campos; a Onda 4 trata a comparação do `sync.js` junto com a migração do formato.
