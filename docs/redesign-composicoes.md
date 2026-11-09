# Redesign de Composições do time

Implementado na rota existente `/#/time/composicoes`.

## Fontes e decisões

- Editor, catálogo, estado local, importação/exportação e links: `src/client/team.ts`.
- Estrutura da área do time: `src/camp.html`; estilos compartilhados: `public/assets/team.css` e `base.css`.
- Estilos específicos novos: `public/assets/compositions.css`, sem alterar a aparência do mapa ou do conhecimento.
- Shell, Riot ID e sincronização continuam em `public/assets/shell.js` e `sync.js`, sem alterações.
- Referência principal: mockup fornecido pelo usuário. Consultados também [OP.GG](https://op.gg/lol/champions), [OP.GG Esports](https://esports.op.gg/), [Mobalytics](https://mobalytics.gg/lol/tier-list) e [League of Graphs](https://www.leagueofgraphs.com/champions/tier-list): filtros explícitos, navegação por contexto e organização compacta por posição.

O menu Tema oferece WebLol (padrão, com o dourado original), Dracula, Monokai, Nord, Solarized Dark, Tokyo Night, Catppuccin Mocha, Gruvbox Dark, One Dark e Everforest. Cada opção mostra amostras de fundo, superfície elevada e destaque antes da seleção. Use os tokens `--comp-*` de `compositions.css` para manter as amostras, o editor e o catálogo móvel sincronizados. Azul e vermelho identificam os lados do draft em todos os temas.

A preferência fica em `weblol-composition-palette`, fora do JSON compartilhado. As preferências antigas de destaque são associadas aos temas equivalentes na leitura.

## Padrão de bordas

Use os tokens de `public/assets/compositions.css` para componentes novos nesta tela, incluindo o catálogo móvel.

| Token | Raio | Onde usar |
| --- | --- | --- |
| `--comp-panel-radius` | 8 px | Painéis da biblioteca, do editor e do catálogo, incluindo o diálogo móvel. |
| `--comp-card-radius` | 6 px | Cards de composição e de campeão, linhas de posição, menus e grupo do seletor de modo. Um botão que funciona como card segue este raio. |
| `--comp-control-radius` | 4 px | Campos de texto, áreas de texto, seletores, botões de ação e de navegação da área do time, filtros, chips e tags. |

Os cards de pick usam cantos retos na faixa esquerda de 5 px e cantos de card no lado direito. Marcadores circulares de cor e seleção são indicadores visuais. Caixas de seleção, botões de opção e controles deslizantes seguem a forma nativa. Mantenha a geometria em todos os estados de foco, seleção e hover.

## Compatibilidade

Mantidos a chave `lol-comps-time-v1`, os IDs, arrays de campeões/banimentos, notas por posição, notas por lado, a ordem de picks, o formato de exportação v1 e o roteamento existente. Não foi acrescentado estado de edição do adversário: esses slots continuam indicativos, como no editor original.

A ordem oficial vem de `DORDER`: B1, R1, R2, B2, B3, R3; depois R4, B4, B5, R5, com as fases de bans entre elas. O desenho não copia a sequência imprecisa do mockup.

## Validação

Sessão Chromium isolada, dados de teste locais. Acesso ao Google/Firebase bloqueado durante a identificação com Riot ID de teste; nenhuma validação de sincronização online ou publicação foi feita.

- Desktop: 1536 × 960 e 1366 × 768; neste último, os dez picks cabem juntos na área visível.
- Mobile: 390 × 844, dois modos; sem overflow horizontal no documento ou iframe, também conferido em 320 px.
- Seleção de posição/B2, inclusão e remoção pelo catálogo e prioridade por retrato.
- Reordenação por menu e eventos de drag-and-drop; arrays persistidos conferidos.
- Troca de lado azul/vermelho e vínculo de posição: mantém cinco posições únicas.
- Filtro de posição independente do destino; Worlds combinado com posição.
- Duplicação e exclusão de cópia; exportação JSON v1 e reimportação, mantendo IDs e picks.
- Reabertura por link com ID e modo, e persistência de composição/notas após reload. Copiar link acionou o fallback nativo de cópia manual no navegador de teste; escrita automática no clipboard não foi confirmada.
- Catálogo mobile mantém B2 · Jungle; busca, inclusão, remoção com Enter e Escape com retorno de foco.
- Build e typecheck; `git diff --check`.
- Auditoria axe WCAG 2 A/AA: zero violações reportadas nos estados testados após corrigir o contraste do botão azul. Permanecem resultados inconclusivos sobre imagens e controles do shell; auditoria não substitui revisão manual.

## Diferenças intencionais do mockup

- Adversário permanece não editável, sem inventar bans persistidos para esse lado.
- As duas fases ficam visíveis simultaneamente em vez de ocultar picks em abas.
- Filtros textuais reutilizam o vocabulário do projeto; Worlds vira checkbox combinável.
- Alternativas têm menu acessível com mover antes/depois e remover, além de arrastar e priorizar por clique.
- No mobile, nossa equipe aparece primeiro e o catálogo abre em diálogo nativo; biblioteca fica depois do editor.
- Header global e fluxo de conta continuam existentes. Seleção tem borda e estado `aria-pressed`, além da cor; o catálogo usa contorno no retrato e um ponto junto ao nome.

Gere os arquivos estáticos da raiz com `npm run pages:prepare` antes de publicar pelo GitHub Pages.
