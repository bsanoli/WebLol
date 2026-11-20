# Decisões de arquitetura (ADRs)

Cada arquivo registra uma escolha que tinha alternativas e consequências: uma biblioteca, um formato de dado, um fluxo de trabalho. Para registrar uma, escreva na sessão `decisão: …`. O formato é uma versão curta do [MADR](https://adr.github.io/madr/).

Numere em sequência (`0005-assunto.md`). Uma ADR aceita não muda de conteúdo. Se a decisão mudar, crie uma nova que a substitua e atualize a situação da antiga.

| ADR | Decisão | Situação |
| --- | --- | --- |
| [0001](0001-processo-de-desenvolvimento.md) | Processo de desenvolvimento com tamanhos, portões e ciclo de padronização | Proposta |
| [0002](0002-idioma-e-nomes.md) | Código em inglês, tela em português, um termo por conceito | Proposta |
| [0003](0003-publicacao-por-artefato.md) | Publicar no GitHub Pages por artefato do Actions, sem arquivos gerados no Git | Proposta, depende do Bruno |
| [0004](0004-ferramentas-de-qualidade.md) | Lint, formatação, código sem uso, CI e ganchos do Claude Code | Proposta |
| [0005](0005-bans-e-validacao-de-dados.md) | Bans em lista própria no código e validação com Zod Mini | Aceita |

## Modelo

```md
# NNNN. Título no infinitivo

- **Situação:** proposta | aceita | substituída por NNNN
- **Data:** AAAA-MM-DD
- **Decidido por:** Fabiano, Bruno

## Contexto

O problema, com evidências do código.

## Decisão

O que passa a valer.

## Consequências

O que melhora, o que piora e o que precisa ser feito.

## Alternativas consideradas

Cada opção e por que não foi escolhida.
```
