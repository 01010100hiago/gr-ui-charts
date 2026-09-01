import { useId, useState } from 'react';

// Donut 3D — anel com furo (total no centro), fatias extrudadas pra baixo
// (paredes escurecidas), topo glossy, raio E altura proporcionais ao valor
// do canal (maior valor = fatia mais alta). Interações:
//  - hover levanta a fatia (e sua linha/rótulo) 6px pra cima, com glow;
//  - canais com valor 0 ganham uma fatia mínima só pra a cor marcar presença;
//  - rótulos externos em "leque" (saem radial, divergem em diagonal pra sua
//    própria coluna vertical) — nunca cruzam o pie nem se sobrepõem entre si;
//  - texto do total no centro encolhe sozinho conforme o número cresce.
//
// Requer que o app hospedeiro defina os tokens CSS --foreground e
// --muted-foreground (ex.: tema shadcn/ui) e, se usar as classes de entrada
// (animate-in/fade-in/zoom-in-90/duration-700), o plugin tailwindcss-animate.

export interface CanalPieDado {
  name: string;
  value: number;
  color: string;
}

export interface CanalPieDonutProps {
  dados: CanalPieDado[];
  totalLabel: string;
}

export function CanalPieDonut({ dados, totalLabel }: CanalPieDonutProps) {
  const [fatiaAtiva, setFatiaAtiva] = useState<string | null>(null);
  // sufixo único: evita colisão de id se o componente renderizar mais de uma
  // vez na mesma página (gradiente/filtro em <defs> são globais ao document).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // W com folga lateral: os rótulos (nome + "R$ X · N%") ficam FORA do anel e
  // o SVG corta o que passa do viewBox — com 340 de largura, nomes longos como
  // "Mercado Livre" eram truncados na borda.
  const W = 400, H = 210, cx = W / 2, cy = 96, ky = 0.8;
  const RI = 40, RO_MIN = 58, RO_MAX = 74, H_MIN = 8, H_MAX = 16, GAP = 2;

  // Todo canal marca presença: quem está zerado/minúsculo ganha uma fatia
  // mínima (~1,5% do giro) só pra cor existir no círculo.
  const MIN_FRAC = 0.015;
  const somaReal = dados.reduce((a, d) => a + d.value, 0) || 1;
  const ajustados = dados.map(d => ({ ...d, vAdj: Math.max(d.value, somaReal * MIN_FRAC) }));
  const total = ajustados.reduce((a, d) => a + d.vAdj, 0) || 1;
  const maior = Math.max(...dados.map(d => d.value), 1);

  const pt = (deg: number, r: number, dy = 0): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + ky * r * Math.sin(rad) + dy];
  };
  const arco = (a0: number, a1: number, r: number, dy = 0) => {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 3));
    return Array.from({ length: n + 1 }, (_, i) => pt(a0 + ((a1 - a0) * i) / n, r, dy));
  };
  const caminho = (pts: [number, number][]) =>
    `M ${pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')} Z`;

  let ang = -90;
  const fatias = ajustados.map(d => {
    const sweep = (d.vAdj / total) * 360;
    const ro = RO_MIN + (d.value / maior) * (RO_MAX - RO_MIN);
    const h = H_MIN + (d.value / maior) * (H_MAX - H_MIN);
    const a0 = ang + GAP / 2, a1 = ang + sweep - GAP / 2;
    ang += sweep;
    return { ...d, a0, a1, ro, h, mid: (a0 + a1) / 2 };
  }).filter(f => f.a1 - f.a0 > 0.3);

  const ordenadas = [...fatias].sort((x, y) => Math.sin((x.mid * Math.PI) / 180) - Math.sin((y.mid * Math.PI) / 180));
  const anel = (f: typeof fatias[0], dy: number) => caminho([...arco(f.a0, f.a1, f.ro, dy), ...arco(f.a1, f.a0, RI, dy)]);
  const fmtVal = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k` : `R$ ${Math.round(v)}`;
  // % sobre o total REAL (não o ajustado com piso mínimo) — canal zerado mostra 0%.
  const pctReal = (v: number) => Math.round((v / somaReal) * 100);

  return (
    // wrap preenche 100% do espaço que o pai (flex-1) reservar — útil quando o
    // card divide altura em grid com um vizinho maior. O svg tem teto de
    // tamanho (max-w/max-h) pra não virar gigante em cards muito largos; quando
    // o teto entra em ação, flex items-center+justify-center centraliza nos
    // dois eixos (absolute+inset sem margin:auto nos dois eixos prende o svg
    // num canto — evite essa rota).
    <div className="relative flex-1 w-full h-full min-h-[160px] flex items-center justify-center animate-in fade-in zoom-in-90 duration-700">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full max-w-[420px] max-h-[260px]">
        <defs>
          <linearGradient id={`canalGlossDonut-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
            <stop offset="45%" stopColor="#ffffff" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        {ordenadas.map(f => {
          const base = anel(f, f.h);
          const i0 = f.a0, i1 = Math.min(f.a1, 0);
          const paredeInterna = f.a0 < 0 && i1 > i0
            ? caminho([...arco(i0, i1, RI, 0), ...arco(i1, i0, RI, f.h)]) : null;
          const e0 = Math.max(f.a0, 0), e1 = Math.min(f.a1, 180);
          const paredeExterna = e1 > e0
            ? caminho([...arco(e0, e1, f.ro, 0), ...arco(e1, e0, f.ro, f.h)]) : null;
          const topo = anel(f, 0);
          const ativa = fatiaAtiva === f.name;
          const desloc = ativa ? 'translate(0, -6px)' : 'translate(0, 0)';
          return (
            <g key={f.name}
              onMouseEnter={() => setFatiaAtiva(f.name)} onMouseLeave={() => setFatiaAtiva(null)}
              style={{
                transform: desloc, transition: 'transform 0.2s ease, filter 0.2s ease', cursor: 'pointer',
                filter: ativa ? `brightness(1.12) drop-shadow(0 0 6px color-mix(in srgb, ${f.color} 55%, transparent))` : 'none',
              }}>
              <path d={base} fill={f.color} />
              <path d={base} fill="#000" opacity={0.45} />
              {paredeInterna && (<><path d={paredeInterna} fill={f.color} /><path d={paredeInterna} fill="#000" opacity={0.55} /></>)}
              {paredeExterna && (<><path d={paredeExterna} fill={f.color} /><path d={paredeExterna} fill="#000" opacity={0.3} /></>)}
              {[f.a0, f.a1].map((a, i) => {
                const corte = caminho([pt(a, RI, 0), pt(a, f.ro, 0), pt(a, f.ro, f.h), pt(a, RI, f.h)]);
                return (<g key={i}><path d={corte} fill={f.color} /><path d={corte} fill="#000" opacity={0.4} /></g>);
              })}
              <path d={topo} fill={f.color} />
              <path d={topo} fill={`url(#canalGlossDonut-${uid})`} />
            </g>
          );
        })}
        {/* rótulos externos: linha na cor + nome + valor. Anti-colisão vertical
            de 26px, balanceamento de lados (no máx. metade dos rótulos por lado)
            e roteamento em leque (radial → diagonal → coluna própria). */}
        {(() => {
          const rotulos = fatias.map(f => {
            const dir = Math.cos((f.mid * Math.PI) / 180) >= 0;
            const [x0, y0] = pt(f.mid, f.ro - 1);
            const [, y1] = pt(f.mid, f.ro + 14);
            return { f, dir, x0, y0, ly: y1 };
          });
          const maxPorLado = Math.ceil(rotulos.length / 2);
          for (const lado of [true, false]) {
            const grupo = rotulos.filter(r => r.dir === lado);
            if (grupo.length <= maxPorLado) continue;
            grupo
              .sort((a, b) => Math.abs(Math.cos((a.f.mid * Math.PI) / 180)) - Math.abs(Math.cos((b.f.mid * Math.PI) / 180)))
              .slice(0, grupo.length - maxPorLado)
              .forEach(r => { r.dir = !lado; });
          }
          const MIN_DIST = 26;
          const comIdx = rotulos as (typeof rotulos[0] & { idx: number })[];
          for (const lado of [true, false]) {
            const grupo = comIdx.filter(r => r.dir === lado).sort((a, b) => a.ly - b.ly);
            for (let i = 1; i < grupo.length; i++) {
              if (grupo[i].ly - grupo[i - 1].ly < MIN_DIST) grupo[i].ly = grupo[i - 1].ly + MIN_DIST;
            }
            const estouro = grupo.length ? grupo[grupo.length - 1].ly - (H - 14) : 0;
            if (estouro > 0) grupo.forEach(r => { r.ly -= estouro; });
            if (grupo.length > 1) grupo[0].ly = Math.max(16, grupo[0].ly - 12);
            grupo.forEach((r, i) => { r.idx = i; });
          }
          return comIdx.map(({ f, dir, x0, y0, ly, idx }) => {
            const [xe, ye] = pt(f.mid, RO_MAX + 12);
            const colX = dir ? cx + RO_MAX + 16 : cx - (RO_MAX + 16);
            const xm = dir
              ? Math.max(colX - 4 - idx * 6, cx + RO_MAX + 4)
              : Math.min(colX + 4 + idx * 6, cx - (RO_MAX + 4));
            const tx = colX + (dir ? 4 : -4);
            const pontos = `${x0.toFixed(0)},${y0.toFixed(0)} ${xe.toFixed(0)},${ye.toFixed(0)} ${xm.toFixed(0)},${ly.toFixed(0)} ${colX.toFixed(0)},${ly.toFixed(0)}`;
            const ativa = fatiaAtiva === f.name;
            return (
              <g key={f.name}
                onMouseEnter={() => setFatiaAtiva(f.name)} onMouseLeave={() => setFatiaAtiva(null)}
                style={{ transform: ativa ? 'translate(0, -6px)' : 'translate(0, 0)', transition: 'transform 0.2s ease', cursor: 'pointer' }}>
                <polyline points={pontos} fill="none" stroke="transparent" strokeWidth={10} />
                <polyline points={pontos} fill="none" stroke={f.color} strokeWidth={1} opacity={0.85} />
                <circle cx={colX + (dir ? 3 : -3)} cy={ly} r={2.5} fill={f.color} />
                <text x={tx} y={ly - 3} textAnchor={dir ? 'start' : 'end'} fontSize={12} fontWeight={600} fill="var(--muted-foreground)">{f.name}</text>
                <text x={tx} y={ly + 12} textAnchor={dir ? 'start' : 'end'} fontSize={11.5} fontWeight={700} fill={f.color}>{fmtVal(f.value)} · {pctReal(f.value)}%</text>
              </g>
            );
          });
        })()}
        {/* total no centro do furo — fonte encolhe conforme o texto cresce
            (largura útil do furo ≈ 2*RI*0.92; ~0.58em por caractere em bold) */}
        {(() => {
          const larguraUtil = 2 * RI * 0.92;
          const fs = Math.max(10, Math.min(19, Math.floor(larguraUtil / (totalLabel.length * 0.58))));
          return (
            <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight={700} fill="var(--foreground)">
              {totalLabel}
            </text>
          );
        })()}
      </svg>
    </div>
  );
}
