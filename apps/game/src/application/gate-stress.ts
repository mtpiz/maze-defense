import { BENCHMARK_CREEPS, BENCHMARK_TOWERS, compileArena } from '@tower-defense/content';
import { createMission, type MissionDefinition, type MissionSession } from '@tower-defense/sim';

export const GATE_STRESS_TOWER_COUNT = 40;
export const GATE_STRESS_CREEP_COUNT = 120;

const arena = compileArena({
  schemaVersion: 2,
  id: 'gate-stress-arena',
  name: 'Gate Stress Arena',
  width: 20,
  height: 20,
  spawn: { x: 0, y: 10 },
  exit: { x: 19, y: 10 },
  waypoints: [{ x: 10, y: 10 }],
  inactive: [],
  terrain: [],
});

export const GATE_STRESS_MISSION: MissionDefinition = Object.freeze({
  id: 'gate-stress',
  arena,
  startingLives: 999,
  openingFieldCredits: 10_000,
  constructionPolicy: 'live-foundation',
  towerCatalog: Object.freeze({
    foundation: Object.freeze({
      ...BENCHMARK_TOWERS.foundation!,
      constructionDelayTicks: 0,
      weapon: Object.freeze({
        ...BENCHMARK_TOWERS.foundation!.weapon,
        rangeMilliCells: 30_000,
      }),
    }),
    rail: Object.freeze({
      ...BENCHMARK_TOWERS.rail!,
      constructionDelayTicks: 0,
      weapon: Object.freeze({
        ...BENCHMARK_TOWERS.rail!.weapon,
        rangeMilliCells: 30_000,
      }),
    }),
    siege: Object.freeze({
      ...BENCHMARK_TOWERS.siege!,
      constructionDelayTicks: 0,
      weapon: Object.freeze({
        ...BENCHMARK_TOWERS.siege!.weapon,
        rangeMilliCells: 30_000,
        impactDelayTicks: 1,
        blastRadiusMilliCells: 2_000,
      }),
    }),
  }),
  creeps: Object.freeze({
    broodling: Object.freeze({
      ...BENCHMARK_CREEPS.broodling,
      maxHealth: 1_000_000_000,
      speedMilliCellsPerSecond: 100,
      fieldCreditBounty: 0,
    }),
    glider: Object.freeze({
      ...BENCHMARK_CREEPS.glider,
      maxHealth: 1_000_000_000,
      speedMilliCellsPerSecond: 100,
      fieldCreditBounty: 0,
    }),
  }),
  waves: Object.freeze([Object.freeze({
    id: 'concurrent-pressure',
    tacticalPurpose: 'Exercise 100 overlapping Airborne creeps, 40 firing towers, and dense presentation events.',
    fieldCreditAllotment: 0,
    groups: Object.freeze([
      Object.freeze({
        creepId: 'glider' as const,
        count: 100,
        firstSpawnTick: 0,
        intervalTicks: 1,
      }),
      Object.freeze({
        creepId: 'broodling' as const,
        count: GATE_STRESS_CREEP_COUNT - 100,
        firstSpawnTick: 0,
        intervalTicks: 1,
      }),
    ]),
  })]),
});

export const createGateStressSession = (): MissionSession => {
  const session = createMission(GATE_STRESS_MISSION, 0x53545253);
  for (let index = 0; index < GATE_STRESS_TOWER_COUNT; index += 1) {
    const cell = index;
    const placement = session.dispatch({ type: 'place-foundation', cell });
    if (!placement.accepted) throw new Error(`Stress tower ${index + 1} placement failed: ${placement.reason}`);
    const towerId = session.getRenderSnapshot().towers.find((tower) => tower.cell === cell)?.id;
    if (towerId === undefined) throw new Error(`Stress tower ${index + 1} was not created`);
    const installation = session.dispatch({
      type: 'install-specialist',
      towerId,
      familyId: index % 2 === 0 ? 'rail' : 'siege',
    });
    if (!installation.accepted) {
      throw new Error(`Stress tower ${index + 1} installation failed: ${installation.reason}`);
    }
  }
  session.drainPresentationEvents();
  session.dispatch({ type: 'set-speed', speed: 3 });
  session.dispatch({ type: 'start-wave' });
  return session;
};
