# Aloe LSF 360 — base numeração + importação realçada

Versão criada a partir de `Aloe_LSF_360_TEST_PACK_NUMERACAO_VAOS_POR_PAINEL`.

## Mantém

- numeração automática dos vãos por painel;
- associação do vão à parede/painel;
- mapa de vãos no CSV;
- edição manual de portas e janelas.

## Novo

No separador **Imagem**, foram acrescentadas opções:

- escurecer linhas da planta importada;
- limpar fundo / aumentar contraste;
- preencher a preto as paredes detetadas no Auto desenho;
- ajustar opacidade do preenchimento.

## Testes executados

- `node --check app.js`;
- verificação de ficheiros obrigatórios;
- verificação das funções principais;
- confirmação de que não foram introduzidos módulos pesados de cobertura/laje.
