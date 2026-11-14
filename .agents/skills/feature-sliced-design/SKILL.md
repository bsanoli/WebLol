---
name: feature-sliced-design
description: Aplicar Feature-Sliced Design (FSD) ao frontend do WebLol ao organizar módulos, revisar dependências entre áreas ou planejar migrações de arquitetura.
---

# Feature-Sliced Design no WebLol

- Identifique a página, o fluxo e os consumidores do código antes de escolher sua localização. Organize os módulos TypeScript em `src/app/`, `src/pages/`, `src/widgets/`, `src/features/`, `src/entities/` e `src/shared/` conforme seus consumidores. Os datasets de builds são selecionados no Vite pelo alias `@dataset/`.
- Comece pela página. Um filtro exclusivo de Worlds → Composições pode ficar em `pages/worlds-compositions`; extraia para `features/` quando a mesma ação tiver consumidores em outras páginas. Use `widgets/` para blocos grandes e independentes, `entities/` para conceitos de domínio reutilizados, `shared/` para infraestrutura e UI genérica, e `app/` para inicialização e configuração global. Crie camadas conforme a necessidade.
- Em `pages`, `widgets`, `features` e `entities`, agrupe por página ou domínio em slices. Divida cada slice por responsabilidade com segmentos como `ui`, `model` e `api` conforme o conteúdo. Em `app` e `shared`, organize diretamente em segmentos.
- Siga a direção das dependências `app → pages → widgets → features → entities → shared`. Um slice importa outros slices apenas de camadas inferiores, pela API pública de cada slice, com exports explícitos (por exemplo, em `index.ts`). Dentro do próprio slice, use imports relativos aos módulos internos para evitar ciclos pelo ponto de entrada. Em `shared`, exponha APIs por segmento ou módulo com fronteira própria.
- Ao mover código, preserve os pontos de entrada do Vite, rotas, parâmetros da URL e dados locais que o fluxo usa. Reutilize os componentes existentes conforme a skill `weblol-ui` quando houver mudança de interface. Confira os imports e execute `npm run typecheck`. Rode `npm run build` se a mudança afetar pontos de entrada ou configuração de build.

[Documentação oficial de Feature-Sliced Design](https://feature-sliced.design/docs/get-started/overview)
