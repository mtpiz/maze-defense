import benchmarkArenaSource from '@tower-defense/world-01/benchmark.arena.json';
import { BENCHMARK_CREEPS, BENCHMARK_TOWERS, compileArena } from '@tower-defense/content';
import type { MissionDefinition, WaveDefinition } from '@tower-defense/sim';

// Noncanonical combat encounter. Values remain playtest hypotheses, not Campaign progression.
export const GATE_MISSION: MissionDefinition = Object.freeze({
  id: 'brood-combat-gate',
  arena: compileArena(benchmarkArenaSource),
  startingLives: 20,
  twoStarLives: 15,
  openingFieldCredits: 180,
  constructionPolicy: 'live-foundation',
  planningDurationTicks: 18 * 30,
  earlyLaunchMaxCredits: 6,
  towerCatalog: Object.freeze({
    ...BENCHMARK_TOWERS,
    rail: Object.freeze({
      ...BENCHMARK_TOWERS.rail!,
      weapon: Object.freeze({
        ...BENCHMARK_TOWERS.rail!.weapon,
        mechanicId: 'rail-line', damage: 52, beamHalfWidthMilliCells: 350,
        rangeMilliCells: 2_500, minimumRangeMilliCells: 0,
        coverageArcMilliDegrees: 90_000, maxTargets: 1,
      }),
    }),
    siege: Object.freeze({
      ...BENCHMARK_TOWERS.siege!,
      weapon: Object.freeze({
        ...BENCHMARK_TOWERS.siege!.weapon,
        // Horde grinder: uncapped AoE, lighter and faster blasts. Two hits kill a Broodling
        // (28 HP) instead of one. 7 damage (four hits) lost wave 2 in every scripted build,
        // because the wave economy was tuned around one-shot blasts. See packages/balance.
        mechanicId: 'siege-blast', damage: 14, cooldownTicks: 45, rangeMilliCells: 3_500, minimumRangeMilliCells: 1_250,
        coverageArcMilliDegrees: 90_000, impactDelayTicks: 30, blastRadiusMilliCells: 1_000,
      }),
    }),
  }),
  creeps: Object.freeze({
    ...BENCHMARK_CREEPS,
    drone: Object.freeze({ ...BENCHMARK_CREEPS.drone, speedMilliCellsPerSecond: 2_900 }),
    broodling: Object.freeze({ ...BENCHMARK_CREEPS.broodling, speedMilliCellsPerSecond: 1_800, maxHealth: 28, fieldCreditBounty: 0 }),
    carapace: Object.freeze({ ...BENCHMARK_CREEPS.carapace, fieldCreditBounty: 1 }),
    glider: Object.freeze({ ...BENCHMARK_CREEPS.glider, fieldCreditBounty: 1 }),
  }),
  waves: Object.freeze(([
    {
      id: 'first-contact',
      tacticalPurpose: 'Establish sustained Ground coverage through both Waypoints.',
      fieldCreditAllotment: 35,
      groups: [{ creepId: 'drone', count: 10, firstSpawnTick: 0, intervalTicks: 60 }],
    },
    {
      id: 'brood-surge',
      tacticalPurpose: 'Reward Siege coverage of a dense rush while Drones hold the lane.',
      fieldCreditAllotment: 40,
      groups: [
        { creepId: 'drone', count: 8, firstSpawnTick: 0, intervalTicks: 75 },
        { creepId: 'broodling', count: 30, firstSpawnTick: 120, intervalTicks: 6, burstSize: 4 },
      ],
    },
    {
      id: 'armored-column',
      tacticalPurpose: 'Test Rail firing lanes against flat Armor and durable targets.',
      fieldCreditAllotment: 45,
      groups: [{ creepId: 'carapace', count: 8, firstSpawnTick: 0, intervalTicks: 90 }],
    },
    {
      id: 'open-skies',
      tacticalPurpose: 'Require Airborne coverage independent of the player-built Ground Route.',
      fieldCreditAllotment: 45,
      groups: [
        { creepId: 'glider', count: 16, firstSpawnTick: 0, intervalTicks: 40 },
        { creepId: 'drone', count: 8, firstSpawnTick: 180, intervalTicks: 60 },
      ],
    },
    {
      id: 'living-shield',
      tacticalPurpose: 'Break up dense Ground packs surrounding slow armored bodies.',
      fieldCreditAllotment: 50,
      groups: [
        { creepId: 'carapace', count: 10, firstSpawnTick: 0, intervalTicks: 75 },
        { creepId: 'broodling', count: 36, firstSpawnTick: 90, intervalTicks: 6, burstSize: 4 },
      ],
    },
    {
      id: 'convergence',
      tacticalPurpose: 'Combine Armor, Ground density, and independent Airborne pressure.',
      fieldCreditAllotment: 0,
      groups: [
        { creepId: 'carapace', count: 12, firstSpawnTick: 0, intervalTicks: 90 },
        { creepId: 'broodling', count: 42, firstSpawnTick: 150, intervalTicks: 6, burstSize: 4 },
        { creepId: 'glider', count: 20, firstSpawnTick: 420, intervalTicks: 30 },
      ],
    },
  ] satisfies WaveDefinition[]).map((wave) => Object.freeze({
    ...wave,
    groups: Object.freeze(wave.groups.map((group) => Object.freeze(group))),
  }))),
});
