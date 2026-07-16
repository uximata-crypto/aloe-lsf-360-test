# Aloe LSF 360 — Render Low RAM Fix

Esta versão corrige o build no Render Free.

O problema anterior foi na compilação do LibreDWG.  
Agora o Dockerfile compila com menos memória:

```text
MAKEFLAGS=-j1
```

## Atualizar no GitHub

Substituir ficheiros na pasta:

```text
dwg-converter-server
```

principalmente:

```text
Dockerfile
README.md
```

Depois fazer novo commit e no Render:

```text
Manual Deploy → Deploy latest commit
```
