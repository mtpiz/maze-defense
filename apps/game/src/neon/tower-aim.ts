import { bearingMilliDegrees, normalizeFacingMilliDegrees } from '@tower-defense/sim';

interface Point {
  readonly x: number;
  readonly y: number;
}

const AIM_DRAG_THRESHOLD_PIXELS = 8;
const AIM_HANDLE_HIT_RADIUS_PIXELS = 26;
const RANGE_ARC_HIT_TOLERANCE_PIXELS = 20;

export function pointerFacingMilliDegrees(origin: Point, pointer: Point): number {
  const bearing = bearingMilliDegrees(pointer.x - origin.x, pointer.y - origin.y);
  return normalizeFacingMilliDegrees(Math.round(bearing / 1_000) * 1_000);
}

export function shouldBeginTowerAim(start: Point, pointer: Point): boolean {
  return Math.hypot(pointer.x - start.x, pointer.y - start.y) >= AIM_DRAG_THRESHOLD_PIXELS;
}

export function isAimHandleHit(pointer: Point, handle: Point): boolean {
  return Math.hypot(pointer.x - handle.x, pointer.y - handle.y) <= AIM_HANDLE_HIT_RADIUS_PIXELS;
}

export function aimHandleDistanceCells(rangeMilliCells: number): number {
  return rangeMilliCells / 1000;
}

export function isRangeArcHit(pointer: Point, origin: Point, radiusPixels: number,
  facingMilliDegrees: number, coverageArcMilliDegrees: number): boolean {
  const distance = Math.hypot(pointer.x - origin.x, pointer.y - origin.y);
  if (Math.abs(distance - radiusPixels) > RANGE_ARC_HIT_TOLERANCE_PIXELS) return false;
  if (coverageArcMilliDegrees >= 360_000) return true;
  const bearing = pointerFacingMilliDegrees(origin, pointer);
  const delta = Math.abs(((bearing - facingMilliDegrees + 540_000) % 360_000) - 180_000);
  return delta <= coverageArcMilliDegrees / 2;
}
