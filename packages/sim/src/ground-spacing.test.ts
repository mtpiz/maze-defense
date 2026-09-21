import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, BENCHMARK_TOWERS, compileArena } from '@tower-defense/content';
import { createMission, type CreepSnapshot, type MissionDefinition } from './index.js';

const WIDTH = 20;

const positionAlongStraightRoute = (creep: CreepSnapshot): number => {
  const from = creep.fromCell % WIDTH;
  const to = creep.toCell % WIDTH;
  return from + (to - from) * creep.progressPermille / 1_000;
};

const definition = (): MissionDefinition => ({
  id: 'ground-spacing-fixture',
  arena: compileArena({
    schemaVersion: 2,
    id: 'ground-spacing-arena',
    name: 'Ground Spacing Arena',
    width: WIDTH,
    height: 2,
    spawn: { x: 0, y: 0 },
    exit: { x: WIDTH - 1, y: 0 },
    waypoints: [],
    inactive: [],
    terrain: [],
  }),
  startingLives: 20,
  openingFieldCredits: 0,
  constructionPolicy: 'live-foundation',
  towerCatalog: { foundation: BENCHMARK_TOWERS.foundation! },
  creeps: {
    drone: { ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 600 },
    broodling: { ...BENCHMARK_CREEPS.broodling, speedMilliCellsPerSecond: 6_000 },
    glider: { ...BENCHMARK_CREEPS.glider, speedMilliCellsPerSecond: 3_000 },
  },
  waves: [{
    id: 'mixed-layers',
    tacticalPurpose: 'Ground units queue while Airborne units pass.',
    groups: [
      { creepId: 'drone', count: 1, firstSpawnTick: 0, intervalTicks: 1 },
      { creepId: 'broodling', count: 1, firstSpawnTick: 1, intervalTicks: 1 },
      { creepId: 'glider', count: 1, firstSpawnTick: 1, intervalTicks: 1 },
    ],
  }],
});

describe('Ground creep spacing', () => {
  it('admits Airborne independently while Ground bodies can pass through available space', () => {
    const session = createMission(definition());
    session.dispatch({ type: 'start-wave' });
    session.advance(2);

    expect(session.getRenderSnapshot().creeps.map(({ creepId }) => creepId)).toEqual([
      'drone',
      'broodling',
      'glider',
    ]);
    expect(session.getUiSnapshot().spawnedCreeps).toBe(3);
    expect(session.createCheckpoint().pendingSpawnIndexes).toEqual([]);

    session.advance(88);
    const creeps = session.getRenderSnapshot().creeps;
    const drone = creeps.find(({ creepId }) => creepId === 'drone')!;
    const broodling = creeps.find(({ creepId }) => creepId === 'broodling')!;
    const glider = creeps.find(({ creepId }) => creepId === 'glider')!;

    const dronePosition = positionAlongStraightRoute(drone);
    const broodlingPosition = positionAlongStraightRoute(broodling);
    expect(broodlingPosition).toBeGreaterThan(dronePosition);
    expect(positionAlongStraightRoute(glider)).toBeGreaterThan(dronePosition);
  });
});
