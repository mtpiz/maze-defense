import { describe, expect, it } from 'vitest';
import { coveragePolygon } from './coverage-shape.js';

const radii = (points: readonly number[]) => {
  const values: number[] = [];
  for (let index = 0; index < points.length; index += 2) {
    values.push(Math.hypot(points[index]!, points[index + 1]!));
  }
  return values;
};

describe('coverage sector geometry', () => {
  it('keeps a narrow east-facing Rail sector in front of its tower', () => {
    const points = coveragePolygon(0, 0, 0, 5.25, 0, 30_000);
    expect(points.every((value, index) => index % 2 === 1 || value >= 0)).toBe(true);
    expect(Math.min(...radii(points))).toBe(0);
    expect(Math.max(...radii(points))).toBeCloseTo(5.25);
  });

  it('creates a real inner dead zone for Siege', () => {
    const points = coveragePolygon(0, 0, 1.25, 3.5, 90_000, 90_000);
    const distances = radii(points);
    expect(Math.min(...distances)).toBeCloseTo(1.25);
    expect(Math.max(...distances)).toBeCloseTo(3.5);
  });

  it('rotates Arc coverage into a south-facing hemisphere', () => {
    const points = coveragePolygon(0, 0, 0, 2.25, 90_000, 180_000);
    const yValues = points.filter((_value, index) => index % 2 === 1);
    expect(yValues.every(y => y >= -1e-12)).toBe(true);
  });
});
