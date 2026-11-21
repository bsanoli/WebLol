# 0008. Onde moram os estilos e os tokens de cor

- **Situação:** aceita em 2026-11-20 (onda 5 inteira)
- **Data:** 2026-11-20
- **Decidido por:** Fabiano ("5a, 5b e 5d agora", depois "pode mover agora" para a 5c)

## Contexto

- Todos os estilos globais estavam em `public/assets/*.css`, carregados por `<link>` nos quatro HTMLs. O Vite não os processa: não há minificação, hash nem verificação.
- Quando o Vite processa vários CSS de uma página, ele extrai em arquivos comuns o que é compartilhado entre HTMLs (`dialog-controls-*.css`, `select-*.css`) e os carrega **antes** do CSS da página. Isso inverte a cascata: ao mover `base.css`, `motion.css` e `team-controls.css` com `<link>` simples, o botão "..." de ações da composição ganhou borda.
- Um `@import` dentro de um CSS é achatado em um único módulo, sem compartilhamento, e preserva a ordem escrita.
- Cores hexadecimais soltas em CSS de `src/` escapavam dos temas.

## Decisão

1. Cada CSS mora no slice que o usa: `pages/builds/ui`, `pages/team/ui` (`team`, `compositions`, `draft-layout`, `tactics`), `pages/worlds-compositions/ui`, `pages/worlds-overview/ui`, `widgets/tournament-overview/ui`, `widgets/analytics-tooltip/ui`, `shared/ui` (`team-controls.css`, usado por Área do time e Worlds) e `app/styles` (`base`, `motion`, `shell`). `public/assets/` não tem mais CSS.
2. Cada página tem um **CSS de entrada** em `app/styles/` (`camp.css`, `worlds.css`, `home.css`; o SoloQ usa `worlds.css`) que só faz `@import` dos arquivos na ordem original. Os HTMLs têm um único `<link>` para ele. A ordem do `@import` é a ordem da cascata: ao incluir um CSS novo, coloque-o onde a regra deve vencer.
3. Hexadecimal em CSS de `src/` só existe em `app/styles/tokens.css` (cores que não mudam com a paleta) e `app/styles/palettes.css` (`:root` e `[data-palette]`). `scripts/check-architecture.mjs` falha se aparecer em outro lugar.
4. As cores soltas da Área do time viraram tokens nomeados pelo papel (`--wl-side-blue-text`, `--wl-ward-farsight-edge`, `--wl-shadow-soft`), com o mesmo valor, para a aparência não mudar. Só `--wl-blue-500` e `--wl-red-500` são primitivos, porque servem ao lado azul/vermelho e ao perigo.

## Consequências

- Melhora: mudar uma tela não exige caçar regras em `public/`; cor hexadecimal fora dos dois arquivos de tokens não entra mais; o Vite minifica e dá hash aos estilos.
- Piora: os CSS compartilhados entram duplicados nos pacotes de cada página. O tamanho continua dentro do orçamento (Área do time 33,7 de 40 kB; Worlds 268 de 295; SoloQ 556 de 630).
- A escala de 8 px foi aplicada a `margin`, `padding` e `gap` em px (204 valores): 5, 6 → 4; 7, 9, 10 → 8; 14, 18 → 16; 22 → 24 (empates arredondam para baixo, mais compacto). Alturas, larguras, bordas e fontes não foram tocadas. Valores de 1 a 4 px ficam como ajuste fino. Aprovada pelo Fabiano depois de ele não ver diferença nas capturas da mudança de lugar; as capturas depois da escala ainda não foram refeitas.
- Conferido: capturas antes e depois (8 telas, temas WebLol e Nord, 1440×900) iguais, salvo ruído de antialiasing que também aparece entre duas execuções da versão antiga.
- O Bruno edita `team.css` e `tactics.css` na `main`: o rename causa conflito nessas edições, a resolver ao integrar.

## Alternativas consideradas

- **`<link>` simples por arquivo em `src/`:** descartada, o Vite extrai CSS comum e muda a cascata (ver Contexto).
- **Envolver o CSS em `@layer`:** muda quem vence quando a especificidade difere, sem como validar tudo.
- **Manter `base.css`, `motion.css` e `team-controls.css` em `public/`:** deixava a mistura dos dois mundos e a ordem dependia do Vite.
