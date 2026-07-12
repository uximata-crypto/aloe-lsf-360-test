# Aloe LSF 360 — importação com paredes pretas imediatas

## Correção pedida

Ao importar a planta, a app passa a gerar imediatamente uma camada visual com as **paredes estruturais a preto**, sem precisar de clicar primeiro em Auto desenho.

## Fluxo correto

1. Importar imagem/PDF.
2. A planta aparece logo com paredes estruturais realçadas a preto.
3. Calibrar por 2 pontos.
4. Usar Auto desenho para transformar a planta em geometria/editável.
5. Gerar LSF e CSV.

## Mantém

- base `NUMERACAO_VAOS_POR_PAINEL`;
- numeração automática dos vãos;
- associação vão/painel;
- CSV com mapa de vãos;
- sem módulos pesados de laje/cobertura.
