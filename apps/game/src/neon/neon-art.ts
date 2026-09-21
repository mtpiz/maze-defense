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

export function towerArt(g: Graphics, family: TowerFamilyId, x: number, y: number,
  angle = -Math.PI / 2, leftRecoil = 0, rightRecoil = 0, alpha = 1): void {
  const size = .8;
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
  } else if (family === 'siege') {
    plate([-.36,-.28,-.08,-.38,.29,-.29,.36,0,.29,.29,-.08,.38,-.36,.28], 0x41391b, color);
    for (const side of [-1, 1]) {
      box(-.3, side < 0 ? -.37 : .23, .38, .14, color);
      box(-.23, side < 0 ? -.34 : .26, .09, .07, core);
    }
    const r = Math.max(leftRecoil, rightRecoil) * .45;
    plate([-.22-r,-.21,.22-r,-.21,.39-r,-.13,.39-r,.13,.22-r,.21,-.22-r,.21], 0x322a22, color);
    box(-.13-r, -.15, .29, .3, 0xb67830);
    box(.15-r, -.17, .14, .34, color);
    box(.25-r, -.1, .1, .2, 0x1b161b);
    box(.31-r, -.065, .04, .13, core);
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
