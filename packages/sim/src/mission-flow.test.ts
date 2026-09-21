import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, BENCHMARK_TOWERS, compileArena } from '@tower-defense/content';
import { createMission, type MissionDefinition } from './mission-session.js';

const definition = (): MissionDefinition => ({
  id: 'mission-flow',
  arena: compileArena({
    schemaVersion: 2, id: 'flow-arena', name: 'Flow Arena', width: 5, height: 2,
    spawn: { x: 0, y: 0 }, exit: { x: 4, y: 0 }, waypoints: [], inactive: [], terrain: [],
  }),
  startingLives: 20,
  openingFieldCredits: 100,
  constructionPolicy: 'live-foundation',
  planningDurationTicks: 60,
  earlyLaunchMaxCredits: 6,
  twoStarLives: 15,
  towerCatalog: BENCHMARK_TOWERS,
  creeps: { drone: { ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 30_000 } },
  waves: [0, 1].map((index) => ({
    id: `wave-${index}`, tacticalPurpose: 'Check the complete mission flow.',
    fieldCreditAllotment: 40,
    groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
  })),
});

describe('Mission pacing and results', () => {
  it('exposes immutable weapon ranges and positioned damage with actual Armor mitigation', () => {
    const base = definition();
    const session = createMission({
      ...base, creeps: { drone: { ...base.creeps.drone!, armor: 6, speedMilliCellsPerSecond: 1_000 } },
    });
    session.dispatch({ type: 'place-foundation', cell: 6 });
    const tower = session.getRenderSnapshot().towers[0]!;
    expect(tower.weapon.rangeMilliCells).toBe(base.towerCatalog.foundation!.weapon.rangeMilliCells);
    expect(Object.isFrozen(tower.weapon)).toBe(true);
    expect(Object.isFrozen(tower.weapon.targets)).toBe(true);
    session.dispatch({ type: 'start-wave' });
    session.advance(15);
    expect(session.drainPresentationEvents().find(({ type }) => type === 'creep-damaged')?.payload)
      .toMatchObject({ damage: 1, blockedDamage: 3,
        xMilli: session.getRenderSnapshot().creeps[0]!.xMilli, yMilli: 0 });
    expect(session.getRenderSnapshot().creeps[0]!.xMilli).toBeCloseTo(500, 1);
  });

  it('positions a leak at the exit and reports its life cost', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    session.advance(4);
    expect(session.drainPresentationEvents().find(({ type }) => type === 'creep-leaked')?.payload)
      .toMatchObject({ lifeDamage: 1, xMilli: 4_000, yMilli: 0, creepType: 'drone' });
  });
  it('keeps opening untimed and pays the guaranteed allotment even when every creep leaks', () => {
    const session = createMission(definition());
    expect(session.advance(300).advancedTicks).toBe(0);
    expect(session.getUiSnapshot()).toMatchObject({ fieldCredits: 100, guaranteedWaveIncome: 40 });
    session.dispatch({ type: 'start-wave' });
    expect(session.advance(300)).toMatchObject({ advancedTicks: 4, phase: 'planning' });
    expect(session.getUiSnapshot()).toMatchObject({ fieldCredits: 140, lives: 19, planningTicksRemaining: 60 });
    expect(session.drainPresentationEvents().filter(({ type }) => type === 'wave-completed'))
      .toMatchObject([{ payload: { fieldCredits: 40 } }]);
  });

  it('pauses the countdown and launches automatically at exactly its boundary without a bonus', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    session.advance(4);
    session.dispatch({ type: 'set-pause', paused: true });
    expect(session.advance(100).advancedTicks).toBe(0);
    expect(session.getUiSnapshot()).toMatchObject({ planningTicksRemaining: 60, canDismantle: false });
    session.dispatch({ type: 'set-pause', paused: false });
    session.advance(59);
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'planning', planningTicksRemaining: 1 });
    expect(session.advance(100)).toMatchObject({ advancedTicks: 1, phase: 'wave' });
    expect(session.getUiSnapshot()).toMatchObject({ fieldCredits: 140, waveNumber: 2, spawnedCreeps: 0 });
  });

  it('awards the displayed Early Launch bonus once, never during opening or tactical pause', () => {
    const session = createMission(definition());
    expect(session.dispatch({ type: 'early-launch' }).accepted).toBe(false);
    session.dispatch({ type: 'start-wave' });
    session.advance(4);
    session.advance(30);
    expect(session.getUiSnapshot().earlyLaunchCredits).toBe(3);
    session.dispatch({ type: 'set-pause', paused: true });
    expect(session.dispatch({ type: 'early-launch' }).accepted).toBe(false);
    session.dispatch({ type: 'set-pause', paused: false });
    expect(session.dispatch({ type: 'early-launch' }).accepted).toBe(true);
    expect(session.getUiSnapshot().fieldCredits).toBe(143);
    expect(session.dispatch({ type: 'early-launch' }).accepted).toBe(false);
    expect(session.getUiSnapshot().fieldCredits).toBe(143);
  });

  it('records leaks and derives Stars from Lives only, then freezes the terminal run', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    session.advance(4);
    session.dispatch({ type: 'early-launch' });
    session.advance(4);
    expect(session.getUiSnapshot()).toMatchObject({
      phase: 'victory', lives: 18, stars: 2, defeatedCreeps: 0,
      leakedCreeps: 2, leaksByFamily: { drone: 2 }, planningTicksRemaining: 0,
    });
    const hash = session.getDeterminismHash();
    expect(session.advance(300).advancedTicks).toBe(0);
    expect(session.dispatch({ type: 'start-wave' }).accepted).toBe(false);
    expect(session.getDeterminismHash()).toBe(hash);
    expect(session.createCheckpoint()).toMatchObject({ leakedCreeps: 2, leaksByFamily: { drone: 2 } });
  });

  it('never awards Stars or clear income for a fatal leak', () => {
    const session = createMission({ ...definition(), startingLives: 1, twoStarLives: 1 });
    session.dispatch({ type: 'start-wave' });
    session.advance(4);
    expect(session.getUiSnapshot()).toMatchObject({
      phase: 'defeat', stars: 0, fieldCredits: 100, leakedCreeps: 1, waveNumber: 1,
    });
  });

  it.each([[20, 3], [15, 2], [14, 1]])('rates a victory retaining %i Lives with %i Stars', (lives, stars) => {
    const base = definition();
    const session = createMission({
      ...base,
      creeps: { drone: {
        ...base.creeps.drone!, lifeDamage: 20 - lives || 1,
        speedMilliCellsPerSecond: lives === 20 ? 1_000 : 30_000,
      } },
      waves: [base.waves[0]!],
    });
    if (lives === 20) {
      session.dispatch({ type: 'place-foundation', cell: 6 });
      session.dispatch({ type: 'install-specialist', towerId: 'tower-1', familyId: 'rail' });
    }
    session.dispatch({ type: 'start-wave' });
    session.advance(300);
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'victory', lives, stars });
  });

  it('rejects a negative guaranteed allotment', () => {
    const base = definition();
    expect(() => createMission({
      ...base, waves: [{ ...base.waves[0]!, fieldCreditAllotment: -1 }],
    })).toThrow(/allotment/);
  });

  it('replays automatic planning and Early Launch with identical fixed ticks', () => {
    const left = createMission(definition(), 42);
    const right = createMission(definition(), 42);
    for (const session of [left, right]) {
      session.dispatch({ type: 'start-wave' });
      session.advance(4);
    }
    left.advance(30);
    for (let tick = 0; tick < 30; tick += 1) right.advance(1);
    for (const session of [left, right]) {
      session.dispatch({ type: 'early-launch' });
      session.advance(4);
    }
    expect(left.createCheckpoint()).toEqual(right.createCheckpoint());
  });

  it.each([
    { planningDurationTicks: -1 }, { planningDurationTicks: 1.5 },
    { earlyLaunchMaxCredits: -1 }, { twoStarLives: 21 },
  ])('rejects malformed pacing or rating content: %j', (override) => {
    expect(() => createMission({ ...definition(), ...override })).toThrow();
  });
});
