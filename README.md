# Aloe LSF 360 — Cálculo e Perfis Corrigidos

## Correções

- O pré-cálculo já não sai a zero quando existem linhas importadas/desenhadas.
- O botão **Gerar LSF** agora funciona também a partir de linhas/DXF:
  - se houver volumes fechados, gera LSF por perímetro;
  - se não houver volumes, usa as linhas como eixos de parede;
  - se existirem linhas selecionadas, gera LSF só dessas linhas.
- Os perfis LSF ficam selecionáveis:
  - clicando no desenho;
  - pela lista no separador **Perfis**;
  - por botões: selecionar montantes, guias ou todos os perfis.
- O CSV exporta perfis individuais quando existirem; se ainda não gerou LSF, exporta linhas como eixos de parede.
- O pré-cálculo mostra comprimento de paredes, montantes, guias e massa estimada.

## Fluxo correto

1. Importar PDF/DXF/imagem.
2. Se for imagem/PDF, calibrar por dois pontos.
3. Desenhar por cima ou usar linhas DXF.
4. Selecionar as linhas pretendidas, se quiser.
5. Clicar em **Gerar LSF**.
6. Ir ao separador **Perfis** e selecionar/alterar perfis.
7. Clicar em **Pré-cálculo**.
8. Clicar em **Gerar CSV**.

## Nota
É um pré-cálculo indicativo para preparação de fabrico. Não substitui cálculo estrutural regulamentar assinado.
