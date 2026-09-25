import {
  compileArena,
  type CompiledArena,
  type BenchmarkCreepId,
  type CreepDefinition,
  type TowerCombatDefinition,
  type TowerFamilyId,
} from '@tower-defense/content';
import { createMission, type WaveGroupDefinition } from '@tower-defense/sim';
import { measureRouteDwell } from './dwell.js';

/**
 * A standard enemy formation. Density drives splash and pierce value, so every
 * tower is measured against the same formations instead of against one average creep.
 */
export interface Composition {
  readonly id: string;
  readonly description: string;
  readonly group: Omit<WaveGroupDefinition, 'firstSpawnTick'>;
}

export const STANDARD_COMPOSITIONS: readonly Composition[] = Object.freeze([
  { id: 'swarm', description: 'Broodling packs as authored in the gate mission', group: { creepId: 'broodling', count: 30, intervalTicks: 6, burstSize: 4 } },
  { id: 'stream', description: 'Evenly spaced Drones', group: { creepId: 'drone', count: 20, intervalTicks: 15 } },
  { id: 'armored', description: 'Spaced Carapaces', group: { creepId: 'carapace', count: 8, intervalTicks: 30 } },
  { id: 'air', description: 'Glider stream', group: { creepId: 'glider', count: 12, intervalTicks: 15 } },
]);

export interface ProbeResult {
  readonly familyId: TowerFamilyId;
  readonly compositionId: string;
  readonly layoutId: string;
  readonly credits: number;
  readonly spawned: number;
  readonly kills: number;
  readonly leaks: number;
  readonly attacks: number;
  readonly usefulDamage: number;
  readonly overkillDamage: number;
  readonly blockedDamage: number;
  readonly meanHitsPerAttack: number;
  readonly maxHitsPerAttack: number;
  readonly damagePerCredit: number;
  readonly killsPerCredit: number;
}

/**
 * Where the probe tower stands. Mazes should be shaped with unarmed terrain; wallCells
 * (armed Foundations) are allowed, but only the probe tower's damage is counted.
 */
export interface ProbeLayout {
  readonly id: string;
  readonly arena: CompiledArena;
  readonly wallCells: readonly number[];
  readonly towerCell: number;
}

/** Straight 17x3 corridor; the tower sits beside the lane, one pass, no maze. */
export const CORRIDOR_LAYOUT: ProbeLayout = Object.freeze({
  id: 'corridor',
  arena: compileArena({
    schemaVersion: 2, id: 'balance-probe-corridor', name: 'Balance Probe Corridor',
    width: 17, height: 3, spawn: { x: 0, y: 1 }, exit: { x: 16, y: 1 },
    waypoints: [], inactive: [], terrain: [],
  }),
  wallCells: Object.freeze([]),
  towerCell: 8, // (8, 0)
});

/**
 * 9x5 serpentine: unarmed terrain walls on rows 1 and 3 force three lanes. The tower sits
 * in the row-1 wall, so the route passes it on row 0 and again on row 2 (a two-pass wrap).
 * Walls are terrain, not Foundations, so only the probe tower deals damage.
 */
const SERPENTINE_WALLS = [
  ...[0, 1, 2, 3, 5, 6, 7].map((x) => ({ x, y: 1 })),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((x) => ({ x, y: 3 })),
];
export const SERPENTINE_LAYOUT: ProbeLayout = Object.freeze({
  id: 'serpentine',
  arena: compileArena({
    schemaVersion: 2, id: 'balance-probe-serpentine', name: 'Balance Probe Serpentine',
    width: 9, height: 5, spawn: { x: 0, y: 0 }, exit: { x: 8, y: 4 },
    waypoints: [], inactive: [],
    terrain: [{
      id: 'probe-wall', cells: SERPENTINE_WALLS, buildable: false,
      traversable: { ground: false, air: true },
    }],
  }),
  wallCells: Object.freeze([]),
  towerCell: 13, // (4, 1)
});

const FIRST_SPAWN_TICK = 90; // after the slowest construction delay
const TICK_LIMIT = 30 * 60 * 5;

/**
 * Directional weapons are aimed the way a good player would: at the facing that covers
 * the most route. Full-circle weapons need no aim.
 */
