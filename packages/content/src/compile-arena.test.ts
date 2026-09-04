import { describe, expect, it } from 'vitest';
import { BENCHMARK_ARENA_SOURCE } from '@tower-defense/testkit';
import { compileArena, ContentValidationError } from './index.js';

describe('compileArena', () => {
  it('compiles the versioned Benchmark Arena into immutable cell indices', () => {
    const arena = compileArena(BENCHMARK_ARENA_SOURCE);

    expect(arena.schemaVersion).toBe(2);
    expect(arena.id).toBe('world-01-benchmark');
    expect(arena.width).toBe(9);
    expect(arena.height).toBe(14);
    expect(arena.spawnCell).toBe(18);
    expect(arena.exitCell).toBe(107);
    expect(arena.waypointCells).toEqual([34, 91]);
    expect(arena.inactiveCells).toEqual([]);
    expect(arena.unbuildableCells).toHaveLength(8);
    expect(arena.groundBlockedTerrainCells).toEqual(arena.unbuildableCells);
    expect(arena.airBlockedTerrainCells).toEqual(arena.unbuildableCells);
    expect(arena.contentHash).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.isFrozen(arena)).toBe(true);
  });

  it('rejects overlapping reserved cells with actionable paths', () => {
    const invalid = {
      ...BENCHMARK_ARENA_SOURCE,
      waypoints: [BENCHMARK_ARENA_SOURCE.spawn],
    };

    expect(() => compileArena(invalid)).toThrowError(ContentValidationError);
    expect(() => compileArena(invalid)).toThrow('waypoints[0]: overlaps spawn');
  });

  it('hashes equivalent terrain-cell ordering identically', () => {
    const forward = compileArena(BENCHMARK_ARENA_SOURCE);
    const reversed = compileArena({
      ...BENCHMARK_ARENA_SOURCE,
      terrain: BENCHMARK_ARENA_SOURCE.terrain.map((region) => ({
        ...region,
        cells: [...region.cells].reverse(),
      })),
    });

    expect(reversed.terrainCells).toEqual(forward.terrainCells);
    expect(reversed.contentHash).toBe(forward.contentHash);
  });

  it('compiles inactive geometry and independent traversal masks', () => {
    const arena = compileArena({
      schemaVersion: 2,
      id: 'mask-fixture',
      name: 'Mask Fixture',
      width: 5,
      height: 4,
      spawn: { x: 0, y: 1 },
      exit: { x: 4, y: 1 },
      waypoints: [],
      inactive: [{ x: 4, y: 3 }],
      terrain: [
        {
          id: 'low-cliff',
          cells: [{ x: 2, y: 1 }],
          buildable: false,
          traversable: { ground: false, air: true },
        },
        {
          id: 'storm-column',
          cells: [{ x: 3, y: 0 }],
          buildable: false,
          traversable: { ground: true, air: false },
        },
      ],
    });

    expect(arena.inactiveCells).toEqual([19]);
    expect(arena.unbuildableCells).toEqual([3, 7]);
    expect(arena.groundBlockedTerrainCells).toEqual([7]);
    expect(arena.airBlockedTerrainCells).toEqual([3]);
    expect(arena.terrainCells.map(({ terrainId, cell }) => [terrainId, cell])).toEqual([
      ['storm-column', 3],
      ['low-cliff', 7],
    ]);
  });

  it('rejects inactive anchors and buildable cells that block a traversal layer', () => {
    expect(() =>
      compileArena({
        ...BENCHMARK_ARENA_SOURCE,
        inactive: [BENCHMARK_ARENA_SOURCE.spawn],
      }),
    ).toThrow('inactive[0]: overlaps spawn');

    expect(() =>
      compileArena({
        ...BENCHMARK_ARENA_SOURCE,
        terrain: [
          {
            id: 'invalid-platform',
            cells: [{ x: 2, y: 2 }],
            buildable: true,
            traversable: { ground: false, air: true },
          },
        ],
      }),
    ).toThrow('terrain[0].buildable: requires both traversal layers');
  });
});
