# Aloe LSF 360 — Escurecimento automático de paredes estruturais

## Alteração implementada

Ao importar uma planta em **PNG, JPG, WEBP, SVG ou PDF**, a aplicação passa a:

1. preservar internamente a imagem original;
2. analisar os píxeis e localizar zonas lineares compatíveis com paredes;
3. detetar paredes horizontais e verticais visíveis;
4. escurecer automaticamente as zonas identificadas;
5. apresentar o resultado sem impedir a calibração nem o Auto desenho.

A função fica **ativa por defeito**.

## Controlos adicionados

No separador **Imagem** foram acrescentados:

- ativar/desativar o escurecimento automático;
- intensidade do escurecimento;
- sensibilidade da deteção: baixa, normal ou alta;
- botão **Refazer escurecimento**.

Na barra superior foi acrescentado o botão **Escurecer paredes**.

## DXF

Nas importações DXF, a aplicação procura pares de linhas paralelas e linhas exteriores longas compatíveis com paredes estruturais. As linhas reconhecidas recebem uma representação mais escura.

## Preservação da planta original

O processamento não destrói a imagem original. Ao desligar a opção ou alterar a sensibilidade, a aplicação volta a processar a fonte original, evitando perda progressiva de qualidade.

## Instalação no GitHub/Vercel

Substituir os ficheiros existentes por:

- `index.html`
- `app.js`
- `styles.css`
- `vercel.json`
- pasta `assets`

Os parâmetros de versão adicionados ao `index.html` ajudam a evitar que o navegador mantenha versões antigas de JavaScript ou CSS em cache.

## Funcionalidades anteriores mantidas

Mantêm-se o Auto desenho, calibração por dois pontos, deteção de portas e janelas, edição de vãos, associação dos vãos aos painéis, numeração automática e exportação CSV.

## Correção da deteção e intensidade das paredes

- A intensidade passou a atuar sobre uma máscara separada da imagem original e responde em tempo real ao arrastar a barra.
- A deteção usa continuidade, espessura e pares de linhas paralelas, permitindo encontrar mais paredes exteriores e interiores.
- O Auto desenho alinha automaticamente o contorno detetado com a planta importada.
- As etiquetas das paredes automáticas deixam de aparecer todas ao mesmo tempo; surgem ao selecionar a parede.