export const bestFacing = (
  layout: ProbeLayout,
  weapon: TowerCombatDefinition['weapon'],
  layer: 'ground' | 'air',
): number | null => {
  if ((weapon.coverageArcMilliDegrees ?? 360_000) >= 360_000) return null;
  const placed = [...layout.wallCells, layout.towerCell].map((cell) => ({ cell, familyId: 'foundation' as const }));
  let best = 0;
  let bestCovered = -1;
  for (let facing = 0; facing < 360_000; facing += 22_500) {
    const covered = measureRouteDwell(layout.arena, layer, placed,
      [{ cell: layout.towerCell, weapon, facingMilliDegrees: facing }], 1_000).towers[0]!.coveredMilliCells;
    if (covered > bestCovered) { best = facing; bestCovered = covered; }
  }
  return best;
};

export const runProbe = (
  catalog: Readonly<Partial<Record<TowerFamilyId, TowerCombatDefinition>>>,
  creeps: Readonly<Partial<Record<BenchmarkCreepId, CreepDefinition>>>,
  familyId: TowerFamilyId,
  composition: Composition,
  layout: ProbeLayout = CORRIDOR_LAYOUT,
  seed = 0,
): ProbeResult => {
  const session = createMission(
    {
      id: `probe-${familyId}-${composition.id}-${layout.id}`,
      arena: layout.arena,
      startingLives: 9_999,
      openingFieldCredits: 10_000,
      constructionPolicy: 'planning-only',
      towerCatalog: catalog,
      creeps,
      waves: [{
        id: 'probe-wave',
        tacticalPurpose: 'Balance measurement.',
        groups: [{ ...composition.group, firstSpawnTick: FIRST_SPAWN_TICK }],
      }],
    },
    seed,
  );

  for (const cell of layout.wallCells) {
    const wall = session.dispatch({ type: 'place-foundation', cell });
    if (!wall.accepted) throw new Error(`Probe wall at ${cell} rejected: ${wall.reason}`);
  }
  const place = session.dispatch({ type: 'place-foundation', cell: layout.towerCell });
  if (!place.accepted) throw new Error(`Probe placement rejected: ${place.reason}`);
  const towerId = session.getRenderSnapshot().towers.find(({ cell }) => cell === layout.towerCell)!.id;
  if (familyId !== 'foundation') {
    const install = session.dispatch({ type: 'install-specialist', towerId, familyId });
    if (!install.accepted) throw new Error(`Probe install of ${familyId} rejected: ${install.reason}`);
  }
  const weaponForAim = catalog[familyId]!.weapon;
  const layer = creeps[composition.group.creepId]!.layer;
  const facing = bestFacing(layout, weaponForAim, layer);
  if (facing !== null) {
    const aim = session.dispatch({ type: 'aim-tower', towerId, facingMilliDegrees: facing });
    if (!aim.accepted) throw new Error(`Probe aim rejected: ${aim.reason}`);
  }
  const credits =
    (catalog.foundation?.fieldCreditCost ?? 0) +
    (familyId === 'foundation' ? 0 : catalog[familyId]?.fieldCreditCost ?? 0);

  session.dispatch({ type: 'start-wave' });
  let kills = 0, leaks = 0, attacks = 0, useful = 0, overkill = 0, blocked = 0, hitSum = 0, maxHits = 0;
  const weapon = catalog[familyId]!.weapon;

  for (let elapsed = 0; elapsed < TICK_LIMIT; elapsed += 30) {
    const { phase } = session.advance(30);
    for (const event of session.drainPresentationEvents()) {
      const p = event.payload;
      if (event.type === 'creep-leaked') leaks += 1;
      if (p.towerId !== towerId) continue;
      if (event.type === 'creep-died') kills += 1;
      if (event.type === 'creep-damaged') {
        const landed = Number(p.damage);
        const blockedHere = Number(p.blockedDamage);
        useful += landed;
        blocked += blockedHere;
        overkill += Math.max(0, weapon.damage - blockedHere - landed);
      }
      // Siege damage lands on 'weapon-impact'; everything else on 'tower-fired'.
      const counted =
        (event.type === 'weapon-impact') ||
        (event.type === 'tower-fired' && p.mechanicId !== 'siege-blast');
      if (counted) {
        const hits = Number(p.hitCount ?? 1);
        attacks += 1;
        hitSum += hits;
        maxHits = Math.max(maxHits, hits);
      }
    }
    if (phase !== 'wave') break;
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  return Object.freeze({
    familyId,
    compositionId: composition.id,
    layoutId: layout.id,
    credits,
    spawned: composition.group.count,
    kills, leaks, attacks,
    usefulDamage: useful,
    overkillDamage: overkill,
    blockedDamage: blocked,
    meanHitsPerAttack: attacks === 0 ? 0 : round(hitSum / attacks),
    maxHitsPerAttack: maxHits,
    damagePerCredit: round(useful / credits),
    killsPerCredit: round(kills / credits),
  });
};
