# Aloe LSF 360 — Importar PDF / DXF / DWG + CSV

## Novidades

A função **Importar imagem** passa a aceitar:

- PNG / JPG / WebP / SVG;
- PDF — é importada a primeira página como imagem de fundo;
- DXF — importação básica de entidades `LINE` e `LWPOLYLINE`;
- DWG — o ficheiro é detetado, mas precisa de conversão para DXF.

## Nota sobre DWG

DWG é um formato proprietário. Não é seguro prometer leitura DWG nativa diretamente no navegador. O caminho correto é:

1. Converter DWG para DXF com serviço CAD no servidor, ODA File Converter, AutoCAD, LibreDWG ou outro conversor licenciado.
2. Importar o DXF resultante.
3. Calibrar/verificar escala.
4. Gerar estrutura LSF e CSV.

## Fluxo recomendado

1. Clique em **Importar imagem**.
2. Escolha PDF, DXF ou imagem.
3. Se for PDF/imagem, clique em **Calibrar imagem** e marque dois pontos conhecidos.
4. Desenhe por cima ou use as linhas DXF importadas como referência.
5. Use **Empurrar/Puxar**.
6. Use **Gerar LSF**.
7. Use **Pré-cálculo**.
8. Use **Gerar CSV**.
