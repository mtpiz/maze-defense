import type { MissionDefinition } from '@tower-defense/sim';
import { GATE_MISSION } from '../application/gate-mission.js';

// Comparison encounter only: no Campaign unlocks or baseline balance are changed.
export const NEON_MISSION: MissionDefinition = {
  ...GATE_MISSION,
  id: 'neon-v1-comparison',
  openingFieldCredits: 360,
  towerCatalog: {
    ...GATE_MISSION.towerCatalog,
    arc: {
      familyId: 'arc', fieldCreditCost: 45, constructionDelayTicks: 30,
      weapon: {
        mechanicId: 'arc-chain', damage: 7, armorPiercing: 0, rangeMilliCells: 2_250,
        minimumRangeMilliCells: 0, coverageArcMilliDegrees: 180_000,
        cooldownTicks: 18, targets: { ground: true, air: true }, targeting: 'first',
        jumpRangeMilliCells: 1_250, maxTargets: 3,
      },
    },
  },
  waves: [
    { id: 'neon-contact', tacticalPurpose: 'Compare the three weapon rhythms.', fieldCreditAllotment: 45,
      groups: [
        { creepId: 'drone', count: 24, firstSpawnTick: 0, intervalTicks: 18 },
        { creepId: 'broodling', count: 24, firstSpawnTick: 120, intervalTicks: 6, burstSize: 4 },
        { creepId: 'carapace', count: 3, firstSpawnTick: 90, intervalTicks: 90 },
      ] },
    ...GATE_MISSION.waves.slice(1),
  ],
};
