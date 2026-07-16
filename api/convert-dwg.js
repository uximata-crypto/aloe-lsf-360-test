// Proxy Vercel: recebe DWG e encaminha para um servidor conversor DWG -> DXF.
//
// Configuração obrigatória no Vercel:
// CONVERT_API_URL=https://SEU-SERVIDOR-CONVERSOR/convert-dwg
//
// O servidor conversor deve receber multipart/form-data com campo "dwg"
// e devolver o DXF em texto/plain.

export const config = {
  api: { bodyParser: false }
};

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST com multipart/form-data e campo dwg.' });
    return;
  }

  const converterUrl = process.env.CONVERT_API_URL;
  if (!converterUrl) {
    res.status(501).json({
      error: 'Conversor DWG não configurado. No Vercel, crie a variável CONVERT_API_URL apontando para o servidor conversor DWG→DXF.'
    });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const r = await fetch(converterUrl, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      res.status(502).json({
        error: 'O servidor conversor respondeu com erro: ' + (txt || r.statusText)
      });
      return;
    }

    const dxf = await r.text();
    if (!dxf || !dxf.includes('SECTION')) {
      res.status(502).json({
        error: 'A conversão não devolveu um DXF válido.'
      });
      return;
    }

    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.status(200).send(dxf);
  } catch (err) {
    res.status(500).json({
      error: 'Erro ao chamar o servidor conversor DWG→DXF: ' + (err?.message || err)
    });
  }
}
