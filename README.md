# Aloe LSF 360 — Pack de Teste Completo

## Ficheiros para GitHub/Vercel
- `index.html`
- `styles.css`
- `app.js`
- `vercel.json`

Carregue todos os ficheiros diretamente na raiz do repositório `aloe-lsf-360-test`.

## O que funciona nesta base
- Cabeçalho Aloe LSF 360 e interface completa de teste.
- Retângulo, linha, círculo, arco, polígono e laço em 2D.
- As figuras ficam fixas e visíveis em SVG.
- Seleção por clique direto e pela lista no painel direito.
- Seleção múltipla e filtros por tipo/perfil.
- Vista 3D com Three.js, órbita 360°, zoom e pan.
- Empurrar/Puxar com definição de altura.
- Gerar LSF com guias U e montantes C individuais.
- Seleção de perfis individuais, mover, rodar e apagar.
- CSV básico de fabrico por painel/perfil.
- Geolocalização por rua, código postal e localidade guardada no projeto.

## Limites conhecidos
- A geolocalização ainda não consulta mapas/terreno externo.
- DXF/DWG e CSV CNC específico da perfiladora serão módulos seguintes.
- A exportação CSV incluída é uma lista de corte estruturada, não substitui regras CNC específicas de `DIMPLE`, `NOTCH`, `SWAGE`, etc.

## Teste recomendado
1. Abra o site: deve aparecer `Retângulo 1` visível no centro.
2. Selecione o retângulo pelo clique ou pela lista em `Entidade`.
3. Escolha `Empurrar/Puxar`, clique no retângulo e indique `2.70`.
4. Mude para 3D e teste `Órbita`.
5. Clique `Gerar LSF`.
6. Na aba `Seleção`, selecione um montante individual e use `Mover` ou `Apagar`.
7. Clique `Gerar CSV`.
