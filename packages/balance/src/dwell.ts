import type { CompiledArena, MovementLayer, WeaponDefinition } from '@tower-defense/content';
import { isPointInWeaponCoverage, planRoute, type PlacedTower } from '@tower-defense/sim';

const MILLI = 1_000;
const TICKS_PER_SECOND = 30;
const SAMPLE_STEP_MILLI = 50;

export interface TowerDwell {
  readonly cell: number;
  /** Route length (milli-cells) inside this tower's coverage. */
  readonly coveredMilliCells: number;
  /** Separate times the route enters coverage. 2-3 means the maze wraps back past this tower. */
  readonly passes: number;
  /** Ticks a creep at the given speed spends inside coverage. */
  readonly dwellTicks: number;
  /** Shots this tower gets at one creep walking alone (ignores construction and targeting). */
  readonly shotsPerCreep: number;
}

export interface RouteDwell {
  readonly layer: MovementLayer;
  readonly routeMilliCells: number;
  readonly towers: readonly TowerDwell[];
}

const cellPoint = (arena: CompiledArena, cell: number) => ({
  x: (cell % arena.width) * MILLI,
  y: Math.floor(cell / arena.width) * MILLI,
});

/**
 * Measures how much of the actual planned route each armed tower covers.
 * Maze length and wrap-backs fall out of the route itself, so no maze multiplier is assumed.
 */
export const measureRouteDwell = (
  arena: CompiledArena,
  layer: MovementLayer,
  placed: readonly PlacedTower[],
  armed: readonly { readonly cell: number; readonly weapon: WeaponDefinition; readonly facingMilliDegrees?: number }[],
  speedMilliCellsPerSecond: number,
): RouteDwell => {
  const route = planRoute(arena, layer, placed);
  if (route === null) throw new Error(`No ${layer} route exists for this layout`);

  const samples: { x: number; y: number }[] = [];
  for (let index = 0; index < route.cells.length - 1; index += 1) {
    const from = cellPoint(arena, route.cells[index]!);
    const to = cellPoint(arena, route.cells[index + 1]!);
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.round(length / SAMPLE_STEP_MILLI));
    for (let step = 0; step < steps; step += 1) {
      samples.push({
        x: from.x + ((to.x - from.x) * step) / steps,
        y: from.y + ((to.y - from.y) * step) / steps,
      });
    }
  }
  const last = route.cells[route.cells.length - 1];
  if (last !== undefined) samples.push(cellPoint(arena, last));

  const stepLength =
    samples.length > 1 ? (route.cells.length - 1) * MILLI / (samples.length - 1) : 0;

  const towers = armed.map(({ cell, weapon, facingMilliDegrees = 0 }) => {
    if (!weapon.targets[layer]) {
      return Object.freeze({ cell, coveredMilliCells: 0, passes: 0, dwellTicks: 0, shotsPerCreep: 0 });
    }
    const origin = cellPoint(arena, cell);
    let covered = 0;
    let passes = 0;
    let inside = false;
    for (const sample of samples) {
      const hit = isPointInWeaponCoverage(weapon, facingMilliDegrees, sample.x - origin.x, sample.y - origin.y);
      if (hit) covered += stepLength;
      if (hit && !inside) passes += 1;
      inside = hit;
    }
    const dwellTicks = (covered / speedMilliCellsPerSecond) * TICKS_PER_SECOND;
    return Object.freeze({
      cell,
      coveredMilliCells: Math.round(covered),
      passes,
      dwellTicks: Math.round(dwellTicks),
      shotsPerCreep: Math.round((dwellTicks / weapon.cooldownTicks) * 100) / 100,
    });
  });

  return Object.freeze({
    layer,
    routeMilliCells: Math.round((route.cells.length - 1) * MILLI),
    towers: Object.freeze(towers),
  });
};
