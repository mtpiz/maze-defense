import { Graphics } from 'pixi.js';
import type { TowerFamilyId } from '@tower-defense/content';
import { TOWER_COLORS, projectileColors } from './neon-palette.js';

export { TOWER_COLORS } from './neon-palette.js';
export const CREEP_COLORS: Record<string, number> = {
  drone: 0xd0ff64, broodling: 0xff648e, carapace: 0xffa35c, glider: 0x80a8ff,
};

export function primitive(g: Graphics, kind: string, x: number, y: number, r: number, rotation = 0): Graphics {
  const sides = kind === 'drone' || kind === 'glider' ? 3 : kind === 'carapace' ? 6 : 4;
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = rotation + i / sides * Math.PI * 2 - Math.PI / 2;
    return [x + Math.cos(angle) * r, y + Math.sin(angle) * r];
  }).flat();
  return g.poly(points, true);
}

/** Tower Levels 1 and 2, or the twin-barrel art held for a future Rail rapid-fire Specialization. */
export type TowerArtStage = 1 | 2 | 'rapid-fire';

const ART_SIZE = .8;
// Each Tower Level draws 5% larger than the last, so Level 5 is 20% larger than Level 1.
const LEVEL_GROWTH = .05;
const PEDESTAL_ALPHA = .55;
// Screen-space light from the top left, matching the downward drop shadow.
const LIGHT_X = -.5, LIGHT_Y = -.85;
const LIGHT_LENGTH = Math.hypot(LIGHT_X, LIGHT_Y);

export const levelScale = (level: number): number => 1 + LEVEL_GROWTH * (level - 1);
const stageLevel = (stage: TowerArtStage): number => stage === 'rapid-fire' ? 3 : stage;

const regularPolygon = (sides: number, radius: number, spin = 0, cx = 0, cy = 0): number[] =>
  Array.from({ length: sides }, (_, i) => {
    const a = spin + i / sides * Math.PI * 2;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  }).flat();

const tint = (color: number, amount: number): number => {
  const channel = (value: number) => Math.round(amount >= 0 ? value + (255 - value) * amount : value * (1 + amount));
  return channel(color >> 16 & 0xff) << 16 | channel(color >> 8 & 0xff) << 8 | channel(color & 0xff);
};

/** Rail muzzle in cells from the tower centre, before rotating to the tower's facing. */
export function railMuzzle(stage: TowerArtStage, barrel: number, recoil: number): { forward: number; side: number } {
  const size = ART_SIZE * levelScale(stageLevel(stage));
  if (stage === 'rapid-fire') return { forward: (.49 - recoil) * size, side: (barrel === 0 ? -.15 : .15) * size };
  return { forward: (.32 - recoil) * size, side: 0 };
}

/** Siege muzzle distance in cells from the tower centre, along the tower's facing. */
export function siegeMuzzle(stage: 1 | 2, recoil: number): number {
  return (.26 - recoil * .5) * ART_SIZE * levelScale(stage);
}

