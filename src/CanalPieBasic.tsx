// Donut 3D estático — anel com furo (total no centro), fatias extrudadas pra
// baixo (paredes escurecidas), topo glossy, raio externo maior no canal maior,
// rótulos externos nome+valor com linha na cor da fatia. Sem interação de hover.
//
// Versão "v1" — congelada a partir de uma iteração anterior do dashboard que
// originou este pacote. Mantida como variante mais simples; para a versão com
// hover, extrusão proporcional refinada e roteamento de rótulos anti-colisão,
// use CanalPieDonut.

export interface CanalPieDado {
  name: string;
  value: number;
  color: string;
}

export interface CanalPieBasicProps {
  dados: CanalPieDado[];
  totalLabel: string;
}

export function CanalPieBasic({ dados, totalLabel }: CanalPieBasicProps) {
  const W = 340, H = 210, cx = W / 2, cy = 96, ky = 0.8;
  const RI = 40, RO_MIN = 58, RO_MAX = 74, H_MIN = 8, H_MAX = 16, GAP = 2;

  const total = dados.reduce((a, d) => a + d.value, 0) || 1;
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
  const fatias = dados.map(d => {
    const sweep = (d.value / total) * 360;
    const ro = RO_MIN + (d.value / maior) * (RO_MAX - RO_MIN);
    const h = H_MIN + (d.value / maior) * (H_MAX - H_MIN);
    const a0 = ang + GAP / 2, a1 = ang + sweep - GAP / 2;
    ang += sweep;
    return { ...d, a0, a1, ro, h, mid: (a0 + a1) / 2 };
  }).filter(f => f.a1 - f.a0 > 0.3);

  const ordenadas = [...fatias].sort((x, y) => Math.sin((x.mid * Math.PI) / 180) - Math.sin((y.mid * Math.PI) / 180));
  const anel = (f: typeof fatias[0], dy: number) => caminho([...arco(f.a0, f.a1, f.ro, dy), ...arco(f.a1, f.a0, RI, dy)]);
  const fmtVal = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${Math.round(v)}`;

  return (
    <div className="relative flex justify-center animate-in fade-in zoom-in-90 duration-700">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[340px] h-auto">
        <defs>
          <linearGradient id="canalGlossBasic" x1="0" y1="0" x2="0.6" y2="1">
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
          return (
            <g key={f.name}>
              <path d={base} fill={f.color} />
              <path d={base} fill="#000" opacity={0.45} />
              {paredeInterna && (<><path d={paredeInterna} fill={f.color} /><path d={paredeInterna} fill="#000" opacity={0.55} /></>)}
              {paredeExterna && (<><path d={paredeExterna} fill={f.color} /><path d={paredeExterna} fill="#000" opacity={0.3} /></>)}
              {[f.a0, f.a1].map((a, i) => {
                const corte = caminho([pt(a, RI, 0), pt(a, f.ro, 0), pt(a, f.ro, f.h), pt(a, RI, f.h)]);
                return (<g key={i}><path d={corte} fill={f.color} /><path d={corte} fill="#000" opacity={0.4} /></g>);
              })}
              <path d={topo} fill={f.color} />
              <path d={topo} fill="url(#canalGlossBasic)" />
            </g>
          );
        })}
        {fatias.map(f => {
          const dir = Math.cos((f.mid * Math.PI) / 180) >= 0;
          const [x0, y0] = pt(f.mid, f.ro + 2);
          const [x1, y1] = pt(f.mid, f.ro + 14);
          const x2 = x1 + (dir ? 26 : -26);
          const tx = x2 + (dir ? 4 : -4);
          return (
            <g key={f.name}>
              <polyline points={`${x0.toFixed(0)},${y0.toFixed(0)} ${x1.toFixed(0)},${y1.toFixed(0)} ${x2.toFixed(0)},${y1.toFixed(0)}`}
                fill="none" stroke={f.color} strokeWidth={1} />
              <text x={tx} y={y1 - 3} textAnchor={dir ? 'start' : 'end'} fontSize={11} fill="var(--muted-foreground)">{f.name}</text>
              <text x={tx} y={y1 + 11} textAnchor={dir ? 'start' : 'end'} fontSize={11} fontWeight={600} fill={f.color}>{fmtVal(f.value)}</text>
            </g>
          );
        })}
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
