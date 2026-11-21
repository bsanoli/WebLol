# Onda 10. Partidas da SoloQ por campeão

- **Tamanho:** M
- **Situação:** implementado
- **Pedido por:** Fabiano
- **Data:** 2026-11-21

## Pedido

> Carregar os dados da SoloQ por campeão, sob demanda, medindo antes e depois. Meta: menos da metade do download na rota da lista de Builds da SoloQ.

**Resultado esperado:** a lista de Builds (Worlds e SoloQ) abre sem baixar as partidas individuais. Quando a pessoa escolhe um adversário direto, o site baixa só o arquivo daquele campeão.

**Critérios de aceite**

- [x] Bundle da lista de Builds da SoloQ abaixo de metade de 4.272.506 B: agora 2.003.713 B (`soloq` 711.394 B + `builds` 1.292.319 B).
- [x] A lista de adversários e as contagens continuam iguais (vêm de `opponents`, calculado pelo gerador).
- [x] Escolher um adversário mostra o carregamento, a build do confronto e, se o arquivo falhar, um aviso que some ao escolher de novo.
- [x] Nenhum arquivo de confrontos é pedido antes de escolher um adversário (teste em `tests/builds.spec.ts`).

## Resultado

- **Formato:** `builds.json` (SoloQ e Worlds) perde `games` e ganha `opponents` (`{ campeão: { rota | "": [[adversário, jogos]] } }`). Os confrontos de cada campeão ficam em `encounters/<slug>.json` (SoloQ) e `worlds-2026-encounters/<slug>.json`.
- **Gerador:** `scripts/split_build_encounters.py` faz a separação; `scripts/soloq.py` a chama ao gerar a SoloQ. O Worlds foi convertido uma vez com o mesmo comando. `scripts/worlds-build-timeline.py` precisa do `builds` completo e avisa se ele já foi separado.
- **Código:** `pages/builds/model/encounters.ts` guarda o estado (ocioso, carregando, pronto, erro); `@dataset/encounters` aponta para o carregador do conjunto ativo; a ficha mostra o aviso enquanto carrega.
- **Medição (bytes, build de produção):** lista da SoloQ 4.272.506 → 2.003.713 (−53%). O JSON de Compras jogo a jogo (2,5 MB) já era sob demanda e não mudou.
- **Pendência:** as chaves de `worlds.json` seguem curtas (`st`, `bw`…). Fica para a Onda 11, porque o formato também é gerado por `soloq.py`.
