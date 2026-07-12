# Aloe LSF 360 — aberturas exteriores/interiores corrigidas

## Correções desta versão

Esta versão corrige o problema em que o auto desenho:

- desenhava paredes a preto mas **não abria corretamente os vãos**;
- não mostrava bem **portas e janelas exteriores/interiores**;
- mantinha algumas paredes contínuas, sem corte visual.

## O que passa a acontecer

- o auto desenho cria paredes estruturais;
- as **portas e janelas auto detetadas** passam a cortar visualmente as paredes;
- o corte é aplicado tanto em paredes exteriores como interiores;
- o retângulo exterior automático fica apenas como **helper interno**, sem aparecer por cima do desenho;
- continuam ativas:
  - importação com realce correto,
  - calibração por 2 pontos,
  - numeração de vãos por painel,
  - CSV com mapa de vãos.

## Nota

A deteção automática continua dependente da qualidade da planta importada.
Se necessário, a posição/largura/altura dos vãos pode ser ajustada manualmente no painel.
