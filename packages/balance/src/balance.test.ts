import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, BENCHMARK_TOWERS, type WeaponDefinition } from '@tower-defense/content';
import type { MissionDefinition } from '@tower-defense/sim';
import { buildCreditLedger } from './economy.js';
import { measureRouteDwell } from './dwell.js';
import { armorEfficiency, damagePerHit, hitsToKill, overkillShare, sustainedDps } from './matchup.js';
import { CORRIDOR_LAYOUT, runProbe, SERPENTINE_LAYOUT, STANDARD_COMPOSITIONS } from './probe.js';

const foundation = BENCHMARK_TOWERS.foundation!.weapon;
const rail = BENCHMARK_TOWERS.rail!.weapon;
const siege = BENCHMARK_TOWERS.siege!.weapon;

describe('matchup math mirrors the sim damage rule', () => {
  it('applies flat Armor with a minimum of one damage', () => {
    expect(damagePerHit(foundation, BENCHMARK_CREEPS.carapace)).toBe(1);
    expect(armorEfficiency(foundation, BENCHMARK_CREEPS.carapace)).toBe(0.25);
    expect(damagePerHit(rail, BENCHMARK_CREEPS.carapace)).toBe(25);
    expect(hitsToKill(rail, BENCHMARK_CREEPS.carapace)).toBe(4);
  });

  it('reports overkill and zero DPS against untargetable layers', () => {
    expect(overkillShare(rail, BENCHMARK_CREEPS.broodling)).toBeCloseTo(14 / 26, 5);
    expect(sustainedDps(siege, BENCHMARK_CREEPS.glider)).toBe(0);
  });
});

describe('route dwell', () => {
  const armed = (weapon: WeaponDefinition, cell: number) => [{ cell, weapon }];

  it('counts a single pass beside a straight corridor', () => {
    const { arena, towerCell } = CORRIDOR_LAYOUT;
    const dwell = measureRouteDwell(arena, 'ground', [{ cell: towerCell, familyId: 'foundation' }],
      armed(foundation, towerCell), 1_000);
    expect(dwell.towers[0]).toMatchObject({ passes: 1 });
    expect(dwell.towers[0]!.coveredMilliCells).toBeGreaterThan(1_500);
  });

  it('counts each time a mazed route wraps back past the same tower', () => {
    const { arena, towerCell } = SERPENTINE_LAYOUT;
    const dwell = measureRouteDwell(arena, 'ground', [{ cell: towerCell, familyId: 'foundation' }],
      armed(foundation, towerCell), 1_000);
    expect(dwell.routeMilliCells).toBe(28_000);
    expect(dwell.towers[0]!.passes).toBe(2);
  });

  it('gives no dwell to a weapon that cannot target the layer', () => {
    const { arena, towerCell } = CORRIDOR_LAYOUT;
    const dwell = measureRouteDwell(arena, 'air', [], armed(siege, towerCell), 1_000);
    expect(dwell.towers[0]).toMatchObject({ dwellTicks: 0, passes: 0 });
  });
});

describe('credit ledger', () => {
  it('accumulates opening credits, allotments, and bounties before each wave', () => {
    const definition = {
      openingFieldCredits: 100,
      creeps: BENCHMARK_CREEPS,
      waves: [
        { id: 'w1', tacticalPurpose: '', fieldCreditAllotment: 50,
          groups: [{ creepId: 'drone', count: 10, firstSpawnTick: 0, intervalTicks: 1 }] },
        { id: 'w2', tacticalPurpose: '', groups: [] },
      ],
    } as unknown as MissionDefinition;
    const ledger = buildCreditLedger(definition);
    expect(ledger[0]).toMatchObject({ creditsBeforeWave: 100, waveEffectiveHealth: 240, waveBounty: 10 });
    expect(ledger[1]).toMatchObject({ creditsBeforeWave: 160 });
  });
});

describe('sim probe', () => {
  it('is deterministic and counts only the probe tower', () => {
    const swarm = STANDARD_COMPOSITIONS.find(({ id }) => id === 'swarm')!;
    const first = runProbe(BENCHMARK_TOWERS, BENCHMARK_CREEPS, 'siege', swarm, SERPENTINE_LAYOUT);
    const second = runProbe(BENCHMARK_TOWERS, BENCHMARK_CREEPS, 'siege', swarm, SERPENTINE_LAYOUT);
    expect(second).toEqual(first);
    expect(first.kills + first.leaks).toBeLessThanOrEqual(first.spawned);
    expect(first.credits).toBe(60);
  });

  it('shows Rail is capped at three hits per shot', () => {
    const swarm = STANDARD_COMPOSITIONS.find(({ id }) => id === 'swarm')!;
    expect(runProbe(BENCHMARK_TOWERS, BENCHMARK_CREEPS, 'rail', swarm).maxHitsPerAttack).toBeLessThanOrEqual(3);
  });
});
