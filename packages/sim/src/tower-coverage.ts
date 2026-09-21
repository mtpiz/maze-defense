import type { WeaponDefinition } from '@tower-defense/content';

const FULL_CIRCLE_MILLI_DEGREES = 360_000;

export function normalizeFacingMilliDegrees(facingMilliDegrees: number): number {
  return ((Math.round(facingMilliDegrees) % FULL_CIRCLE_MILLI_DEGREES) + FULL_CIRCLE_MILLI_DEGREES)
    % FULL_CIRCLE_MILLI_DEGREES;
}

export function bearingMilliDegrees(deltaX: number, deltaY: number): number {
  if (deltaX === 0 && deltaY === 0) return 0;
  return normalizeFacingMilliDegrees(Math.atan2(deltaY, deltaX) * 180_000 / Math.PI);
}

export function isPointInWeaponCoverage(
  weapon: WeaponDefinition,
  facingMilliDegrees: number,
  deltaX: number,
  deltaY: number,
): boolean {
  const distanceSquared = deltaX * deltaX + deltaY * deltaY;
  const minimumRange = weapon.minimumRangeMilliCells ?? 0;
  if (
    distanceSquared < minimumRange * minimumRange ||
    distanceSquared > weapon.rangeMilliCells * weapon.rangeMilliCells
  ) {
    return false;
  }

  const coverageArc = weapon.coverageArcMilliDegrees ?? FULL_CIRCLE_MILLI_DEGREES;
  if (coverageArc >= FULL_CIRCLE_MILLI_DEGREES) return true;
  const bearing = bearingMilliDegrees(deltaX, deltaY);
  const rawDelta = Math.abs(bearing - normalizeFacingMilliDegrees(facingMilliDegrees));
  const angularDelta = Math.min(rawDelta, FULL_CIRCLE_MILLI_DEGREES - rawDelta);
  return angularDelta <= coverageArc / 2;
}
