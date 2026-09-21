import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_CREEPS,
  BENCHMARK_TOWERS,
  cellIndex,
  compileArena,
} from '@tower-defense/content';
import { createBenchmarkArena } from '@tower-defense/testkit';
import {
  SIMULATION_TICKS_PER_SECOND,
  createMission,
  type MissionDefinition,
  type MissionSession,
} from './index.js';

const TEST_TOWER_CATALOG = {
  foundation: {
    ...BENCHMARK_TOWERS.foundation,
    familyId: 'foundation',
    fieldCreditCost: 10,
    constructionDelayTicks: 0,
    weapon: {
      ...BENCHMARK_TOWERS.foundation?.weapon,
      mechanicId: 'direct',
      damage: 1,
      armorPiercing: 0,
      rangeMilliCells: 1,
      cooldownTicks: 30,
      targets: { ground: true, air: false },
      targeting: 'first',
    },
  },
} as const;

const createDefinition = (): MissionDefinition => ({
  id: 'benchmark-mission',
  arena: createBenchmarkArena(),
  startingLives: 20,
  openingFieldCredits: 100,
  constructionPolicy: 'live-foundation',
  towerCatalog: TEST_TOWER_CATALOG,
  creeps: {
    drone: { ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 30_000 },
  },
  waves: [
    {
      id: 'routing-pressure',
      tacticalPurpose: 'Exercise the first Ground Route.',
      groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
    },
    {
      id: 'routing-repeat',
      tacticalPurpose: 'Exercise the next planning interval.',
      groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
    },
  ],
});

const placeOpening = (session: MissionSession): void => {
  const arena = createDefinition().arena;
  session.dispatch({
    type: 'place-foundation',
    cell: cellIndex({ x: 2, y: 2 }, arena.width),
  });
  session.dispatch({
    type: 'place-foundation',
    cell: cellIndex({ x: 3, y: 2 }, arena.width),
  });
};

