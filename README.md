# Aloe LSF 360 — realce da importação corrigido

## Correção

A versão anterior criava barras pretas falsas na importação.  
Esta versão corrige isso.

Agora o realce da importação:

- segue os **píxeis reais** da planta importada;
- escurece linhas, hachuras e paredes existentes no desenho;
- não cria linhas verticais/horizontais falsas;
- não tapa a planta com uma grelha preta artificial.

## Fluxo

1. Importar imagem/PDF.
2. A planta aparece com as linhas reais escurecidas.
3. Calibrar por 2 pontos.
4. Clicar em Auto desenho para gerar paredes editáveis.
5. Gerar LSF / CSV.

## Mantém

- base `NUMERACAO_VAOS_POR_PAINEL`;
- numeração automática dos vãos;
- associação dos vãos a parede/painel;
- CSV com mapa de vãos.
