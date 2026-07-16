# Servidor conversor DWG -> DXF

A app Vercel chama `/api/convert-dwg`.

Para conversão real, configure a variável:

```text
CONVERT_API_URL=https://SEU-SERVIDOR/convert-dwg
```

Esse servidor deve receber `multipart/form-data` com o campo `dwg` e devolver o DXF como texto.

Conversores possíveis no servidor:

- ODA File Converter instalado no servidor;
- LibreDWG (`dwgread`) quando compatível;
- serviço CAD próprio.
