# Aloe DWG Converter Server — Render Fix

Esta versão corrige o erro de build no Render.

## Alteração principal

O Dockerfile já **não usa**:

```bash
apt-get install libredwg-tools
```

porque esse pacote pode não existir no ambiente Debian usado pelo Render.

Agora o Dockerfile:

1. instala ferramentas de compilação;
2. faz clone do LibreDWG;
3. compila o `dwgread`;
4. usa `dwgread` para converter DWG em DXF.

## No Render

Configuração:

```text
Language: Docker
Branch: main
Root Directory: dwg-converter-server
Instance Type: Free
Environment Variables: vazio
```

Depois clicar em **Manual Deploy → Deploy latest commit** ou fazer novo commit no GitHub.

## Atenção

O primeiro build pode demorar mais porque compila o LibreDWG.
Alguns DWG recentes/proprietários podem não converter.
