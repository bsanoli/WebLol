# 0007. Migração de `lanes.ban` para `bans` em duas etapas

- **Situação:** etapas 1 e 2 aceitas em 2026-11-20
- **Data:** 2026-11-20
- **Decidido por:** Fabiano ("migrar", com a recomendação de duas etapas)

## Contexto

- O código já usa `bans` (ADR 0005), mas o formato salvo (`lol-comps-time-v1`, backup e Firestore) grava os bans em `lanes.ban`, como se fossem uma sexta posição. O [glossário](../glossario.md) diz que ban não é posição.
- A sincronização compara cada composição pelo JSON e descreve as diferenças lendo `lanes.*`. Uma versão do site que grava `bans` e outra que só lê `lanes.ban` perderiam os bans uma da outra (aba antiga aberta, cache, colega sem atualizar).

## Decisão

1. **Etapa 1 (esta entrega):** o site lê os dois formatos e continua gravando `lanes.ban`. `compositionFromSaved` já aceita `bans` na raiz; se os dois existirem, vale `lanes.ban`, porque o site antigo só grava ele. `shared/lib/team-changes` trata `lanes.ban` e `bans` como o mesmo dado: o diff não acusa alteração entre formatos e o resumo das diferenças mostra o ban em ambos.
2. **Etapa 2 (feita depois do deploy da etapa 1, que terminou com sucesso):** `compositionToSaved` grava `bans` na raiz, logo depois de `lanes`, sem `lanes.ban`. A leitura de `lanes.ban` continua.
3. **Sem reescrita em massa:** uma composição muda de formato só quando é salva de novo.

## Consequências

- Melhora: nenhuma versão perde bans; o formato novo pode ser publicado com segurança na etapa 2.
- Piora: composições antigas só mudam de formato quando são salvas de novo, então os dois formatos convivem por um tempo.
- Risco aceito: quem ainda usa uma versão anterior à etapa 1 (aba aberta antes do deploy, cache) pode não enxergar os bans de uma composição salva no formato novo; recarregar a página resolve.
- Pendente: remover a leitura de `lanes.ban` só quando não houver mais dados nele (decisão futura).

## Alternativas consideradas

- **Gravar o formato novo já agora:** descartada pelo risco de perda de bans entre versões (ver Contexto).
- **Reescrever tudo ao abrir o site:** mais risco e mais teste para o mesmo resultado.
- **Não migrar:** o conversor esconde a diferença, mas o formato salvo ficaria para sempre em desacordo com o glossário.
