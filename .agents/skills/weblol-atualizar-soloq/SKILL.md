---
name: weblol-atualizar-soloq
description: Atualiza partidas Solo/Duo dos profissionais no WebLol, altera a lista de contas ou regenera o dataset SoloQ a partir do cache.
---

# Atualizar SoloQ

Consulte [a lista de contas](../../../scripts/soloq-pros.json), [o coletor](../../../scripts/soloq.py) e, para tarefas de CI, [o workflow de coleta](../../../.github/workflows/soloq.yml). As saídas ficam em `src/data/soloq/` e alimentam Builds · SoloQ e a entrada dedicada.

- Para coletar novas partidas, execute `python scripts/soloq.py` com `RIOT_API_KEY` fornecida pelo ambiente. Ajuste `SOLOQ_MINUTES` se o pedido exigir um limite local. Preserve a credencial fora do Git e dos logs.
- Para recalcular os dados com as partidas existentes, use `python scripts/soloq.py --only-build`. Esse modo usa o cache e ainda pode consultar o Data Dragon para o catálogo.
- Para mudar a lista, confira Riot ID e plataforma quando disponíveis. Informe contas com falha de resolução ou coleta incompleta. O disparo manual da Action também pode publicar no Pages. Siga a autorização de commit e publicação do [AGENTS.md](../../../AGENTS.md).

Revise o diff de configuração, cache e saídas conforme o modo executado. Confira se as partidas e os jogadores esperados aparecem com o mesmo recorte nas visualizações de SoloQ afetadas. Para a entrada dedicada, use `npm run dev:soloq`. Informe alterações de cobertura e qualquer validação pendente.
