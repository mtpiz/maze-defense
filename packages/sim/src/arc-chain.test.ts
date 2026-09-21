import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, compileArena } from '@tower-defense/content';
import { createMission, type MissionDefinition } from './mission-session.js';

const createArcMission = (jumpRangeMilliCells = 600): MissionDefinition =>
  ({
    id: 'arc-chain-fixture',
    arena: compileArena({
      schemaVersion: 2,
      id: 'arc-chain-arena',
      name: 'Arc Chain Arena',
      width: 10,
      height: 2,
      spawn: { x: 0, y: 0 },
      exit: { x: 9, y: 0 },
      waypoints: [],
      inactive: [],
      terrain: [],
    }),
    startingLives: 10,
    openingFieldCredits: 30,
    constructionPolicy: 'live-foundation',
    towerCatalog: {
      foundation: {
        familyId: 'foundation',
        fieldCreditCost: 10,
        constructionDelayTicks: 0,
        weapon: {
          mechanicId: 'direct',
          damage: 1,
          armorPiercing: 0,
          rangeMilliCells: 1,
          cooldownTicks: 30,
          targets: { ground: true, air: false },
          targeting: 'first',
        },
      },
      arc: {
        familyId: 'arc',
        fieldCreditCost: 20,
        constructionDelayTicks: 35,
        weapon: {
          mechanicId: 'arc-chain',
          damage: 5,
          armorPiercing: 1,
          rangeMilliCells: 10_000,
          cooldownTicks: 30,
          targets: { ground: true, air: false },
          targeting: 'first',
          jumpRangeMilliCells,
          maxTargets: 3,
        },
      },
    },
    creeps: {
      drone: { ...BENCHMARK_CREEPS.drone, maxHealth: 20, armor: 2, speedMilliCellsPerSecond: 1_000 },
      carapace: { ...BENCHMARK_CREEPS.carapace, maxHealth: 20, armor: 3, speedMilliCellsPerSecond: 1_000 },
      glider: { ...BENCHMARK_CREEPS.glider, maxHealth: 20, armor: 0, speedMilliCellsPerSecond: 1_000 },
    },
    waves: [
      {
        id: 'staggered-chain',
        tacticalPurpose: 'Exercise ordered Arc chain targets.',
        groups: [
          { creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
          { creepId: 'carapace', count: 1, firstSpawnTick: 1, intervalTicks: 1 },
          { creepId: 'drone', count: 1, firstSpawnTick: 2, intervalTicks: 1 },
          { creepId: 'glider', count: 1, firstSpawnTick: 2, intervalTicks: 1 },
        ],
      },
    ],
  });

const startArcMission = (jumpRangeMilliCells = 600) => {
  const session = createMission(createArcMission(jumpRangeMilliCells));
  session.dispatch({ type: 'place-foundation', cell: 17 });
  session.dispatch({ type: 'install-specialist', towerId: 'tower-1', familyId: 'arc' });
  session.drainPresentationEvents();
  session.dispatch({ type: 'start-wave' });
  session.advance(35);
  return session;
};

describe('Arc chain weapon', () => {
  it('chains from the first target through nearest unique eligible creeps and emits ordered endpoints', () => {
    const session = startArcMission();
    const events = session.drainPresentationEvents();
    const shot = events.find(({ type }) => type === 'tower-fired')!.payload;
    const creeps = session.getRenderSnapshot().creeps;
    const primary = creeps.find(c => c.id === shot.targetId)!;
    expect(shot).toMatchObject({
      mechanicId: 'arc-chain',
      targetId: 'creep-1',
      fromXMilli: 7_000,
      fromYMilli: 1_000,
      xMilli: primary.xMilli,
      yMilli: primary.yMilli,
      hitCount: 3,
    });
    const hitIds: string[] = JSON.parse(String(shot.targetIds));
    expect(new Set(hitIds).size).toBe(3);
    const remaining = creeps.filter(c => c.layer === 'ground' && c.id !== primary.id);
    let previous = primary;
    for (const id of hitIds.slice(1)) {
      const closest = [...remaining].sort((a, b) =>
        Math.hypot(a.xMilli - previous.xMilli, a.yMilli - previous.yMilli)
        - Math.hypot(b.xMilli - previous.xMilli, b.yMilli - previous.yMilli))[0]!;
      expect(id).toBe(closest.id);
      remaining.splice(remaining.indexOf(closest), 1); previous = closest;
    }
    expect(events.filter(({ type }) => type === 'creep-damaged').map(({ payload }) => payload))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ creepId: 'creep-1', damage: 4, remainingHealth: 16 }),
        expect.objectContaining({ creepId: creeps.find(c => c.creepId === 'carapace')!.id, damage: 3, remainingHealth: 17 }),
        expect.objectContaining({ creepId: creeps.find(c => c.creepId === 'drone' && c.id !== primary.id)!.id, damage: 4, remainingHealth: 16 }),
      ]));
    expect(creeps.find(({ creepId }) => creepId === 'glider')).toMatchObject({
      creepId: 'glider',
      health: 20,
    });
  });

  it('stops the chain when no eligible creep is within the jump radius', () => {
    const session = startArcMission(100);
    const events = session.drainPresentationEvents();

    expect(events.find(({ type }) => type === 'tower-fired')?.payload).toMatchObject({
      hitCount: 1,
      targetIds: '["creep-1"]',
    });
    expect(events.filter(({ type }) => type === 'creep-damaged')).toHaveLength(1);
  });

  it('rejects each non-positive Arc chain limit', () => {
    for (const property of ['jumpRangeMilliCells', 'maxTargets'] as const) {
      const definition = createArcMission();
      const arc = definition.towerCatalog.arc! as unknown as {
        weapon: { jumpRangeMilliCells: number; maxTargets: number };
      };
      arc.weapon[property] = 0;

      expect(() => createMission(definition)).toThrow('Tower arc has invalid Arc chain values');
    }
  });
});
