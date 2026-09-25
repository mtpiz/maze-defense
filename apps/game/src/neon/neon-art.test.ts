import { describe, expect, it } from 'vitest';
import type { Graphics } from 'pixi.js';
import { railMuzzle, towerArt, type TowerArtStage } from './neon-art.js';

type GraphicsCall = { name: string; args: unknown[] };

class GraphicsMock {
  readonly calls: GraphicsCall[] = [];

  roundRect(...args: unknown[]) { return this.record('roundRect', args); }
  rect(...args: unknown[]) { return this.record('rect', args); }
  poly(...args: unknown[]) { return this.record('poly', args); }
  fill(...args: unknown[]) { return this.record('fill', args); }
  stroke(...args: unknown[]) { return this.record('stroke', args); }

  private record(name: string, args: unknown[]): this {
    this.calls.push({ name, args });
    return this;
  }
}

const render = (family: 'foundation' | 'rail' | 'siege' | 'arc', leftRecoil = 0, rightRecoil = 0,
  stage: TowerArtStage = 1, angle = 0): GraphicsMock => {
  const graphics = new GraphicsMock();
  towerArt(graphics as unknown as Graphics, family, 0, 0, angle, leftRecoil, rightRecoil, 1, stage);
  return graphics;
};

// The Rail pedestal is its ground shadow, six bevel facets, and the flat top face.
const RAIL_PEDESTAL_POLYS = 8;

const numericArguments = (value: unknown): number[] => {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(numericArguments);
  return [];
};

const polygonPoints = (graphics: GraphicsMock): number[][] => graphics.calls
  .filter(({ name }) => name === 'poly')
  .map(({ args }) => args[0] as number[])
  .filter((points, index, all) => index === 0 || JSON.stringify(points) !== JSON.stringify(all[index - 1]));

const translated = (points: number[], dx: number, dy: number): number[] => points.map((value, index) =>
  value + (index % 2 === 0 ? dx : dy));

const expectTranslation = (actual: number[][], base: number[][], dx: number, dy: number): void => {
  expect(actual).toHaveLength(base.length);
  for (let polygon = 0; polygon < base.length; polygon += 1) {
    const expected = translated(base[polygon]!, dx, dy);
    expect(actual[polygon]).toHaveLength(expected.length);
    for (let point = 0; point < expected.length; point += 1)
      expect(actual[polygon]![point]).toBeCloseTo(expected[point]!, 12);
  }
};

const geometricCalls = (graphics: GraphicsMock): string => JSON.stringify(graphics.calls
  .filter(({ name }) => name === 'roundRect' || name === 'rect' || name === 'poly')
  .map(({ name, args }) => [name, args.flatMap(numericArguments)]));

