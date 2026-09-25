import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, BENCHMARK_TOWERS, compileArena } from '@tower-defense/content';
import { createMission, type CreepSnapshot, type MissionDefinition } from './index.js';
import { PROGRESS_UNSET, STALL_LIMIT_TICKS, bodiesOverlap, fitsCorridor, moveGroundCrowd, type CrowdBody } from './ground-crowd.js';

const WIDTH = 20;
const definition = (): MissionDefinition => ({
  id: 'ground-crowd-fixture',
  arena: compileArena({ schemaVersion: 2, id: 'ground-crowd-arena', name: 'Ground Crowd',
    width: WIDTH, height: 4, spawn: { x: 0, y: 1 }, exit: { x: WIDTH - 1, y: 1 },
    waypoints: [], inactive: [], terrain: [] }),
  startingLives: 200, openingFieldCredits: 0, constructionPolicy: 'live-foundation',
  towerCatalog: { foundation: BENCHMARK_TOWERS.foundation! },
  creeps: {
    ...BENCHMARK_CREEPS,
    broodling: { ...BENCHMARK_CREEPS.broodling, speedMilliCellsPerSecond: 1_200 },
    drone: { ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 3_000 },
    carapace: { ...BENCHMARK_CREEPS.carapace, speedMilliCellsPerSecond: 600 },
  },
  waves: [{ id: 'burst', tacticalPurpose: 'Pack small bodies across the corridor.', groups:
    Array.from({ length: 4 }, () => ({ creepId: 'broodling' as const, count: 8,
      firstSpawnTick: 0, intervalTicks: 8 })) }],
});

function expectSeparated(creeps: readonly CreepSnapshot[]): void {
  const ground = creeps.filter(c => c.layer === 'ground');
  let minimumGap = Infinity;
  for (let i = 0; i < ground.length; i++) for (let j = i + 1; j < ground.length; j++) {
    const a = ground[i]!, b = ground[j]!;
    minimumGap = Math.min(minimumGap, Math.hypot(a.xMilli - b.xMilli, a.yMilli - b.yMilli)
      - a.radiusMilliCells - b.radiusMilliCells);
  }
  expect(minimumGap, 'Ground body clearance').toBeGreaterThanOrEqual(-.01);
}

