# Movimento da interface

`public/assets/motion.css` é carregado depois dos estilos de cada página em
`src/index.html`, `src/worlds.html` e `src/camp.html`. A página principal e os
iframes compartilham os mesmos tokens: 120 ms para controles, 180 ms para menus
e feedback, 240 ms para painéis; deslocamento de 6 px e curva de saída suave.

Use transições com propriedades explícitas. As regras compartilhadas cobrem
controles, avisos, tooltips, diálogos e disclosures nativos. Diálogos usam
`@starting-style`, `display` e `overlay` com `allow-discrete`; detalhes usam
`::details-content` e expansão de altura quando `interpolate-size` é suportado.
Em navegadores sem esses recursos, abrir e fechar continua funcionando, com
menos animação. Não adie mudanças de estado ou foco para esperar uma animação.

`src/client/motion.ts` oferece:

- `initializeMotionNav(selector)` para navegações persistentes. O indicador
  acompanha `aria-current="page"` ou `aria-pressed="true"`, inclusive ao quebrar
  linha, redimensionar ou terminar de carregar as fontes.
- `revealContent(element, quick?)` para entrada de uma nova tela ou modo. Não
  use em cada tecla de busca ou atualização de tabela. Animações interrompidas
  são canceladas, e o estado final nunca depende de um callback.

Alterações nos picks são imediatas, sem animação de entrada nas posições.

Não aplique transformações nos iframes nem no mapa/canvas: eles contêm elementos
fixos e coordenadas de interação. A animação de navegação ocorre no conteúdo.
Evite animações contínuas, efeitos em cada linha de tabela e `transition: all`.

`prefers-reduced-motion: reduce` desativa as animações CSS e Web Animations,
inclusive cancelando animações em andamento ao mudar a preferência do sistema.
Novas telas devem importar a folha compartilhada e usar os mesmos tokens.

Para verificar: alternar abas, abrir/fechar o seletor de tema por teclado e
clique externo, expandir anotações, trocar entre posições e draft, adicionar e
remover campeões e abrir/fechar o seletor mobile. Repetir com movimento reduzido,
conferindo foco e ausência de rolagem horizontal no desktop e no celular.
