# ui-diff no processo de desenvolvimento

- **Tamanho:** G
- **Situação:** em andamento
- **Pedido por:** Fabiano
- **Data:** 2026-11-22

## Pedido

> quero https://github.com/imuratalpay/ui-diff no nosso processo e fluxo de desenvolvimento

**Resultado esperado:** todo PR que muda interface recebe um comentário com o antes e depois das telas e as mudanças medidas, e a revisão passa a ler esse comentário.

**Critérios de aceite**

- [ ] O workflow `ui-diff.yml` comenta num PR de teste que muda uma tela, com imagens visíveis.
- [ ] Um PR sem mudança de interface não gera comentário de diferença.
- [ ] O [sdlc](../sdlc.md) e o [checklist de revisão](../revisao.md) citam o ui-diff.
- [ ] O CI existente continua passando (Biome, `npm run check`, Knip).

**Fora do escopo:** conferência local (o computador não tem WSL2), telas com login e a Administração, tornar o resultado um check obrigatório.

**Suposições:** captura só em desktop e sem tema escuro (o WebLol não tem); o tempo de CI será medido no primeiro PR.

## Especificação

- **Telas e estados:** `/worlds.html`, `/soloq.html` e `/camp.html` no estado vazio.
- **Dados salvos:** nenhum.
- **Builds:** nenhum efeito.
- **Termos novos:** nenhum.
- **Decisões:** [ADR 0010](../decisoes/0010-ui-diff-nos-prs.md). Respostas do Fabiano: rodar no CI do PR e liberar imagens públicas.

## Plano

| Onda | Arquivos ou slices | Testes | Risco |
| --- | --- | --- | --- |
| 1 | `ui-diff.config.json`, `.github/workflows/ui-diff.yml`, `.gitignore`, ADR 0010, `sdlc.md`, `revisao.md` | Abrir um PR de teste e ler o comentário | A rota `/camp.html` pode não renderizar sozinha, fora do shell. Ajustar as rotas depois do primeiro PR |

## Resultado

- **Mudou:** …
- **Verificado:** …
- **Pendências:** …
- **Regras registradas:** …