export function towerArt(g: Graphics, family: TowerFamilyId, x: number, y: number,
  angle = -Math.PI / 2, leftRecoil = 0, rightRecoil = 0, alpha = 1, stage: TowerArtStage = 1): void {
  const size = ART_SIZE * levelScale(stageLevel(stage));
  const color = TOWER_COLORS[family];
  const { core } = projectileColors(family);
  const point = (px: number, py: number) => ({ x: x + size * (px * Math.cos(angle) - py * Math.sin(angle)),
    y: y + size * (px * Math.sin(angle) + py * Math.cos(angle)) });
  const plate = (points: number[], fill: number, line?: number) => {
    const corners: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      const p = point(points[i]!, points[i + 1]!);
      corners.push(p.x, p.y);
    }
    if (line !== undefined) {
      g.poly(corners).stroke({ color: line, width: .12 * size, alpha: .045 * alpha });
      g.poly(corners).stroke({ color: line, width: .055 * size, alpha: .16 * alpha });
    }
    g.poly(corners).fill({ color: fill, alpha });
    if (line !== undefined) g.stroke({ color: line, width: .024 * size, alpha });
  };
  const box = (px: number, py: number, w: number, h: number, fill: number, line?: number) =>
    plate([px, py, px + w, py, px + w, py + h, px, py + h], fill, line);
  const recoil = Math.max(leftRecoil, rightRecoil);
  if (family === 'rail' && stage !== 'rapid-fire') {
    pedestal(g, x, y, size, alpha, stage, RAIL_PEDESTAL);
    plate(regularPolygon(6, .09, Math.PI / 6), 0x16323d, color);
    box(-.02 - recoil, -.045, .34, .09, 0x05080d, color);
    box(.24 - recoil, -.022, .08, .045, core);
    plate(regularPolygon(6, .04, Math.PI / 6), core);
    if (stage === 2) {
      box(-.01, -.09, .3, .02, color);
      box(-.02, .07, .3, .02, color);
    }
    return;
  }
  if (family === 'siege') {
    pedestal(g, x, y, size, alpha, stage === 2 ? 2 : 1, SIEGE_PEDESTAL);
    siegeCannon(stage === 2 ? 2 : 1, recoil, angle, color, plate, box);
    return;
  }
  g.roundRect(x - .31 * size, y - .12 * size, .66 * size, .57 * size, .05 * size)
    .fill({ color: 0x000000, alpha: .8 * alpha });
  if (family === 'foundation') {
    g.rect(x - .3 * size, y - .3 * size, .6 * size, .6 * size)
      .stroke({ color, width: .045 * size, alpha: .42 * alpha });
    g.rect(x - .27 * size, y - .27 * size, .54 * size, .54 * size)
      .stroke({ color, width: .018 * size, alpha: .76 * alpha });
    g.rect(x - .27 * size, y - .22 * size, .54 * size, .5 * size).fill({ color: 0x10181d, alpha });
    g.rect(x - .27 * size, y - .27 * size, .54 * size, .4 * size).fill({ color: 0x162328, alpha });
    g.rect(x - .18 * size, y - .18 * size, .36 * size, .26 * size).fill({ color: 0x0c1116, alpha });
    g.rect(x - .1 * size, y - .08 * size, .2 * size, .07 * size).fill({ color: core, alpha: .62 * alpha });
    for (const dx of [-.27, .2]) g.rect(x + dx * size, y - .27 * size, .07 * size, .14 * size)
      .fill({ color, alpha: .68 * alpha });
    return;
  }
  if (family === 'rail') {
    plate([-.36, -.22, -.17, -.33, .11, -.22, .11, .22, -.17, .33, -.36, .22], 0x102733, color);
    box(-.33, -.16, .24, .32, 0x287086);
    for (const [side, recoil] of [[-.15, leftRecoil], [.15, rightRecoil]]) {
      const r = recoil!; const y = side!;
      plate([-.22-r,y-.085,.38-r,y-.085,.49-r,y-.04,.49-r,y+.04,.38-r,y+.085,-.22-r,y+.085], 0x05080d, color);
      box(-.12-r, y-.025, .54, .05, core);
      box(.33-r, y-.075, .13, .15, color);
      box(.45-r, y-.045, .025, .09, core);
    }
    box(-.28, -.06, .17, .12, core);
  } else {
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      const rotate = (points: number[]) => points.flatMap((v, j) => j % 2 ? [] :
        [v * Math.cos(a) - points[j + 1]! * Math.sin(a), v * Math.sin(a) + points[j + 1]! * Math.cos(a)]);
      plate(rotate([.08,-.08,.25,-.17,.43,-.12,.36,.07,.14,.15]), 0x48204e, color);
      plate(rotate([.23,-.08,.43,-.12,.36,.07,.29,.08]), color);
      plate(rotate([.35,-.08,.43,-.12,.39,.015]), core);
    }
    primitive(g, 'broodling', x, y, .15 * size, angle).fill({ color: 0x24162f, alpha })
      .stroke({ color, width: .035 * size, alpha });
    primitive(g, 'broodling', x, y, .07 * size, angle).fill({ color: core, alpha });
  }
}

type Plate = (points: number[], fill: number, line?: number) => void;
type Box = (px: number, py: number, w: number, h: number, fill: number, line?: number) => void;

