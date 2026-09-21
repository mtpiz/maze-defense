import { describe, expect, it } from 'vitest';
import { aimHandleDistanceCells, isAimHandleHit, isRangeArcHit,
  pointerFacingMilliDegrees, shouldBeginTowerAim } from './tower-aim.js';

describe('tower aim gesture', () => {
  it('quantizes board-space pointer bearings to whole degrees', () => {
    expect(pointerFacingMilliDegrees({ x: 10, y: 10 }, { x: 20, y: 10 })).toBe(0);
    expect(pointerFacingMilliDegrees({ x: 10, y: 10 }, { x: 10, y: 20 })).toBe(90_000);
    expect(pointerFacingMilliDegrees({ x: 10, y: 10 }, { x: 0, y: 10 })).toBe(180_000);
    expect(pointerFacingMilliDegrees({ x: 10, y: 10 }, { x: 10, y: 0 })).toBe(270_000);
  });

  it('requires deliberate movement before taking a drag away from board pan', () => {
    expect(shouldBeginTowerAim({ x: 10, y: 10 }, { x: 17, y: 10 })).toBe(false);
    expect(shouldBeginTowerAim({ x: 10, y: 10 }, { x: 18, y: 10 })).toBe(true);
  });

  it('starts rotation only from the visible range handle hit target', () => {
    expect(isAimHandleHit({ x: 104, y: 96 }, { x: 100, y: 100 })).toBe(true);
    expect(isAimHandleHit({ x: 126, y: 100 }, { x: 100, y: 100 })).toBe(true);
    expect(isAimHandleHit({ x: 127, y: 100 }, { x: 100, y: 100 })).toBe(false);
  });

  it('places the rotation handle at the weapon range boundary', () => {
    expect(aimHandleDistanceCells(2_500)).toBe(2.5);
    expect(aimHandleDistanceCells(3_500)).toBe(3.5);
  });

  it('lets the visible outer coverage arc start rotation', () => {
    const origin = { x: 100, y: 100 };
    expect(isRangeArcHit({ x: 200, y: 100 }, origin, 100, 0, 90_000)).toBe(true);
    expect(isRangeArcHit({ x: 100, y: 200 }, origin, 100, 0, 90_000)).toBe(false);
    expect(isRangeArcHit({ x: 170, y: 100 }, origin, 100, 0, 90_000)).toBe(false);
  });
});
