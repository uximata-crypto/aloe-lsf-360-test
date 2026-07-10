# Aloe LSF 360 — Numeração automática dos vãos por painel

## Novidade

O mapa de vãos do CSV passa a ter numeração profissional por painel.

Exemplos:

- `P01-V01`
- `P01-V02`
- `I03-V01`
- `E02-V01`

## Como funciona

A app associa cada porta/janela ao painel ou parede mais próxima e depois numera os vãos dentro desse painel:

- `P01` = painel/contorno exterior;
- `I03` = parede interior n.º 3;
- `E02` = parede exterior linear n.º 2;
- `V01`, `V02`, etc. = sequência dos vãos nesse painel.

## CSV

No bloco **MAPA DE VÃOS**, passa a existir a coluna:

- `CODIGO_VAO`

seguida de:

- `PAINEL`;
- `PAREDE_REF`;
- `TIPO`;
- `TIPO_PAREDE`;
- `LARGURA_MM`;
- `ALTURA_MM`;
- `PEITORIL_MM`;
- `CABEÇA_VÃO_MM`;
- `LADO_ABERTURA`.

## Fluxo recomendado

1. Auto desenho ou desenho manual.
2. Confirmar portas e janelas.
3. Editar medidas dos vãos, se necessário.
4. Clicar em **Gerar LSF**.
5. Clicar em **Gerar CSV**.