interface PedestalStyle {
  readonly family: TowerFamilyId;
  readonly sides: number;
  readonly spin: number;
  readonly outer: number;
  readonly inner: number;
  readonly facet: number;
  readonly top: number;
}

const RAIL_PEDESTAL: PedestalStyle = { family: 'rail', sides: 6, spin: 0, outer: .21, inner: .14, facet: 0x1a5f80, top: 0x0b2a3a };
const SIEGE_PEDESTAL: PedestalStyle = { family: 'siege', sides: 8, spin: Math.PI / 8, outer: .22, inner: .15, facet: 0x7a5a16, top: 0x2a1f08 };

// A translucent bevelled pedestal that stays still while the turret turns. Level 2 lights its seams.
function pedestal(g: Graphics, x: number, y: number, size: number, alpha: number, stage: 1 | 2, style: PedestalStyle): void {
  const color = TOWER_COLORS[style.family];
  const { core } = projectileColors(style.family);
  const { sides, spin, outer, inner } = style;
  const step = Math.PI * 2 / sides;
  const ground = (points: number[], fill: number, fillAlpha: number) => {
    g.poly(points.map((v, i) => (i % 2 === 0 ? x : y) + v * size)).fill({ color: fill, alpha: fillAlpha * alpha });
  };
  const seam = (x1: number, y1: number, x2: number, y2: number) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const quad = (w: number) => {
      const nx = -(y2 - y1) / length * w, ny = (x2 - x1) / length * w;
      return [x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny];
    };
    ground(quad(.014), color, .3);
    ground(quad(.006), core, 1);
  };

  ground(regularPolygon(sides, outer + .01, spin, .03, .05), 0x000000, .5);
  for (let i = 0; i < sides; i++) {
    const a0 = spin + i * step, a1 = a0 + step, mid = a0 + step / 2;
    const lit = Math.cos(mid) * LIGHT_X + Math.sin(mid) * LIGHT_Y;
    ground([Math.cos(a0) * outer, Math.sin(a0) * outer, Math.cos(a1) * outer, Math.sin(a1) * outer,
      Math.cos(a1) * inner, Math.sin(a1) * inner, Math.cos(a0) * inner, Math.sin(a0) * inner],
    tint(style.facet, lit * .5), PEDESTAL_ALPHA);
  }
  ground(regularPolygon(sides, inner, spin), style.top, PEDESTAL_ALPHA);
  if (stage === 2) for (let i = 0; i < sides; i++) {
    const a = spin + i * step;
    seam(Math.cos(a) * inner, Math.sin(a) * inner, Math.cos(a) * outer, Math.sin(a) * outer);
  }
}

// Carronade: a short, fat bronze barrel with a swelled muzzle and a breech knob. Each tube half is
// shaded by how much it faces the light, so the barrel reads as round. Level 2 adds glowing hoops.
function siegeCannon(stage: 1 | 2, recoil: number, angle: number, color: number, plate: Plate, box: Box): void {
  const lightY = (-Math.sin(angle) * LIGHT_X + Math.cos(angle) * LIGHT_Y) / LIGHT_LENGTH;
  const tube = (x0: number, x1: number, w0: number, w1: number) => {
    plate([x0, -w0, x1, -w1, x1, w1, x0, w0], tint(color, -.6), color);
    plate([x0, 0, x1, 0, x1, w1 * .8, x0, w0 * .8], tint(color, -.6 + .2 * lightY));
    plate([x0, 0, x1, 0, x1, -w1 * .8, x0, -w0 * .8], tint(color, -.6 - .2 * lightY));
  };
  const r = recoil * .5;
  plate(regularPolygon(8, .05, Math.PI / 8, -.15 - r, 0), tint(color, -.6), color);
  tube(-.12 - r, .18 - r, .1, .09);
  tube(.18 - r, .26 - r, .12, .12);
  box(.23 - r, -.07, .03, .14, 0x05080d);
  if (stage === 2) {
    box(0 - r, -.11, .02, .22, color);
    box(.1 - r, -.105, .02, .21, color);
  }
}
