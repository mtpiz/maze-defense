import { describe, expect, it } from 'vitest';
import {
  cellIndex,
  compileArena,
  type TowerFamilyId,
} from '@tower-defense/content';
import { createBenchmarkArena } from '@tower-defense/testkit';
import { inspectPlacement, planRoute, type PlacedTower } from './index.js';

const compileTestArena = (overrides: Readonly<Record<string, unknown>> = {}) =>
  compileArena({
    schemaVersion: 2,
    id: 'test-arena',
    name: 'Test Arena',
    width: 5,
    height: 5,
    spawn: { x: 0, y: 2 },
    exit: { x: 4, y: 2 },
    waypoints: [],
    inactive: [],
    terrain: [],
    ...overrides,
  });

describe('ordered dual-layer routing', () => {
  it('routes through every Waypoint in authored order', () => {
    const arena = createBenchmarkArena();
    const route = planRoute(arena, 'ground', []);

    expect(route).not.toBeNull();
    expect(route?.segments.map(({ to }) => to)).toEqual([
      ...arena.waypointCells,
      arena.exitCell,
    ]);
    expect(route?.cells[0]).toBe(arena.spawnCell);
    expect(route?.cells.at(-1)).toBe(arena.exitCell);
  });

  it('does not count a later Waypoint when crossed before it becomes active', () => {
    const arena = compileTestArena({
      height: 3,
      spawn: { x: 0, y: 1 },
      exit: { x: 4, y: 2 },
      waypoints: [
        { x: 4, y: 0 },
        { x: 2, y: 1 },
      ],
    });
    const route = planRoute(arena, 'ground', []);
    const laterWaypoint = arena.waypointCells[1];
    const firstWaypoint = arena.waypointCells[0];

    expect(route).not.toBeNull();
    expect(laterWaypoint).toBeDefined();
    expect(firstWaypoint).toBeDefined();
    if (route === null || laterWaypoint === undefined || firstWaypoint === undefined) return;

    const visits = route.cells
      .map((cell, index) => (cell === laterWaypoint ? index : -1))
      .filter((index) => index >= 0);
    const firstWaypointVisit = route.cells.indexOf(firstWaypoint);

    expect(visits.length).toBeGreaterThanOrEqual(2);
    expect(visits[0]).toBeLessThan(firstWaypointVisit);
    expect(visits.at(-1)).toBeGreaterThan(firstWaypointVisit);
  });

  it.each<TowerFamilyId>(['foundation', 'rail', 'arc', 'siege', 'gravity'])(
    'treats every %s tower as a ground blocker that Airborne routing ignores',
    (familyId) => {
      const arena = compileTestArena();
      const center = cellIndex({ x: 2, y: 2 }, arena.width);
      const tower: PlacedTower = { cell: center, familyId };

      const ground = planRoute(arena, 'ground', [tower]);
      const air = planRoute(arena, 'air', [tower]);

      expect(ground?.cells).not.toContain(center);
      expect(air?.cells).toContain(center);
      expect(ground?.cells).not.toEqual(air?.cells);
    },
  );

  it('rejects placement on Waypoints and placement that seals the route', () => {
    const waypointArena = createBenchmarkArena();
    const waypointCell = waypointArena.waypointCells[0];
    expect(waypointCell).toBeDefined();
    if (waypointCell === undefined) return;

    expect(
      inspectPlacement(waypointArena, [], { cell: waypointCell, familyId: 'foundation' }),
    ).toEqual({ accepted: false, reason: 'reserved-cell' });

    const corridor = compileTestArena({
      width: 3,
      height: 3,
      spawn: { x: 0, y: 1 },
      exit: { x: 2, y: 1 },
      terrain: [{
        id: 'corridor-wall',
        cells: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 0, y: 2 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        buildable: false,
        traversable: { ground: false, air: false },
      }],
    });

    expect(
      inspectPlacement(corridor, [], {
        cell: cellIndex({ x: 1, y: 1 }, corridor.width),
        familyId: 'siege',
      }),
    ).toEqual({ accepted: false, reason: 'blocks-ground-route' });
  });

  it('routes only through active cells on an irregular Arena', () => {
    const inactive = [
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 5, y: 0 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ];
    const arena = compileTestArena({
      width: 6,
      height: 6,
      spawn: { x: 0, y: 1 },
      exit: { x: 5, y: 4 },
      waypoints: [{ x: 1, y: 4 }],
      inactive,
    });
    const inactiveSet = new Set(arena.inactiveCells);

    for (const layer of ['ground', 'air'] as const) {
      const route = planRoute(arena, layer, []);
      expect(route).not.toBeNull();
      expect(route?.cells.some((cell) => inactiveSet.has(cell))).toBe(false);
    }
    expect(
      inspectPlacement(arena, [], {
        cell: cellIndex({ x: 4, y: 1 }, arena.width),
        familyId: 'foundation',
      }),
    ).toEqual({ accepted: false, reason: 'inactive-cell' });
  });

  it('uses independent terrain masks for Ground and Airborne routes', () => {
    const arena = compileTestArena({
      width: 5,
      height: 3,
      spawn: { x: 0, y: 1 },
      exit: { x: 4, y: 1 },
      terrain: [{
        id: 'low-cliff',
        cells: [{ x: 2, y: 1 }],
        buildable: false,
        traversable: { ground: false, air: true },
      }],
    });
    const center = cellIndex({ x: 2, y: 1 }, arena.width);

    expect(planRoute(arena, 'ground', [])?.cells).not.toContain(center);
    expect(planRoute(arena, 'air', [])?.cells).toContain(center);
  });

  it('preserves both route invariants across deterministic generated build sequences', () => {
    const arena = createBenchmarkArena();
    const families: readonly TowerFamilyId[] = [
      'foundation',
      'rail',
      'arc',
      'siege',
      'gravity',
    ];

    for (let seed = 1; seed <= 40; seed += 1) {
      let randomState = seed;
      let towers: readonly PlacedTower[] = [];
      const nextRandom = (): number => {
        randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
        return randomState / 0x100000000;
      };

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const familyId = families[Math.floor(nextRandom() * families.length)];
        if (familyId === undefined) continue;
        const decision = inspectPlacement(arena, towers, {
          cell: Math.floor(nextRandom() * arena.width * arena.height),
          familyId,
        });
        if (!decision.accepted) continue;
        towers = decision.towers;

        for (const route of [decision.routes.ground, decision.routes.air]) {
          expect(route.cells[0]).toBe(arena.spawnCell);
          expect(route.cells.at(-1)).toBe(arena.exitCell);
          expect(route.segments.map(({ to }) => to)).toEqual([
            ...arena.waypointCells,
            arena.exitCell,
          ]);
          const terrainBlockers =
            route.layer === 'ground'
              ? arena.groundBlockedTerrainCells
              : arena.airBlockedTerrainCells;
          expect(route.cells.some((cell) => arena.inactiveCells.includes(cell))).toBe(false);
          expect(route.cells.some((cell) => terrainBlockers.includes(cell))).toBe(false);
          for (let index = 0; index < route.cells.length - 1; index += 1) {
            const from = route.cells[index];
            const to = route.cells[index + 1];
            if (from === undefined || to === undefined) continue;
            const deltaX = Math.abs((from % arena.width) - (to % arena.width));
            const deltaY = Math.abs(
              Math.floor(from / arena.width) - Math.floor(to / arena.width),
            );
            expect(deltaX + deltaY).toBe(1);
          }
        }

        expect(
          decision.routes.ground.cells.some((cell) =>
            towers.some((tower) => tower.cell === cell),
          ),
        ).toBe(false);
        expect(decision.routes.air.cells).toEqual(planRoute(arena, 'air', [])?.cells);
      }
    }
  });
});
