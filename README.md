# gr-ui-charts

Gráficos SVG customizados usados no dashboard GR AutoPeças/Pitstop — desenhados
na mão porque libs de chart (Recharts, etc.) não suportam raio/altura variável
por fatia num pie/donut.

## Componentes

- **`CanalPieDonut`** (também exportado como `CanalPie`) — versão atual em
  produção. Donut 3D com raio e altura proporcionais ao valor de cada canal,
  hover que levanta a fatia, rótulos externos roteados em leque (nunca cruzam
  o pie nem se sobrepõem), fatia mínima para canais zerados, e texto central
  que encolhe sozinho conforme o valor cresce.
- **`CanalPieBasic`** — variante mais simples (sem hover), congelada a partir
  do commit [`b7c3a1d`](https://github.com/01010100hiago/GRautopecas) do
  projeto GRautopecas. Mantida como referência/fallback.

## Uso

```tsx
import { CanalPie, type CanalPieDado } from 'gr-ui-charts';

const dados: CanalPieDado[] = [
  { name: 'Oficina', value: 10566.55, color: 'var(--chart-purple)' },
  { name: 'Balcão', value: 4649.85, color: 'var(--chart-cyan)' },
];

<CanalPie dados={dados} totalLabel="R$ 15,2k" />
```

## Requisitos do app hospedeiro

- **React 18+** (peer dependency).
- **Tokens CSS de tema**: os componentes usam `var(--foreground)` e
  `var(--muted-foreground)` para texto — defina-os no seu `theme.css` (padrão
  shadcn/ui) ou passe cores fixas via `dados[].color`.
- **Tailwind + tailwindcss-animate** (opcional): as classes
  `animate-in fade-in zoom-in-90 duration-700` dão a animação de entrada. Sem
  o plugin, o componente funciona normalmente, só sem essa animação.
- **Tailwind v4 `@source`**: se instalado via dependência git (código-fonte
  puro, sem build), adicione uma entrada `@source` apontando para
  `node_modules/gr-ui-charts/src` no seu `tailwind.css`, senão as classes
  usadas só dentro deste pacote são podadas do CSS final:
  ```css
  @source '../../node_modules/gr-ui-charts/src/**/*.tsx';
  ```

## Instalação (dependência git, sem publicação no npm)

```bash
npm install github:01010100hiago/gr-ui-charts
```

Distribuído como TSX fonte puro (sem etapa de build) — o bundler do projeto
consumidor (Vite/esbuild, Next, etc.) compila os arquivos deste pacote junto
com os seus.
