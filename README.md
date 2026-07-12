# Aloe LSF 360 — Auto desenho e importação corrigidos

Esta versão parte da base indicada pelo utilizador:

`Aloe_LSF_360_TEST_PACK_NUMERACAO_VAOS_POR_PAINEL`

## Correções principais

1. As paredes detetadas no Auto desenho deixam de aparecer automaticamente selecionadas a laranja.
2. O preenchimento preto das paredes passa a ficar visível.
3. A imagem importada tem realce mais forte:
   - linhas mais escuras;
   - contraste maior;
   - menos branqueamento por cima da planta.
4. A deteção da caixa da planta foi corrigida para ignorar melhor:
   - linhas de cota exteriores;
   - setas;
   - textos fora da construção.
5. A deteção de paredes usa bandas mais espessas, para reduzir falsos positivos em cotas e mobiliário.

## Mantém

- numeração automática dos vãos por painel;
- associação automática dos vãos à parede/painel;
- mapa de vãos no CSV;
- edição manual dos vãos.

## Testes

- `node --check app.js`;
- validação de funções principais;
- validação de ausência de módulos pesados de laje/cobertura;
- verificação de que o Auto desenho já não seleciona todos os elementos automaticamente.
