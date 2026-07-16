# Aloe LSF 360 — função DWG -> DXF

Base: `MENUS_OK_BARRA_ESCURECER_PAREDES`.

## Acrescentado

Foi criada a função:

```js
convertDWGToDXF(file)
```

E o fluxo:

```js
importDWG(file)
```

Quando carregar `.dwg`, a app tenta:

1. enviar o ficheiro para `/api/convert-dwg`;
2. receber DXF;
3. importar automaticamente o DXF;
4. continuar com os processos antigos: calibrar, Auto desenho, LSF, CSV.

## Importante

DWG nativo não é convertido diretamente no browser.  
A função está pronta, mas precisa de um conversor no servidor.

## Ficheiros novos

- `api/convert-dwg.js`
- `server-dwg-converter/README.md`

## Ativar conversão real

No Vercel, configurar variável de ambiente:

```text
CONVERT_API_URL=https://SEU-SERVIDOR/convert-dwg
```