describe('neon tower art geometry', () => {
  it('keeps the Foundation silhouette quiet enough to recede behind specialists', () => {
    const foundation = render('foundation');
    const strokes = foundation.calls
      .filter(({ name }) => name === 'stroke')
      .map(({ args }) => args[0] as { width?: number; alpha?: number });

    expect(Math.max(...strokes.map(({ width }) => width ?? 0))).toBeLessThanOrEqual(.06);
    expect(strokes.filter(({ alpha }) => (alpha ?? 1) >= .9)).toHaveLength(0);
  });

  it('keeps the Rail pedestal still while the turret turns', () => {
    const facingRight = polygonPoints(render('rail', 0, 0, 1, 0));
    const facingDown = polygonPoints(render('rail', 0, 0, 1, Math.PI / 2));

    expect(facingDown.slice(0, RAIL_PEDESTAL_POLYS)).toEqual(facingRight.slice(0, RAIL_PEDESTAL_POLYS));
    expect(facingDown.slice(RAIL_PEDESTAL_POLYS)).not.toEqual(facingRight.slice(RAIL_PEDESTAL_POLYS));
  });

  it('recoils the single Rail barrel by the stronger kick and leaves the pedestal and cap in place', () => {
    const base = polygonPoints(render('rail'));
    const kicked = polygonPoints(render('rail', 0.1, 0.24));
    const cap = RAIL_PEDESTAL_POLYS;

    expect(kicked.slice(0, cap + 1)).toEqual(base.slice(0, cap + 1));
    expectTranslation(kicked.slice(cap + 1, cap + 3), base.slice(cap + 1, cap + 3), -.192, 0);
    expect(kicked.slice(cap + 3)).toEqual(base.slice(cap + 3));
  });

  it('draws Rail Level 2 as Level 1 plus lit pedestal seams and guide rails', () => {
    const level1 = polygonPoints(render('rail'));
    const level2 = polygonPoints(render('rail', 0, 0, 2));
    const seams = 6 * 2;

    expect(level2.slice(0, RAIL_PEDESTAL_POLYS)).toEqual(level1.slice(0, RAIL_PEDESTAL_POLYS));
    expect(level2.slice(RAIL_PEDESTAL_POLYS + seams, RAIL_PEDESTAL_POLYS + seams + 4))
      .toEqual(level1.slice(RAIL_PEDESTAL_POLYS));
    expect(level2).toHaveLength(level1.length + seams + 2);
  });

  it('starts Rail fire at the muzzle of the drawn barrel', () => {
    expect(railMuzzle(1, 0, 0)).toEqual({ forward: .32 * .8, side: 0 });
    expect(railMuzzle(1, 1, .17).forward).toBeCloseTo((.32 - .17) * .8, 12);
    expect(railMuzzle('rapid-fire', 0, 0)).toEqual({ forward: .49 * .8, side: -.15 * .8 });
    expect(railMuzzle('rapid-fire', 1, 0).side).toBeCloseTo(.15 * .8, 12);
  });

  it('moves only the corresponding rapid-fire barrel and preserves the other barrel and chassis', () => {
    const base = polygonPoints(render('rail', 0, 0, 'rapid-fire'));
    const left = polygonPoints(render('rail', 0.24, 0, 'rapid-fire'));
    const right = polygonPoints(render('rail', 0, 0.24, 'rapid-fire'));

    expect(left.slice(0, 2)).toEqual(base.slice(0, 2));
    expect(left.slice(6, 11)).toEqual(base.slice(6, 11));
    expectTranslation(left.slice(2, 6), base.slice(2, 6), -.192, 0);

    expect(right.slice(0, 6)).toEqual(base.slice(0, 6));
    expect(right.slice(10)).toEqual(base.slice(10));
    expectTranslation(right.slice(6, 10), base.slice(6, 10), -.192, 0);
  });

  it('draws distinct finite rail, siege, and arc silhouettes', () => {
    const graphics = (['rail', 'siege', 'arc'] as const).map((family) => render(family));

    expect(new Set(graphics.map(geometricCalls)).size).toBe(3);
    for (const graphic of graphics) {
      const coordinates = graphic.calls
        .filter(({ name }) => name === 'roundRect' || name === 'rect' || name === 'poly')
        .flatMap(({ args }) => args.flatMap(numericArguments));
      expect(coordinates.every(Number.isFinite)).toBe(true);
    }
  });

  it('keeps specialist silhouettes inside a compact cell footprint', () => {
    for (const family of ['rail', 'siege', 'arc'] as const) {
      const coordinates = polygonPoints(render(family)).flat();
      expect(Math.max(...coordinates.map(Math.abs))).toBeLessThanOrEqual(.4);
    }
  });

  it('keeps Rail outlines fine and its barrels stark against the board black', () => {
    const rail = render('rail');
    const widths = rail.calls
      .filter(({ name }) => name === 'stroke')
      .map(({ args }) => (args[0] as { width?: number }).width)
      .filter((width): width is number => width !== undefined);
    const fills = rail.calls
      .filter(({ name }) => name === 'fill')
      .map(({ args }) => args[0])
      .flatMap(value => typeof value === 'number' ? [value]
        : typeof value === 'object' && value !== null && 'color' in value ? [Number(value.color)] : []);

    expect(Math.max(...widths)).toBeLessThanOrEqual(.14);
    expect(fills).toContain(0x05080d);
  });
});