describe('Ground crowd occupancy', () => {
  it('allows body contact without adding a separation margin', () => {
    expect(bodiesOverlap({ x: 0, y: 0 }, 80, { x: 160, y: 0 }, 80)).toBe(false);
    expect(bodiesOverlap({ x: 0, y: 0 }, 80, { x: 159, y: 0 }, 80)).toBe(true);
  });

  it('waits without oscillating sideways when a heavy leaves no passing gap', () => {
    const bodies: CrowdBody[] = [
      { id: 'creep-1', x: 0, y: 1000, radius: 80, weight: 1, speed: 1200,
        pattern: 'swarm', lane: 0, route: [4, 5, 6, 7], routeIndex: 0, stallTicks: 0, bestProgress: PROGRESS_UNSET, unstickUntil: 0 },
      { id: 'creep-2', x: 600, y: 1000, radius: 450, weight: 20, speed: 0,
        pattern: 'heavy', lane: 0, route: [4, 5, 6, 7], routeIndex: 0, stallTicks: 0, bestProgress: PROGRESS_UNSET, unstickUntil: 0 },
    ];
    let lastY = bodies[0]!.y, lastDirection = 0, reversals = 0;
    for (let tick = 0; tick < 90; tick++) {
      moveGroundCrowd(bodies, 4, tick);
      const dy = bodies[0]!.y - lastY;
      const direction = Math.abs(dy) > 2 ? Math.sign(dy) : 0;
      if (direction && lastDirection && direction !== lastDirection) reversals++;
      if (direction) lastDirection = direction;
      lastY = bodies[0]!.y;
    }
    expect(reversals).toBeLessThanOrEqual(3);
  });

  it('uses tight small bodies, slightly larger runners, and doubled heavy silhouettes', () => {
    expect(BENCHMARK_CREEPS.broodling.movement!.radiusMilliCells).toBe(80);
    expect(BENCHMARK_CREEPS.drone.movement!.radiusMilliCells).toBe(115);
    expect(BENCHMARK_CREEPS.carapace.movement!.radiusMilliCells).toBe(260);
  });

  it('does not flip its passing direction when a neighbor shifts across its center line', () => {
    const run = (across: number) => {
      const bodies: CrowdBody[] = [
        { id: 'creep-1', x: 0, y: 1000, radius: 80, weight: 1, speed: 1200,
          pattern: 'swarm', lane: 0, route: [4, 5, 6, 7], routeIndex: 0, stallTicks: 0, bestProgress: PROGRESS_UNSET, unstickUntil: 0 },
        { id: 'creep-2', x: 240, y: 1000 + across, radius: 80, weight: 1, speed: 0,
          pattern: 'swarm', lane: 0, route: [4, 5, 6, 7], routeIndex: 0, stallTicks: 0, bestProgress: PROGRESS_UNSET, unstickUntil: 0 },
      ];
      moveGroundCrowd(bodies, 4, 0);
      return bodies[0]!.y;
    };
    expect(Math.abs(run(-9) - run(9))).toBeLessThan(2);
  });

  it('admits four simultaneous small bodies abreast instead of serializing arrivals', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    session.advance(1);
    const creeps = session.getRenderSnapshot().creeps;
    expect(creeps).toHaveLength(4);
    expect(new Set(creeps.map(c => c.yMilli)).size).toBe(4);
    expectSeparated(creeps);
  });

  it('keeps a dense burst separated and inside the cell-width corridor on every tick', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    let peak = 0;
    for (let tick = 0; tick < 300; tick++) {
      session.advance(1);
      const creeps = session.getRenderSnapshot().creeps;
      peak = Math.max(peak, creeps.length);
      expectSeparated(creeps);
      for (const c of creeps) {
        expect(c.yMilli - c.radiusMilliCells).toBeGreaterThanOrEqual(500);
        expect(c.yMilli + c.radiusMilliCells).toBeLessThanOrEqual(1500);
      }
    }
    expect(peak).toBe(32);
  });

  it('lets pointed runners get ahead of heavy units through available ground space', () => {
    const base = definition();
    const session = createMission({ ...base, waves: [{ id: 'passing', tacticalPurpose: 'Pass a heavy.', groups: [
      { creepId: 'carapace', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
      { creepId: 'drone', count: 3, firstSpawnTick: 12, intervalTicks: 1 },
      { creepId: 'broodling', count: 12, firstSpawnTick: 12, intervalTicks: 1 },
    ] }] });
    session.dispatch({ type: 'start-wave' });
    for (let tick = 0; tick < 150; tick++) {
      session.advance(1);
      expectSeparated(session.getRenderSnapshot().creeps);
    }
    const creeps = session.getRenderSnapshot().creeps;
    const heavy = creeps.find(c => c.creepId === 'carapace')!;
    expect(creeps.filter(c => c.creepId === 'drone').some(c => c.xMilli > heavy.xMilli + 500)).toBe(true);
    expect(Math.abs(heavy.yMilli - 1000)).toBeLessThan(160);
  });

  it('replays the same crowd and pending admissions independently of advance chunking', () => {
    const a = createMission(definition()), b = createMission(definition());
    a.dispatch({ type: 'start-wave' }); b.dispatch({ type: 'start-wave' });
    a.advance(180);
    for (let i = 0; i < 180; i++) b.advance(1);
    expect(a.getDeterminismHash()).toBe(b.getDeterminismHash());
    expect(a.createCheckpoint()).toEqual(b.createCheckpoint());
    expect(a.createCheckpoint().creeps[0]?.xMilli).toBeTypeOf('number');
  });

  it('checkpoints waiting ground arrivals while Air bypasses a full entrance', () => {
    const base = definition();
    const session = createMission({ ...base,
      creeps: { ...base.creeps, broodling: { ...base.creeps.broodling!, speedMilliCellsPerSecond: 1 } },
      waves: [{ id: 'full-entrance', tacticalPurpose: 'Account for deferred arrivals.', groups: [
        { creepId: 'broodling', count: 8, firstSpawnTick: 0, intervalTicks: 1, burstSize: 8 },
        { creepId: 'glider', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
      ] }] });
    session.dispatch({ type: 'start-wave' }); session.advance(1);
    expect(session.createCheckpoint().pendingSpawnIndexes).toEqual([4, 5, 6, 7]);
    expect(session.getUiSnapshot()).toMatchObject({ spawnedCreeps: 5, activeCreeps: 5, waveCreepCount: 9 });
    expect(session.getRenderSnapshot().creeps.filter(c => c.layer === 'air')).toHaveLength(1);
    expectSeparated(session.getRenderSnapshot().creeps);
  });

  it('moves a full mixed pack around corners without entering walls or losing arrivals', () => {
    const base = definition();
    const arena = compileArena({ schemaVersion: 2, id: 'crowd-turns', name: 'Crowd Turns',
      width: 7, height: 7, spawn: { x: 0, y: 1 }, exit: { x: 6, y: 5 },
      waypoints: [{ x: 4, y: 1 }, { x: 4, y: 4 }, { x: 1, y: 4 }, { x: 1, y: 5 }],
      inactive: [], terrain: [] });
    const session = createMission({ ...base, arena, waves: [{ id: 'turns', tacticalPurpose: 'Crowd turns.', groups: [
      { creepId: 'broodling', count: 32, firstSpawnTick: 0, intervalTicks: 6, burstSize: 4 },
      { creepId: 'carapace', count: 2, firstSpawnTick: 0, intervalTicks: 60 },
      { creepId: 'drone', count: 6, firstSpawnTick: 20, intervalTicks: 12 },
    ] }] });
    session.dispatch({ type: 'start-wave' });
    const corridor = new Set(session.getRenderSnapshot().groundRoute);
    for (let tick = 0; tick < 1800 && session.getUiSnapshot().phase === 'wave'; tick++) {
      session.advance(1);
      const creeps = session.getRenderSnapshot().creeps;
      expectSeparated(creeps);
      for (const c of creeps) expect(fitsCorridor({ x: c.xMilli, y: c.yMilli }, c.radiusMilliCells, corridor, 7)).toBe(true);
    }
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'victory', leakedCreeps: 40 });
    expect(session.drainPresentationEvents().filter(e => e.type === 'creep-spawned')).toHaveLength(40);
  });

  it('makes authored weight affect lateral displacement without permitting intersection', () => {
    const run = (weight: number) => {
      const bodies: CrowdBody[] = [
        { id: 'creep-1', x: 0, y: 0, radius: 110, weight: 8, speed: 1200,
          pattern: 'runner', lane: 0, route: [0, 1, 2, 3], routeIndex: 0, stallTicks: 0, bestProgress: PROGRESS_UNSET, unstickUntil: 0 },
        { id: 'creep-2', x: 170, y: 160, radius: 110, weight, speed: 0,
          pattern: 'heavy', lane: 0, route: [0, 1, 2, 3], routeIndex: 0, stallTicks: 0, bestProgress: PROGRESS_UNSET, unstickUntil: 0 },
      ];
      for (let tick = 0; tick < 30; tick++) moveGroundCrowd(bodies, 4, tick);
      expect(Math.hypot(bodies[0]!.x - bodies[1]!.x, bodies[0]!.y - bodies[1]!.y)).toBeGreaterThanOrEqual(220);
      return Math.hypot(bodies[1]!.x - 170, bodies[1]!.y - 160);
    };
    expect(run(1)).toBeGreaterThan(run(20));
  });

  it('passes opposing clumps at a reversing waypoint without freezing or piling up', () => {
    const base = definition();
    const session = createMission({ ...base, arena: compileArena({ schemaVersion: 2,
      id: 'crowd-reversal', name: 'Crowd Reversal', width: 7, height: 4,
      spawn: { x: 0, y: 1 }, exit: { x: 6, y: 2 }, waypoints: [{ x: 5, y: 1 }, { x: 1, y: 1 }],
      inactive: [], terrain: [] }) });
    session.dispatch({ type: 'start-wave' });
    const corridor = new Set(session.getRenderSnapshot().groundRoute);
    const lastMoved = new Map<string, { x: number; y: number; tick: number }>();
    const stackedSince = new Map<string, number>();
    for (let tick = 0; tick < 1800 && session.getUiSnapshot().phase === 'wave'; tick++) {
      session.advance(1);
      const creeps = session.getRenderSnapshot().creeps;
      // Passing may overlap briefly, but bodies must never pile up or ride on top of one another.
      const stackedNow = new Set<string>();
      for (const a of creeps) {
        const onTop = creeps.filter(b => b !== a && Math.hypot(a.xMilli - b.xMilli, a.yMilli - b.yMilli)
          < (a.radiusMilliCells + b.radiusMilliCells) / 2);
        expect(onTop.length, `${a.id} pile size`).toBeLessThan(2);
        for (const b of onTop) {
          const key = [a.id, b.id].sort().join('|');
          stackedNow.add(key);
          if (!stackedSince.has(key)) stackedSince.set(key, tick);
          expect(tick - stackedSince.get(key)!, `${key} stacked`).toBeLessThan(30);
        }
      }
      for (const key of [...stackedSince.keys()]) if (!stackedNow.has(key)) stackedSince.delete(key);
      for (const c of creeps) {
        expect(fitsCorridor({ x: c.xMilli, y: c.yMilli }, c.radiusMilliCells, corridor, 7)).toBe(true);
        const last = lastMoved.get(c.id);
        if (!last || Math.hypot(c.xMilli - last.x, c.yMilli - last.y) > 100) {
          lastMoved.set(c.id, { x: c.xMilli, y: c.yMilli, tick });
        } else expect(tick - last.tick, `${c.id} frozen`).toBeLessThan(STALL_LIMIT_TICKS * 3);
      }
    }
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'victory', leakedCreeps: 32 });
  });

  it('never deadlocks heavy bodies meeting head-on in a one-cell two-way corridor', () => {
    const base = definition();
    // A one-row corridor: the route runs east, doubles back west, then east again through the same cells.
    const session = createMission({ ...base, arena: compileArena({ schemaVersion: 2,
      id: 'crowd-one-lane', name: 'One Lane', width: 8, height: 2,
      spawn: { x: 0, y: 0 }, exit: { x: 7, y: 0 }, waypoints: [{ x: 6, y: 0 }, { x: 1, y: 0 }],
      inactive: Array.from({ length: 8 }, (_, x) => ({ x, y: 1 })), terrain: [] }), waves: [{ id: 'heavies', tacticalPurpose: 'Head-on heavies.', groups: [
      { creepId: 'carapace', count: 4, firstSpawnTick: 0, intervalTicks: 45 },
      { creepId: 'drone', count: 4, firstSpawnTick: 20, intervalTicks: 45 },
      { creepId: 'broodling', count: 8, firstSpawnTick: 10, intervalTicks: 20 },
    ] }] });
    session.dispatch({ type: 'start-wave' });
    for (let tick = 0; tick < 30 * 90 && session.getUiSnapshot().phase === 'wave'; tick++) session.advance(1);
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'victory', leakedCreeps: 16 });
  });

  it('lets an overlapping body slip free after a full stall and then collide normally again', () => {
    const body = (id: string, x: number, speed: number): CrowdBody => ({ id, x, y: 0, radius: 260, weight: 6, speed,
      pattern: 'heavy', lane: 0, route: [0, 1, 2, 3, 4, 5], routeIndex: 0,
      stallTicks: 0, bestProgress: PROGRESS_UNSET, unstickUntil: 0 });
    // A heavy wedged behind a permanently stopped heavy: it must wait at first, then slip past.
    const blocker = body('creep-1', 1100, 0), mover = body('creep-2', 580, 900);
    const bodies = [blocker, mover];
    let tick = 0;
    for (; tick < STALL_LIMIT_TICKS * 4 && mover.routeIndex < 3; tick++) moveGroundCrowd(bodies, 6, tick);
    expect(mover.routeIndex, 'mover got past the stopped body').toBeGreaterThanOrEqual(3);
    for (; tick < 400 && mover.unstickUntil > 0; tick++) moveGroundCrowd(bodies, 6, tick);
    expect(mover.unstickUntil, 'mover returns to normal collisions once clear').toBe(0);
  });
});