describe('deterministic Mission Session', () => {
  it('spawns a Ground creep, advances it along its route, and defeats the player on a fatal leak', () => {
    const session = createMission({
      id: 'fatal-leak-fixture',
      arena: compileArena({
        schemaVersion: 2,
        id: 'fatal-leak-arena',
        name: 'Fatal Leak Arena',
        width: 5,
        height: 2,
        spawn: { x: 0, y: 0 },
        exit: { x: 4, y: 0 },
        waypoints: [],
        inactive: [],
        terrain: [],
      }),
      startingLives: 1,
      openingFieldCredits: 0,
      constructionPolicy: 'live-foundation',
      towerCatalog: TEST_TOWER_CATALOG,
      creeps: {
        drone: {
          id: 'drone',
          displayName: 'Drone',
          layer: 'ground',
          mass: 1,
          mechanicId: 'baseline-runner',
          maxHealth: 10,
          armor: 0,
          speedMilliCellsPerSecond: 30_000,
          lifeDamage: 1,
          fieldCreditBounty: 0,
        },
      },
      waves: [
        {
          id: 'single-drone',
          tacticalPurpose: 'Prove the complete leak path.',
          groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
        },
      ],
    });

    expect(session.dispatch({ type: 'start-wave' }).accepted).toBe(true);
    expect(session.advance(1).advancedTicks).toBe(1);
    expect(session.getRenderSnapshot().creeps).toMatchObject([
      { id: 'creep-1', creepId: 'drone', layer: 'ground', health: 10 },
    ]);

    expect(session.advance(3)).toMatchObject({ advancedTicks: 3, phase: 'defeat' });
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'defeat', lives: 0 });
    expect(session.drainPresentationEvents().map(({ type }) => type)).toEqual([
      'wave-started',
      'creep-spawned',
      'creep-leaked',
      'mission-defeated',
    ]);
  });

  it('reroutes an active Ground creep immediately after live Foundation construction', () => {
    const arena = compileArena({
      schemaVersion: 2,
      id: 'live-reroute-arena',
      name: 'Live Reroute Arena',
      width: 5,
      height: 2,
      spawn: { x: 0, y: 0 },
      exit: { x: 4, y: 0 },
      waypoints: [],
      inactive: [],
      terrain: [],
    });
    const session = createMission({
      id: 'live-reroute-fixture',
      arena,
      startingLives: 2,
      openingFieldCredits: 10,
      constructionPolicy: 'live-foundation',
      towerCatalog: TEST_TOWER_CATALOG,
      creeps: {
        drone: { ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 30_000 },
      },
      waves: [
        {
          id: 'single-drone',
          tacticalPurpose: 'Prove live rerouting for an active Ground creep.',
          groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
        },
      ],
    });

    session.dispatch({ type: 'start-wave' });
    session.advance(1);
    const blockedCell = cellIndex({ x: 2, y: 0 }, arena.width);
    expect(session.getRenderSnapshot().creeps[0]).toMatchObject({
      fromCell: cellIndex({ x: 1, y: 0 }, arena.width),
      toCell: blockedCell,
    });

    expect(session.dispatch({ type: 'place-foundation', cell: blockedCell }).accepted).toBe(true);
    const rerouted = session.getRenderSnapshot();
    expect(rerouted.groundRoute).not.toContain(blockedCell);
    expect(rerouted.creeps[0]?.fromCell).toBe(cellIndex({ x: 1, y: 0 }, arena.width));
    expect(rerouted.creeps[0]?.toCell).not.toBe(blockedCell);
  });

  it('rejects live Foundation construction on a cell occupied by an active creep', () => {
    const arena = compileArena({
      schemaVersion: 2,
      id: 'occupied-creep-arena',
      name: 'Occupied Creep Arena',
      width: 5,
      height: 2,
      spawn: { x: 0, y: 0 },
      exit: { x: 4, y: 0 },
      waypoints: [],
      inactive: [],
      terrain: [],
    });
    const session = createMission({
      id: 'occupied-creep-fixture',
      arena,
      startingLives: 2,
      openingFieldCredits: 10,
      constructionPolicy: 'live-foundation',
      towerCatalog: TEST_TOWER_CATALOG,
      creeps: {
        drone: { ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 30_000 },
      },
      waves: [
        {
          id: 'single-drone',
          tacticalPurpose: 'Prove construction occupancy rules.',
          groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
        },
      ],
    });

    session.dispatch({ type: 'start-wave' });
    session.advance(1);
    const occupiedCell = cellIndex({ x: 1, y: 0 }, arena.width);

    expect(session.dispatch({ type: 'place-foundation', cell: occupiedCell })).toEqual({
      accepted: false,
      tick: 1,
      reason: 'occupied-by-ground-creep',
    });
    expect(session.getRenderSnapshot().towers).toEqual([]);
    expect(session.getUiSnapshot().fieldCredits).toBe(10);
  });

  it('lets an operational Foundation kill an eligible Ground creep and award its bounty', () => {
    const arena = compileArena({
      schemaVersion: 2,
      id: 'foundation-fire-arena',
      name: 'Foundation Fire Arena',
      width: 5,
      height: 2,
      spawn: { x: 0, y: 0 },
      exit: { x: 4, y: 0 },
      waypoints: [],
      inactive: [],
      terrain: [],
    });
    const session = createMission({
      id: 'foundation-fire-fixture',
      arena,
      startingLives: 1,
      openingFieldCredits: 10,
      constructionPolicy: 'live-foundation',
      towerCatalog: {
        foundation: {
          familyId: 'foundation',
          fieldCreditCost: 10,
          constructionDelayTicks: 0,
          weapon: {
            mechanicId: 'direct',
            damage: 10,
            armorPiercing: 0,
            rangeMilliCells: 1_500,
            cooldownTicks: 30,
            targets: { ground: true, air: false },
            targeting: 'first',
          },
        },
      },
      creeps: {
        drone: {
          ...BENCHMARK_CREEPS.drone,
          maxHealth: 10,
          speedMilliCellsPerSecond: 30_000,
          fieldCreditBounty: 3,
        },
      },
      waves: [
        {
          id: 'single-drone',
          tacticalPurpose: 'Prove direct Foundation damage and bounty resolution.',
          groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
        },
      ],
    });

    expect(
      session.dispatch({
        type: 'place-foundation',
        cell: cellIndex({ x: 2, y: 1 }, arena.width),
      }).accepted,
    ).toBe(true);
    session.drainPresentationEvents();
    session.dispatch({ type: 'start-wave' });

    expect(session.advance(1)).toMatchObject({ advancedTicks: 1, phase: 'victory' });
    expect(session.getUiSnapshot()).toMatchObject({ lives: 1, fieldCredits: 3 });
    expect(session.getRenderSnapshot().creeps).toEqual([]);
    expect(session.drainPresentationEvents().map(({ type }) => type)).toEqual([
      'wave-started',
      'creep-spawned',
      'tower-fired',
      'creep-damaged',
      'creep-died',
      'wave-completed',
      'mission-completed',
    ]);
  });

  it('lets a live-installed Rail penetrate staggered creeps in one firing lane', () => {
    const arena = compileArena({
      schemaVersion: 2,
      id: 'rail-lane-arena',
      name: 'Rail Lane Arena',
      width: 8,
      height: 4,
      spawn: { x: 0, y: 2 },
      exit: { x: 7, y: 2 },
      waypoints: [],
      inactive: [],
      terrain: [],
    });
    const session = createMission({
      id: 'rail-lane-fixture',
      arena,
      startingLives: 3,
      openingFieldCredits: 30,
      constructionPolicy: 'live-foundation',
      towerCatalog: {
        foundation: TEST_TOWER_CATALOG.foundation,
        rail: {
          familyId: 'rail',
          fieldCreditCost: 20,
          constructionDelayTicks: 0,
          weapon: {
            mechanicId: 'rail-line',
            damage: 10,
            armorPiercing: 0,
            rangeMilliCells: 8_000,
            cooldownTicks: 30,
            targets: { ground: true, air: true },
            targeting: 'first',
            beamHalfWidthMilliCells: 1_500,
            maxTargets: 5,
          },
        },
      },
      creeps: {
        drone: {
          ...BENCHMARK_CREEPS.drone,
          maxHealth: 10,
          speedMilliCellsPerSecond: 30_000,
          fieldCreditBounty: 1,
        },
      },
      waves: [
        {
          id: 'staggered-lane',
          tacticalPurpose: 'Prove that Rail rewards straight-lane geometry.',
          groups: [{ creepId: 'drone', count: 3, firstSpawnTick: 0, intervalTicks: 1 }],
        },
      ],
    } as MissionDefinition);

    session.dispatch({
      type: 'place-foundation',
      cell: cellIndex({ x: 7, y: 0 }, arena.width),
    });
    session.dispatch({ type: 'start-wave' });
    session.advance(3);
    expect(
      session.dispatch({ type: 'install-specialist', towerId: 'tower-1', familyId: 'rail' }),
    ).toMatchObject({ accepted: true });
    session.drainPresentationEvents();

    expect(session.advance(1)).toMatchObject({ phase: 'victory' });
    const events = session.drainPresentationEvents();
    expect(events.find(({ type }) => type === 'tower-fired')?.payload).toMatchObject({
      mechanicId: 'rail-line',
      hitCount: 3,
    });
    expect(events.filter(({ type }) => type === 'creep-died')).toHaveLength(3);
    expect(session.getUiSnapshot()).toMatchObject({ lives: 3, fieldCredits: 3 });
  });

  it('resolves a telegraphed Siege impact against a Ground cluster but not Airborne overlap', () => {
    const arena = compileArena({
      schemaVersion: 2,
      id: 'siege-cluster-arena',
      name: 'Siege Cluster Arena',
      width: 6,
      height: 3,
      spawn: { x: 0, y: 0 },
      exit: { x: 5, y: 0 },
      waypoints: [],
      inactive: [],
      terrain: [],
    });
    const session = createMission({
      id: 'siege-cluster-fixture',
      arena,
      startingLives: 10,
      openingFieldCredits: 50,
      constructionPolicy: 'live-foundation',
      towerCatalog: {
        foundation: TEST_TOWER_CATALOG.foundation,
        siege: {
          familyId: 'siege',
          fieldCreditCost: 40,
          constructionDelayTicks: 4,
          weapon: {
            mechanicId: 'siege-blast',
            damage: 10,
            armorPiercing: 0,
            rangeMilliCells: 5_000,
            cooldownTicks: 90,
            targets: { ground: true, air: false },
            targeting: 'first',
            impactDelayTicks: 2,
            // Cover two ticks of forward travel plus the cluster's actual lateral spread.
            blastRadiusMilliCells: 1_200,
          },
        },
      },
      creeps: {
        broodling: {
          ...BENCHMARK_CREEPS.broodling,
          maxHealth: 10,
          speedMilliCellsPerSecond: 15_000,
          fieldCreditBounty: 1,
        },
        glider: {
          ...BENCHMARK_CREEPS.glider,
          maxHealth: 10,
          speedMilliCellsPerSecond: 15_000,
          fieldCreditBounty: 1,
        },
      },
      waves: [
        {
          id: 'overlapping-cluster',
          tacticalPurpose: 'Prove delayed Ground area damage and layer eligibility.',
          groups: [
            { creepId: 'broodling', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
            { creepId: 'broodling', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
            { creepId: 'broodling', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
            { creepId: 'glider', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
          ],
        },
      ],
    } as MissionDefinition);

    session.dispatch({
      type: 'place-foundation',
      cell: cellIndex({ x: 2, y: 2 }, arena.width),
    });
    session.dispatch({ type: 'install-specialist', towerId: 'tower-1', familyId: 'siege' });
    session.drainPresentationEvents();
    session.dispatch({ type: 'start-wave' });

    session.advance(4);
    expect(session.getRenderSnapshot().creeps.map(({ health }) => health)).toEqual([10, 10, 10, 10]);
    expect(session.getRenderSnapshot().impacts).toHaveLength(1);
    expect(
      session.drainPresentationEvents().find(({ type }) => type === 'impact-anticipated')?.payload,
    ).toMatchObject({ mechanicId: 'siege-blast', impactTick: 6 });

    session.advance(2);
    const render = session.getRenderSnapshot();
    expect(render.impacts).toEqual([]);
    expect(render.creeps).toMatchObject([{ creepId: 'glider', health: 10 }]);
    const impactEvents = session.drainPresentationEvents();
    expect(impactEvents.find(({ type }) => type === 'weapon-impact')?.payload).toMatchObject({
      mechanicId: 'siege-blast',
      hitCount: 3,
    });
    expect(impactEvents.filter(({ type }) => type === 'creep-died')).toHaveLength(3);
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'wave', fieldCredits: 3 });
  });

  it('replays the same Commands and fixed ticks to the same hash', () => {
    const left = createMission(createDefinition(), 42);
    const right = createMission(createDefinition(), 42);

    for (const session of [left, right]) {
      placeOpening(session);
      session.dispatch({ type: 'set-speed', speed: 3 });
      session.dispatch({ type: 'start-wave' });
      session.advance(20);
      session.advance(40);
    }

    expect(left.getDeterminismHash()).toBe(right.getDeterminismHash());
    expect(left.createCheckpoint()).toEqual(right.createCheckpoint());
    expect(left.getUiSnapshot().phase).toBe('planning');
  });

  it('treats speed as a caller cadence and never scales fixed deltas', () => {
    const session = createMission(createDefinition(), 7);
    session.dispatch({ type: 'set-speed', speed: 3 });
    session.dispatch({ type: 'start-wave' });

    expect(session.advance(10).advancedTicks).toBe(10);
    expect(session.getUiSnapshot().tick).toBe(10);
  });

  it('keeps rejected commands from mutating authoritative state', () => {
    const session = createMission(createDefinition());
    const before = session.getDeterminismHash();
    const reservedCell = createDefinition().arena.waypointCells[0];
    expect(reservedCell).toBeDefined();
    if (reservedCell === undefined) return;

    expect(session.dispatch({ type: 'place-foundation', cell: reservedCell })).toEqual({
      accepted: false,
      tick: 0,
      reason: 'reserved-cell',
    });
    expect(session.getDeterminismHash()).toBe(before);
  });

  it('returns fully replaced snapshots and drains presentation events', () => {
    const session = createMission(createDefinition());
    placeOpening(session);
    const first = session.getRenderSnapshot();
    const second = session.getRenderSnapshot();

    expect(first).not.toBe(second);
    expect(first.towers).not.toBe(second.towers);
    expect(Object.isFrozen(first.towers)).toBe(true);
    expect(session.drainPresentationEvents().map(({ type }) => type)).toEqual([
      'construction',
      'route-changed',
      'construction',
      'route-changed',
    ]);
    expect(session.drainPresentationEvents()).toEqual([]);
  });

  it('uses full opening refunds and reduced between-wave refunds', () => {
    const opening = createMission(createDefinition());
    placeOpening(opening);
    expect(opening.dispatch({ type: 'dismantle', towerId: 'tower-1' }).accepted).toBe(true);
    expect(opening.getUiSnapshot().fieldCredits).toBe(90);

    const planning = createMission(createDefinition());
    placeOpening(planning);
    planning.dispatch({ type: 'start-wave' });
    planning.advance(SIMULATION_TICKS_PER_SECOND * 2);
    expect(planning.dispatch({ type: 'dismantle', towerId: 'tower-1' }).accepted).toBe(true);
    expect(planning.getUiSnapshot().fieldCredits).toBe(88);
  });

  it('allows live Foundation placement but keeps Dismantle between waves', () => {
    const session = createMission(createDefinition());
    session.dispatch({ type: 'start-wave' });

    expect(session.getUiSnapshot()).toMatchObject({
      phase: 'wave',
      canPlaceFoundation: true,
      canDismantle: false,
    });
    expect(
      session.dispatch({
        type: 'place-foundation',
        cell: cellIndex({ x: 2, y: 2 }, createDefinition().arena.width),
      }).accepted,
    ).toBe(true);
    expect(session.dispatch({ type: 'dismantle', towerId: 'tower-1' })).toEqual({
      accepted: false,
      tick: 0,
      reason: 'wrong-phase',
    });

    session.dispatch({ type: 'set-pause', paused: true });
    expect(session.getUiSnapshot().canPlaceFoundation).toBe(false);
    expect(
      session.dispatch({
        type: 'place-foundation',
        cell: cellIndex({ x: 3, y: 2 }, createDefinition().arena.width),
      }),
    ).toEqual({ accepted: false, tick: 0, reason: 'wrong-phase' });
  });

  it('retains a planning-only construction policy for direct comparison', () => {
    const session = createMission({
      ...createDefinition(),
      constructionPolicy: 'planning-only',
    });
    session.dispatch({ type: 'start-wave' });

    expect(session.getUiSnapshot().canPlaceFoundation).toBe(false);
    expect(
      session.dispatch({
        type: 'place-foundation',
        cell: cellIndex({ x: 2, y: 2 }, createDefinition().arena.width),
      }),
    ).toEqual({ accepted: false, tick: 0, reason: 'wrong-phase' });
  });
});
