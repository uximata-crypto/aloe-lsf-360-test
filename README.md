# Aloe LSF 360 — DWG converter completo

Esta versão inclui:

1. app Aloe LSF 360;
2. proxy Vercel `/api/convert-dwg`;
3. servidor externo `dwg-converter-server` para converter DWG → DXF;
4. instruções para ligar tudo com `CONVERT_API_URL`.

## Porque apareceu o erro

A app já tentou converter o DWG, mas o Vercel respondeu:

```text
Conversor DWG não configurado
```

Isto significa que falta configurar a variável:

```text
CONVERT_API_URL
```

## Como resolver

### Passo 1 — publicar o servidor conversor

Publique a pasta:

```text
dwg-converter-server
```

em Render, Railway, VPS ou Docker.

O endpoint final deve ser algo assim:

```text
https://SEU-CONVERSOR/convert-dwg
```

### Passo 2 — configurar o Vercel

No projeto Vercel da app Aloe LSF 360, criar variável de ambiente:

```text
CONVERT_API_URL=https://SEU-CONVERSOR/convert-dwg
```

### Passo 3 — redeploy

Depois faça novo deploy no Vercel.

### Passo 4 — testar

1. abra a app;
2. clique em Importar imagem;
3. carregue `.dwg`;
4. a app chama o conversor;
5. recebe DXF;
6. importa o DXF automaticamente.

## Mantido

- menus;
- barra de escurecer planta;
- importação de imagem/PDF/DXF;
- numeração dos vãos;
- CSV.
