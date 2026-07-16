// Vercel Serverless Function — DWG -> DXF
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
      error: 'Conversor DWG não configurado no servidor. Configure CONVERT_API_URL ou converta o DWG para DXF e importe o DXF.'
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
      res.status(502).json({ error: 'O serviço de conversão falhou: ' + (txt || r.statusText) });
      return;
    }

    const dxf = await r.text();
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.status(200).send(dxf);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao converter DWG: ' + (err?.message || err) });
  }
}
