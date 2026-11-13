# LoL — Worlds e Campeonato

Painel do time: estatísticas do Worlds 2026, planejador de comps e draft, mapa tático e conhecimento (objetivos e controle de wave).

**Como usar:** abra o link do GitHub Pages, entre com seu Riot ID (nome#TAG) e a sua senha (criada no primeiro acesso).

Cada jogador entra com Riot ID e senha e fica em um time. O capitão aceita quem pede para entrar e aprova os envios do time. Cada time só vê as próprias comps (garantido pelas regras do banco em `firestore.rules`).

Os dados dos times (comps, jogadas, envios) ficam num banco online grátis (Firebase Firestore):

- a versão oficial é assinada pelo admin, então ninguém consegue falsificar;
- os envios e backups dos jogadores são criptografados no navegador para o admin, e só a senha do admin abre;
- as regras do banco estão em `firestore.rules` (só o admin publica, aprova ou recusa).

O admin pode baixar um backup completo na aba Administração e guardar na pasta Admin do OneDrive.

## Desenvolvimento local

Com Node.js 22.12+ ou 24 LTS:

```sh
npm ci
npm run dev
```

Abra [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Se a porta 5173 estiver ocupada, o Vite informa o conflito.

A interface usa React, TypeScript, Tailwind CSS e componentes shadcn/ui. O Vite compila as três entradas em `src/` (`index.html`, `worlds.html` e `camp.html`). Os dados do Worlds e o catálogo da Riot ficam em JSON, em `src/data/`.

Use TypeScript para código novo da aplicação. As exceções são `public/assets/shell.js` e `public/assets/sync.js`, que compartilham o estado legado de autenticação e sincronização, e os utilitários Node existentes em `scripts/*.mjs`. As entradas legadas `worlds.ts` e `team.ts` ainda têm verificação de tipos desativada durante a migração. Os módulos extraídos delas, incluindo as builds, passam pelo `typecheck` normal.

Para conferir a versão compilada, execute `npm run build` e `npm run preview`. Na prévia, é possível consultar o Worlds sem entrar. Na área do time, use seu Riot ID para acessar a sincronização com o Firestore.

As imagens do jogo ficam em `public/assets/lol/` e vêm do [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon). O catálogo usa a versão `15.24.1` (patch 25.24, último de 2025). Para os registros do Worlds que não existem nesse catálogo, usa `16.20.1`. O Data Dragon serve a arte clássica dos campeões e os ícones de runas em endereços sem número de versão.

Para atualizar essas imagens, instale o Pillow no Python e rode `python scripts/download-lol-assets.py`. O script baixa o catálogo, verifica se todos os itens, runas e feitiços das builds têm correspondência e gera o manifesto usado pelas telas. O build do site usa os arquivos locais.

Os ícones de Conhecimento em `public/assets/lol/hud/` vêm do CommunityDragon 16.22. Os objetivos e a torre são do [minimapa](https://raw.communitydragon.org/16.22/game/assets/ux/minimap/icons/), o `push.png` vem dos [pings](https://raw.communitydragon.org/16.22/game/assets/ux/minimap/pings/) e o `bluemelee_circle_classic.png` vem do [HUD do minion corpo a corpo](https://raw.communitydragon.org/16.22/game/assets/characters/sru_orderminionmelee/hud/).

## GitHub Pages

O GitHub Pages serve a raiz da branch `main`. Rode `npm run pages:prepare` para gerar o build e atualizar `index.html`, `camp.html`, `worlds.html` e `assets/` na raiz. Inclua esses arquivos no commit que vai para a `main`. Edite os arquivos fonte em `src/` e `public/`.

## Sistema visual

O CSS compartilhado em `public/assets/base.css` define a paleta escura do WebLol, Barlow para texto, Barlow Condensed para títulos e os raios de 4 px para controles, 6 px para cartões compactos e 8 px para painéis. Use os tokens `--wl-*` e seus equivalentes no Tailwind em `src/index.css`. A borda estrutural é de 1 px e usa `--wl-line`. Cores de lados, posições e estados têm papéis próprios.

Os temas alternativos são aplicados ao editor e ao catálogo de Composições, que compartilham a mesma tipografia e os mesmos raios do restante do painel.

## Botões da interface

Use o `Button` de `src/components/ui/button.tsx` nas telas React. Nos trechos HTML legados, use `data-slot="button"` com o mesmo `data-variant`. Ambos usam os estilos de `public/assets/base.css`.

- `default` para a ação principal da seção, como criar ou salvar.
- `outline` para ações secundárias, como importar ou copiar.
- `ghost` para navegação e ações discretas. Em seleções, informe o estado com `aria-current` ou `aria-pressed`.
- `destructive` para excluir ou descartar dados.

Use `size="sm"` (ou `data-size="sm"` no HTML) para controles compactos. Os botões só com ícone precisam de um nome acessível, como `aria-label`.

## Versões da interface

A aba Administração tem um item recolhível "Versões da interface". A cada mudança visível na interface, acrescente uma versão no topo de `src/data/ui-versions.ts`, dizendo o que mudou.
