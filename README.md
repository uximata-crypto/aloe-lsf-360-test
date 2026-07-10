# Aloe LSF 360 — Medidas dos Perfis

## Nova função

Foi acrescentado o separador **Medidas perfis**.

Agora pode personalizar:

- família do perfil: C ou U;
- alma / largura principal;
- aba;
- lábio / retorno;
- espessura do aço;
- peso kg/m;
- referência gerada do perfil.

## Exemplos

- C90x40x12x0.95
- C140x40x12x1.20
- C200x50x12x1.50
- U90x40x0.95
- U140x40x1.20

## Como usar

1. Selecione uma parede, linha ou perfil.
2. Abra **Medidas perfis**.
3. Defina alma, aba, lábio, espessura e kg/m.
4. Clique em **Aplicar medidas do perfil**.
5. Clique novamente em **Gerar LSF** se aplicou a paredes/linhas.
6. Execute **Pré-cálculo**.
7. Gere o **CSV**.

## CSV

O CSV passa a incluir:

- ALMA_MM;
- ABA_MM;
- LABIO_MM;
- ESPESSURA_MM;
- KG_M;
- COMPRIMENTO_MM.

## Nota

Os valores kg/m são indicativos e devem ser confirmados com a ficha técnica do fabricante/perfiladora.
