import { describe, expect, it } from 'vitest';
import type { Graphics } from 'pixi.js';
import { towerArt } from './neon-art.js';

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

const render = (family: 'foundation' | 'rail' | 'siege' | 'arc', leftRecoil = 0, rightRecoil = 0): GraphicsMock => {
  const graphics = new GraphicsMock();
  towerArt(graphics as unknown as Graphics, family, 0, 0, 0, leftRecoil, rightRecoil);
  return graphics;
};

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

  it('moves only the corresponding rail barrel and preserves the other barrel and chassis', () => {
    const base = polygonPoints(render('rail'));
    const left = polygonPoints(render('rail', 0.24, 0));
    const right = polygonPoints(render('rail', 0, 0.24));

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
