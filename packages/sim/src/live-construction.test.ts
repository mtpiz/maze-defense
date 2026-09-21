import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, BENCHMARK_TOWERS, compileArena } from '@tower-defense/content';
import { createMission, type MissionDefinition } from './index.js';

const definition = (): MissionDefinition => ({
  id: 'live-segment-fixture',
  arena: compileArena({
    schemaVersion: 2,
    id: 'live-segment-arena',
    name: 'Live Segment Arena',
    width: 5,
    height: 3,
    spawn: { x: 0, y: 0 },
    exit: { x: 4, y: 0 },
    waypoints: [],
    inactive: [],
    terrain: [],
  }),
  startingLives: 20,
  openingFieldCredits: 100,
  constructionPolicy: 'live-foundation',
  towerCatalog: {
    foundation: {
      ...BENCHMARK_TOWERS.foundation!,
      weapon: { ...BENCHMARK_TOWERS.foundation!.weapon, rangeMilliCells: 1 },
    },
  },
  creeps: { drone: { ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 15_000 } },
  waves: [{
    id: 'single-runner',
    tacticalPurpose: 'Preserve movement continuity under live construction.',
    groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
  }],
});

describe('live construction movement continuity', () => {
  it('rejects construction on the destination of an in-flight Ground segment atomically', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    session.advance(1);
    const before = session.getRenderSnapshot();
    const hash = session.getDeterminismHash();

    expect(before.creeps[0]).toMatchObject({ fromCell: 0, toCell: 1, progressPermille: 500 });
    expect(session.dispatch({ type: 'place-foundation', cell: 1 })).toMatchObject({
      accepted: false, reason: 'occupied-by-ground-creep', tick: 1,
    });
    expect(session.getRenderSnapshot()).toEqual(before);
    expect(session.getUiSnapshot().fieldCredits).toBe(100);
    expect(session.getDeterminismHash()).toBe(hash);
  });

  it('finishes its current segment even when a new obstacle favors turning back', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'place-foundation', cell: 6 });
    session.dispatch({ type: 'start-wave' });
    session.advance(1);
    const before = session.getRenderSnapshot().creeps[0];

    expect(before).toMatchObject({ fromCell: 0, toCell: 1, progressPermille: 500 });
    expect(session.dispatch({ type: 'place-foundation', cell: 2 }).accepted).toBe(true);
    expect(session.getRenderSnapshot().groundRoute).not.toContain(2);
    expect(session.getRenderSnapshot().creeps[0]).toEqual(before);
    expect(session.getUiSnapshot().tick).toBe(1);

    expect(session.dispatch({ type: 'place-foundation', cell: 9 }).accepted).toBe(true);
    expect(session.getRenderSnapshot().creeps[0]).toEqual(before);
    session.advance(1);
    expect(session.getRenderSnapshot().creeps[0]).toMatchObject({
      fromCell: 1, toCell: 0, progressPermille: 0,
    });
    session.advance(1);
    expect(session.getRenderSnapshot().creeps[0]).toMatchObject({
      fromCell: 1, toCell: 0, progressPermille: 500,
    });
  });

  it('counts an approaching Waypoint only after contact and retains the remaining chain', () => {
    const base = definition();
    const session = createMission({
      ...base,
      arena: compileArena({
        schemaVersion: 2,
        id: 'live-waypoint-arena',
        name: 'Live Waypoint Arena',
        width: 5,
        height: 3,
        spawn: { x: 0, y: 0 },
        exit: { x: 4, y: 0 },
        waypoints: [{ x: 1, y: 0 }, { x: 1, y: 2 }],
        inactive: [],
        terrain: [],
      }),
    });
    session.dispatch({ type: 'start-wave' });
    session.advance(1);

    expect(session.dispatch({ type: 'place-foundation', cell: 7 }).accepted).toBe(true);
    expect(session.createCheckpoint().creeps[0]?.nextWaypointIndex).toBe(0);
    expect(session.getRenderSnapshot().creeps[0]).toMatchObject({
      fromCell: 0, toCell: 1, progressPermille: 500,
    });
    session.advance(1);
    expect(session.createCheckpoint().creeps[0]?.nextWaypointIndex).toBe(1);
    session.advance(4);
    expect(session.createCheckpoint().creeps[0]?.nextWaypointIndex).toBe(2);
    expect(session.getRenderSnapshot().creeps[0]?.fromCell).toBe(11);
  });

  it('leaks at the same tick when construction happens on the final approach to the exit', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    session.advance(7);
    expect(session.getRenderSnapshot().creeps[0]).toMatchObject({
      fromCell: 3, toCell: 4, progressPermille: 500,
    });

    expect(session.dispatch({ type: 'place-foundation', cell: 5 }).accepted).toBe(true);
    expect(session.getUiSnapshot().leakedCreeps).toBe(0);
    session.advance(1);
    expect(session.getUiSnapshot()).toMatchObject({ tick: 8, leakedCreeps: 1, lives: 19, phase: 'victory' });
  });

  it('does not reserve or reroute an Airborne creep segment', () => {
    const base = definition();
    const session = createMission({
      ...base,
      creeps: { glider: { ...BENCHMARK_CREEPS.glider, speedMilliCellsPerSecond: 15_000 } },
      waves: [{ ...base.waves[0]!, groups: [{ creepId: 'glider', count: 1, firstSpawnTick: 0, intervalTicks: 1 }] }],
    });
    session.dispatch({ type: 'start-wave' });
    session.advance(1);
    const before = session.getRenderSnapshot().creeps[0];

    expect(session.dispatch({ type: 'place-foundation', cell: 1 }).accepted).toBe(true);
    expect(session.getRenderSnapshot().creeps[0]).toEqual(before);
  });
});
