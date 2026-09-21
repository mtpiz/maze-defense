import { describe, expect, it } from 'vitest';
import type { WeaponDefinition } from '@tower-defense/content';
import {
  bearingMilliDegrees,
  isPointInWeaponCoverage,
  normalizeFacingMilliDegrees,
} from './tower-coverage.js';

const weapon = (
  rangeMilliCells: number,
  coverageArcMilliDegrees?: number,
  minimumRangeMilliCells?: number,
): WeaponDefinition => ({
  mechanicId: 'direct',
  damage: 1,
  armorPiercing: 0,
  rangeMilliCells,
  ...(minimumRangeMilliCells === undefined ? {} : { minimumRangeMilliCells }),
  ...(coverageArcMilliDegrees === undefined ? {} : { coverageArcMilliDegrees }),
  cooldownTicks: 30,
  targets: { ground: true, air: false },
  targeting: 'first',
});

describe('directional tower coverage', () => {
  it('normalizes facing and derives board-space cardinal bearings', () => {
    expect(normalizeFacingMilliDegrees(-1_000)).toBe(359_000);
    expect(normalizeFacingMilliDegrees(360_000)).toBe(0);
    expect(bearingMilliDegrees(1_000, 0)).toBe(0);
    expect(bearingMilliDegrees(0, 1_000)).toBe(90_000);
    expect(bearingMilliDegrees(-1_000, 0)).toBe(180_000);
    expect(bearingMilliDegrees(0, -1_000)).toBe(270_000);
  });

  it('defaults omitted coverage geometry to a full circle with no dead zone', () => {
    const direct = weapon(2_000);
    expect(isPointInWeaponCoverage(direct, 0, 0, -2_000)).toBe(true);
    expect(isPointInWeaponCoverage(direct, 180_000, 2_000, 0)).toBe(true);
    expect(isPointInWeaponCoverage(direct, 0, 2_001, 0)).toBe(false);
  });

  it('includes exact sector boundaries and handles north wraparound', () => {
    const rail = weapon(6_000, 30_000);
    expect(isPointInWeaponCoverage(rail, 355_000, 5_000, 0)).toBe(true);
    expect(isPointInWeaponCoverage(rail, 0, 5_000, 0)).toBe(true);
    expect(isPointInWeaponCoverage(rail, 45_000, 5_000, 0)).toBe(false);
  });

  it('enforces Siege minimum and maximum range inclusively', () => {
    const siege = weapon(3_500, 90_000, 1_250);
    expect(isPointInWeaponCoverage(siege, 0, 1_249, 0)).toBe(false);
    expect(isPointInWeaponCoverage(siege, 0, 1_250, 0)).toBe(true);
    expect(isPointInWeaponCoverage(siege, 0, 3_500, 0)).toBe(true);
    expect(isPointInWeaponCoverage(siege, 0, 3_501, 0)).toBe(false);
  });

  it('gives Arc a forward hemisphere including its side boundaries', () => {
    const arc = weapon(2_250, 180_000);
    expect(isPointInWeaponCoverage(arc, 0, 2_000, 0)).toBe(true);
    expect(isPointInWeaponCoverage(arc, 0, 0, 2_000)).toBe(true);
    expect(isPointInWeaponCoverage(arc, 0, 0, -2_000)).toBe(true);
    expect(isPointInWeaponCoverage(arc, 0, -2_000, 0)).toBe(false);
  });
});
