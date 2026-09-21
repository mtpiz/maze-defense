import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, compileArena, type TowerFamilyId } from '@tower-defense/content';
import { createMission, type MissionDefinition, type MissionSession } from './mission-session.js';

type Specialist = Extract<TowerFamilyId, 'rail' | 'siege'>;

const definition = (family: Specialist): MissionDefinition => ({
  id: `directional-${family}`,
  arena: compileArena({
    schemaVersion: 2,
    id: `directional-${family}-arena`,
    name: `Directional ${family}`,
    width: 5,
    height: 3,
    spawn: { x: 0, y: 0 },
    exit: { x: 4, y: 0 },
    waypoints: [],
    inactive: [],
    terrain: [],
  }),
  startingLives: 3,
  openingFieldCredits: 100,
  constructionPolicy: 'live-foundation',
  towerCatalog: {
    foundation: {
      familyId: 'foundation', fieldCreditCost: 10, constructionDelayTicks: 0,
      weapon: {
        mechanicId: 'direct', damage: 1, armorPiercing: 0, rangeMilliCells: 1,
        minimumRangeMilliCells: 0, coverageArcMilliDegrees: 360_000,
        cooldownTicks: 30, targets: { ground: true, air: false }, targeting: 'first',
      },
    },
    [family]: family === 'rail' ? {
      familyId: 'rail', fieldCreditCost: 20, constructionDelayTicks: 0,
      weapon: {
        mechanicId: 'rail-line', damage: 5, armorPiercing: 0, rangeMilliCells: 5_250,
        minimumRangeMilliCells: 0, coverageArcMilliDegrees: 30_000,
        cooldownTicks: 30, targets: { ground: true, air: true }, targeting: 'first',
        beamHalfWidthMilliCells: 350, maxTargets: 2,
      },
    } : {
      familyId: 'siege', fieldCreditCost: 20, constructionDelayTicks: 0,
      weapon: {
        mechanicId: 'siege-blast', damage: 5, armorPiercing: 0, rangeMilliCells: 3_500,
        minimumRangeMilliCells: 1_250, coverageArcMilliDegrees: 90_000,
        cooldownTicks: 30, targets: { ground: true, air: false }, targeting: 'first',
        impactDelayTicks: 2, blastRadiusMilliCells: 1_200,
      },
    },
  },
  creeps: {
    drone: { ...BENCHMARK_CREEPS.drone, maxHealth: 100, speedMilliCellsPerSecond: 1 },
  },
  waves: [{
    id: 'single-target',
    tacticalPurpose: 'Expose directional acquisition at a stable spawn point.',
    groups: [{ creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 }],
  }],
});

const prepare = (family: Specialist): MissionSession => {
  const session = createMission(definition(family));
  expect(session.dispatch({ type: 'place-foundation', cell: 5 }).accepted).toBe(true);
  expect(session.dispatch({ type: 'install-specialist', towerId: 'tower-1', familyId: family }).accepted).toBe(true);
  session.drainPresentationEvents();
  return session;
};

describe('directional specialist towers', () => {
  it('automatically faces an installed specialist toward its nearest eligible route cell', () => {
    expect(prepare('rail').getRenderSnapshot().towers[0]?.facingMilliDegrees).toBe(270_000);
  });

  it('accepts re-aiming during opening, active waves, and pause', () => {
    const session = prepare('rail');
    expect(session.dispatch({ type: 'aim-tower', towerId: 'tower-1', facingMilliDegrees: 0 }))
      .toMatchObject({ accepted: true });
    expect(session.getRenderSnapshot().towers[0]?.facingMilliDegrees).toBe(0);
    session.dispatch({ type: 'start-wave' });
    expect(session.dispatch({ type: 'aim-tower', towerId: 'tower-1', facingMilliDegrees: 270_000 }))
      .toMatchObject({ accepted: true });
    expect(session.getRenderSnapshot().towers[0]?.facingMilliDegrees).toBe(270_000);
    session.dispatch({ type: 'set-pause', paused: true });
    expect(session.dispatch({ type: 'aim-tower', towerId: 'tower-1', facingMilliDegrees: 180_000 }))
      .toMatchObject({ accepted: true });
    expect(session.getRenderSnapshot().towers[0]?.facingMilliDegrees).toBe(180_000);
  });

  it('fires only when the primary target is inside the mounted Rail sector', () => {
    const away = prepare('rail');
    away.dispatch({ type: 'aim-tower', towerId: 'tower-1', facingMilliDegrees: 0 });
    away.dispatch({ type: 'start-wave' });
    away.advance(1);
    expect(away.drainPresentationEvents().some(({ type }) => type === 'tower-fired')).toBe(false);

    const toward = prepare('rail');
    toward.dispatch({ type: 'aim-tower', towerId: 'tower-1', facingMilliDegrees: 270_000 });
    toward.dispatch({ type: 'start-wave' });
    toward.advance(1);
    expect(toward.drainPresentationEvents().some(({ type }) => type === 'tower-fired')).toBe(true);
  });

  it('does not let Siege acquire a target inside its dead zone', () => {
    const session = prepare('siege');
    session.dispatch({ type: 'aim-tower', towerId: 'tower-1', facingMilliDegrees: 270_000 });
    session.dispatch({ type: 'start-wave' });
    session.advance(1);
    expect(session.getRenderSnapshot().impacts).toEqual([]);
    expect(session.drainPresentationEvents().some(({ type }) => type === 'tower-fired')).toBe(false);
  });
});
