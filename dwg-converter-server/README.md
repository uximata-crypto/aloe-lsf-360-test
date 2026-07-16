# Aloe DWG Converter Server

Servidor externo para converter DWG em DXF.

A app Vercel chama:

```text
/api/convert-dwg
```

Esse proxy chama este servidor:

```text
POST /convert-dwg
```

## Deploy rápido

### Opção 1 — Docker

```bash
docker build -t aloe-dwg-converter .
docker run -p 3000:3000 aloe-dwg-converter
```

Teste:

```bash
curl http://localhost:3000/health
```

### Opção 2 — Render/Railway/VPS

Faça deploy desta pasta `dwg-converter-server`.

Depois copie o URL público, por exemplo:

```text
https://aloe-dwg-converter.onrender.com/convert-dwg
```

No Vercel da app Aloe LSF 360, crie a variável:

```text
CONVERT_API_URL=https://aloe-dwg-converter.onrender.com/convert-dwg
```

Depois faça redeploy da app Vercel.

## Nota

O servidor usa `dwgread` do LibreDWG. Alguns DWG recentes/proprietários podem não converter. Nesses casos, use ODA File Converter num servidor próprio ou converta para DXF no AutoCAD/BricsCAD/DraftSight.
