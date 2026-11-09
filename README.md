# LoL — Worlds e Campeonato

Painel do time: estatísticas do Worlds 2026, planejador de comps e draft, mapa tático e conhecimento (objetivos e controle de wave).

**Como usar:** abra o link do GitHub Pages, entre com seu Riot ID (nome#TAG) e pronto. Não precisa escolher pasta.

Os dados do time (comps, jogadas, envios) ficam num banco online grátis (Firebase Firestore):

- a versão oficial é assinada pelo admin, então ninguém consegue falsificar;
- os envios e backups dos jogadores são criptografados no navegador para o admin, e só a senha do admin abre;
- as regras do banco estão em `firestore.rules` (só o admin publica, aprova ou recusa).

O admin pode baixar um backup completo na aba Administração e guardar na pasta Admin do OneDrive. O botão "Importar da pasta" copia para o banco os dados da antiga pasta Time do OneDrive.

## Desenvolvimento local

Com Node.js 22.12+ ou 24 LTS:

```sh
npm ci
npm run dev
```

A interface principal fica em `src/` e usa React, TypeScript, Tailwind CSS e componentes shadcn/ui. As telas de estatísticas e do time ficam em `public/worlds.html` e `public/camp.html`. Os scripts existentes de draft, mapa e sincronização ficam em `public/assets/`.

Para conferir a versão compilada, execute `npm run build` e `npm run preview`. Na prévia, é possível consultar o Worlds sem entrar. Na área do time, use seu Riot ID para acessar a sincronização com o Firestore.

As imagens do jogo ficam em `public/assets/lol/` e vêm do [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon). O catálogo usa a versão `15.24.1` (patch 25.24, último de 2025). Para os registros do Worlds que não existem nesse catálogo, usa `16.20.1`. O Data Dragon serve a arte clássica dos campeões e os ícones de runas em endereços sem número de versão.

Para atualizar essas imagens, instale o Pillow no Python e rode `python scripts/download-lol-assets.py`. O script baixa o catálogo, verifica se todos os itens, runas e feitiços das builds têm correspondência e gera o manifesto usado pelas telas. O build do site usa os arquivos locais.

## GitHub Pages

O site compilado fica em `dist/`. Para publicar esta estrutura, configure o Pages para publicar esse diretório como artefato de um workflow do GitHub Actions que execute `npm ci` e `npm run build`. Se o Pages estiver configurado para servir diretamente a raiz da `main`, será necessário trocar a origem da publicação antes de integrar a refatoração.
