# Aloe DWG Converter Server — Render Low RAM Fix

Esta versão é para Render Free.

## Correções

- Compila LibreDWG com `MAKEFLAGS=-j1`;
- evita paralelismo para reduzir consumo de RAM;
- adiciona dependências extra:
  - help2man
  - libxml2-dev
  - libpcre2-dev
  - zlib1g-dev
  - perl

## No GitHub

Substitua dentro da pasta:

```text
dwg-converter-server
```

estes ficheiros:

```text
Dockerfile
README.md
```

Depois faça commit.

## No Render

Clique em:

```text
Manual Deploy → Deploy latest commit
```

O build será mais lento, mas tem mais hipótese de passar no plano Free.
