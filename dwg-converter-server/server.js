import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 }
});

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, options);
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', d => stdout += d.toString());
    p.stderr.on('data', d => stderr += d.toString());
    p.on('error', reject);
    p.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `${cmd} terminou com código ${code}`));
    });
  });
}

async function convertWithDwgRead(inputPath, outputPath) {
  // LibreDWG: dwgread -O DXF -o output.dxf input.dwg
  await run('dwgread', ['-O', 'DXF', '-o', outputPath, inputPath]);
}

app.get('/', (req, res) => {
  res.type('text/plain').send('Aloe DWG Converter OK. Use POST /convert-dwg com campo dwg.');
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/convert-dwg', upload.single('dwg'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Envie o ficheiro no campo multipart chamado dwg.' });
    return;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwg-'));
  const input = path.join(tmpDir, 'input.dwg');
  const output = path.join(tmpDir, 'output.dxf');

  try {
    await fs.writeFile(input, req.file.buffer);
    await convertWithDwgRead(input, output);
    const dxf = await fs.readFile(output, 'utf8');

    if (!dxf.includes('SECTION')) {
      res.status(500).json({ error: 'O ficheiro convertido não parece DXF válido.' });
      return;
    }

    res.type('text/plain; charset=utf-8').send(dxf);
  } catch (err) {
    res.status(500).json({
      error: 'Falha na conversão DWG→DXF. Verifique se o DWG é compatível com o conversor instalado. Detalhe: ' + (err?.message || err)
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Aloe DWG Converter listening on ${port}`);
});
