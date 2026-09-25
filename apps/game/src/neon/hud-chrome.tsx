import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { BOARD_COLUMNS, BOARD_ROWS } from './hud-layout.js';

type Size = { w: number; h: number };

/** Measures the parent element of the returned ref'd SVG so chrome can be drawn in exact pixels. */
function useParentSize(): [preact.RefObject<SVGSVGElement>, Size] {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const read = () => setSize(prev => {
      const w = Math.round(parent.clientWidth), h = Math.round(parent.clientHeight);
      return prev.w === w && prev.h === h ? prev : { w, h };
    });
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(read);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

export interface Corners { tl?: number; tr?: number; br?: number; bl?: number }

/** Closed polygon with chamfered corners, inset from the element box. */
export function chamfer(w: number, h: number, c: Corners, inset = 0): string {
  const k = inset * 0.4142;
  const tl = c.tl ? Math.max(0, c.tl - k) : 0, tr = c.tr ? Math.max(0, c.tr - k) : 0;
  const br = c.br ? Math.max(0, c.br - k) : 0, bl = c.bl ? Math.max(0, c.bl - k) : 0;
  const l = inset, t = inset, r = w - inset, b = h - inset;
  const pts: [number, number][] = [[l + tl, t], [r - tr, t]];
  if (tr) pts.push([r, t + tr]);
  pts.push([r, b - br]);
  if (br) pts.push([r - br, b]);
  pts.push([l + bl, b]);
  if (bl) pts.push([l, b - bl]);
  pts.push([l, t + tl]);
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
}

export type Tone = 'cyan' | 'gold' | 'pink' | 'dim';

interface ChromeProps {
  corners?: Corners;
  tone?: Tone;
  /** Diagonal hatch block on the top edge, measured from the right. */
  hatch?: boolean;
  /** Short gold tick on the bottom-left edge. */
  tick?: boolean;
  /** Bright accent runs along the chamfered corners. */
  accents?: boolean;
  /** Second, inner outline. */
  inner?: boolean;
  /** Filled progress run along the top edge, 0..1. */
  progress?: number | undefined;
  /** Raised trapezoid tab on the top edge. */
  tab?: boolean;
}

/** Layered SVG chrome for a HUD plate: translucent fill, dim edge, lit corner runs, inner line, hatching. */
export function PlateChrome({ corners = { tl: 9, br: 9 }, tone = 'cyan', hatch = false, tick = false,
  accents = true, inner = true, progress, tab = false }: ChromeProps) {
  const [ref, { w, h }] = useParentSize();
  const tl = corners.tl ?? 0, br = corners.br ?? 0, tr = corners.tr ?? 0, bl = corners.bl ?? 0;
  const run = Math.min(34, w * .3);
  return <svg ref={ref} class={`plate-chrome tone-${tone}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
    {w > 0 && <>
      <path class="pc-fill" d={chamfer(w, h, corners, .5)} />
      <path class="pc-scan" d={chamfer(w, h, corners, .5)} />
      <path class="pc-edge" d={chamfer(w, h, corners, .5)} />
      {inner && <path class="pc-inner" d={chamfer(w, h, corners, 3.5)} />}
      {accents && <g class="pc-accent">
        {tl ? <polyline points={`1,${tl + 12} 1,${tl} ${tl},1 ${tl + run},1`} /> : <polyline points={`1,14 1,1 ${run},1`} />}
        {br ? <polyline points={`${w - 1},${h - br - 12} ${w - 1},${h - br} ${w - br},${h - 1} ${w - br - run},${h - 1}`} />
          : <polyline points={`${w - 1},${h - 14} ${w - 1},${h - 1} ${w - run},${h - 1}`} />}
        {tr > 0 && <polyline points={`${w - tr - 10},1 ${w - tr},1 ${w - 1},${tr} ${w - 1},${tr + 10}`} />}
        {bl > 0 && <polyline points={`1,${h - bl - 10} 1,${h - bl} ${bl},${h - 1} ${bl + 10},${h - 1}`} />}
      </g>}
      {hatch && w > 90 && <g class="pc-hatch">{[0, 1, 2, 3, 4].map(i => {
        const x = w - (tr || 8) - 16 - i * 5;
        return <line x1={x} y1={4.5} x2={x + 3} y2={1.5} />;
      })}</g>}
      {tab && w > 70 && <polyline class="pc-tab" points={`${w * .52},1 ${w * .52 + 4},-2.5 ${w * .52 + Math.min(40, w * .28)},-2.5 ${w * .52 + Math.min(40, w * .28) + 4},1`} />}
      {tick && <rect class="pc-tick" x={bl + 8} y={h - 2.5} width={12} height={2} />}
      {progress !== undefined && <line class="pc-progress" x1={tl + 1} y1={1} x2={tl + 1 + Math.max(0, Math.min(1, progress)) * (w - tl - tr - 2)} y2={1} />}
    </>}
  </svg>;
}

/** Shared gradients and glow filters. userSpaceOnUse regions keep zero-height lines from vanishing. */
export function HudDefs() {
  return <svg class="hud-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hud-fill-cyan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d2c36" stop-opacity=".94" /><stop offset="1" stop-color="#040e13" stop-opacity=".94" />
      </linearGradient>
      <linearGradient id="hud-fill-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5a3d0a" /><stop offset=".5" stop-color="#241805" /><stop offset="1" stop-color="#3d2a08" />
      </linearGradient>
      <pattern id="hud-scan" width="4" height="3" patternUnits="userSpaceOnUse">
        <rect width="4" height="1" fill="#7ff3ff" fill-opacity=".035" />
      </pattern>
      <filter id="hud-glow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="2000" height="3000">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="hud-glow-soft" filterUnits="userSpaceOnUse" x="-40" y="-40" width="2000" height="3000">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  </svg>;
}

/** Full-height side rails that frame the arena: lit brackets, dim runs, tick ladders and gold markers. */
export function RailFrame() {
  const [ref, { w, h }] = useParentSize();
  if (!w || !h) return <svg ref={ref} class="rail-frame" aria-hidden="true" />;
  const L = 1.5, R = w - 1.5, mid = h / 2;
  const ladder = (x: number, y: number, dir: 1 | -1) => [0, 1, 2, 3, 4, 5].map(i =>
    <line class="rf-ladder" x1={x} y1={y + i * 6} x2={x + dir * (i % 3 === 0 ? 6 : 3)} y2={y + i * 6} />);
  return <svg ref={ref} class="rail-frame" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
    <g class="rf-dim">
      <polyline points={`${L},46 ${L},${mid - 70}`} />
      <polyline points={`${L},${mid - 38} ${L},${mid + 60} ${L + 4},${mid + 66} ${L + 4},${mid + 120} ${L},${mid + 126} ${L},${h - 46}`} />
      <polyline points={`${R},46 ${R},${mid - 120} ${R - 4},${mid - 114} ${R - 4},${mid - 60} ${R},${mid - 54} ${R},${mid + 38}`} />
      <polyline points={`${R},${mid + 70} ${R},${h - 46}`} />
    </g>
    <g class="rf-lit">
      <polyline points={`${L + 20},${L} ${L + 6},${L} ${L},${L + 6} ${L},40`} />
      <polyline points={`${R - 20},${L} ${R - 6},${L} ${R},${L + 6} ${R},40`} />
      <polyline points={`${L + 20},${h - L} ${L + 6},${h - L} ${L},${h - L - 6} ${L},${h - 40}`} />
      <polyline points={`${R - 20},${h - L} ${R - 6},${h - L} ${R},${h - L - 6} ${R},${h - 40}`} />
      <polyline points={`${L},${mid - 66} ${L},${mid - 42}`} />
      <polyline points={`${R},${mid + 42} ${R},${mid + 66}`} />
    </g>
    <rect class="rf-gold" x={L - 1} y={mid - 64} width={3} height={20} />
    <rect class="rf-gold" x={R - 2} y={mid + 44} width={3} height={20} />
    {ladder(L + 3, mid + 72, 1)}
    {ladder(R - 3, mid - 108, -1)}
  </svg>;
}

const CREEP_GLYPH_COLORS: Record<string, string> = {
  drone: '#d0ff64', broodling: '#ff648e', carapace: '#ffa35c', glider: '#80a8ff',
};

/** Outlined, glowing creep silhouette matching the arena primitives. */
export function CreepGlyph({ kind, size = 18 }: { kind: string; size?: number }) {
  const color = CREEP_GLYPH_COLORS[kind] ?? '#9fdfff';
  const shape = kind === 'drone' ? <path d="M12 3 21.5 20h-19z" />
    : kind === 'broodling' ? <path d="m12 2.5 9.5 9.5-9.5 9.5L2.5 12z" />
    : kind === 'carapace' ? <path d="m7 3.5h10l5 8.5-5 8.5H7L2 12z" />
    : <path d="M3 4 21 12 3 20l4-8z" />;
  return <svg class="creep-glyph" width={size} height={size} viewBox="0 0 24 24" style={{ color }} aria-hidden="true">
    <g fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="2" stroke-linejoin="round" filter="url(#hud-glow)">{shape}</g>
  </svg>;
}

/** Miniature of the live ground route on the 9x14 grid. */
export function MiniRoute({ route, spawn, exit, cell = 3 }: { route: readonly number[]; spawn: number; exit: number; cell?: number }) {
  const w = BOARD_COLUMNS * cell, h = BOARD_ROWS * cell;
  const pt = (c: number) => `${(c % BOARD_COLUMNS + .5) * cell},${(Math.floor(c / BOARD_COLUMNS) + .5) * cell}`;
  const dots: JSX.Element[] = [];
  for (let x = 0; x < BOARD_COLUMNS; x += 2) for (let y = 0; y < BOARD_ROWS; y += 2)
    dots.push(<rect class="mr-dot" x={x * cell + cell / 2 - .4} y={y * cell + cell / 2 - .4} width=".8" height=".8" />);
  const [sx, sy] = pt(spawn).split(',').map(Number), [ex, ey] = pt(exit).split(',').map(Number);
  return <svg class="mini-route" width={w + 4} height={h + 4} viewBox={`-2 -2 ${w + 4} ${h + 4}`} aria-hidden="true">
    <rect class="mr-frame" x="-1.5" y="-1.5" width={w + 3} height={h + 3} />
    {dots}
    <polyline class="mr-path" points={route.map(pt).join(' ')} />
    <circle class="mr-spawn" cx={sx} cy={sy} r="1.8" />
    <circle class="mr-exit" cx={ex} cy={ey} r="1.8" />
  </svg>;
}

/** Kill-rate histogram: recent buckets, newest at the right. */
export function KillBars({ values, height = 26 }: { values: readonly number[]; height?: number }) {
  const peak = Math.max(4, ...values);
  const bar = 3, gap = 1.5, w = values.length * (bar + gap) - gap;
  return <svg class="kill-bars" width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden="true">
    <line class="kb-base" x1="0" y1={height - .5} x2={w} y2={height - .5} />
    {values.map((v, i) => {
      const bh = v ? Math.max(2, (v / peak) * (height - 3)) : 2;
      return <rect class={!v ? 'kb-bar is-empty' : i === values.length - 1 ? 'kb-bar is-now' : 'kb-bar'} x={i * (bar + gap)} y={height - 1 - bh} width={bar} height={bh} />;
    })}
  </svg>;
}

/** Triple chevron mark for the launch control. */
export function LaunchChevrons() {
  return <svg class="launch-chevrons" width="44" height="18" viewBox="0 0 44 18" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="square" filter="url(#hud-glow)">
      <path d="M4 2l7 7-7 7" opacity=".45" /><path d="M17 2l7 7-7 7" opacity=".75" /><path d="M30 2l7 7-7 7" />
    </g>
  </svg>;
}
