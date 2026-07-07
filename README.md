# Aloe LSF 360 — Teste Render 3D Estável

## Correção de renderização
Esta versão substitui a projeção anterior por uma câmara em perspetiva própria, com:
- duas direções de grelha no terreno;
- prisma retangular com base, topo e faces laterais corretas;
- profundidade e ordem de faces para não atravessar a geometria;
- órbita horizontal contínua, inclinação vertical controlada e zoom;
- elementos 2D fechados continuam visíveis no 3D mesmo antes de receberem altura;
- retângulo inicial já com 2,70 m, para validar a vista 3D imediatamente.

## Teste
1. Abra em 2D e veja o retângulo inicial.
2. Carregue em 3D: o prisma deve aparecer de imediato.
3. Selecione Órbita e arraste; use a roda do rato para zoom.
4. Use Gerar LSF: os montantes/guias surgem sobre o volume e podem ser selecionados.
