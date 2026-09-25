import type {
  BenchmarkCreepId, CreepDefinition, TowerCombatDefinition, TowerFamilyId,
} from '@tower-defense/content';
import {
  CORRIDOR_LAYOUT, runProbe, SERPENTINE_LAYOUT, STANDARD_COMPOSITIONS,
  type Composition, type ProbeLayout, type ProbeResult,
} from './probe.js';

export interface BalanceFlag {
  readonly familyId: TowerFamilyId;
  readonly compositionId: string;
  readonly layoutId: string;
  readonly rule: 'efficiency-outlier' | 'multi-hit-ceiling';
  readonly detail: string;
}

export interface BalanceThresholds {
  /** Flag a tower whose damage per credit exceeds this multiple of the median capable tower. */
  readonly maxEfficiencyVsMedian: number;
  /** Flag any attack that hits more creeps than this. Rail's authored cap is 3. */
  readonly maxHitsPerAttack: number;
}

export const DEFAULT_THRESHOLDS: BalanceThresholds = Object.freeze({
  maxEfficiencyVsMedian: 2,
  maxHitsPerAttack: 6,
});

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

export const buildTowerReport = (
  catalog: Readonly<Partial<Record<TowerFamilyId, TowerCombatDefinition>>>,
  creeps: Readonly<Partial<Record<BenchmarkCreepId, CreepDefinition>>>,
  compositions: readonly Composition[] = STANDARD_COMPOSITIONS,
  thresholds: BalanceThresholds = DEFAULT_THRESHOLDS,
  layouts: readonly ProbeLayout[] = [CORRIDOR_LAYOUT, SERPENTINE_LAYOUT],
) => {
  const families = Object.keys(catalog) as TowerFamilyId[];
  const results: ProbeResult[] = [];
  const flags: BalanceFlag[] = [];

  for (const layout of layouts) for (const composition of compositions) {
    const layer = creeps[composition.group.creepId]!.layer;
    const capable = families.filter((id) => catalog[id]!.weapon.targets[layer]);
    const rows = capable.map((id) => runProbe(catalog, creeps, id, composition, layout));
    results.push(...rows);

    const baseline = median(rows.map((row) => row.damagePerCredit));
    for (const row of rows) {
      if (baseline > 0 && row.damagePerCredit > baseline * thresholds.maxEfficiencyVsMedian) {
        flags.push({
          familyId: row.familyId, compositionId: composition.id, layoutId: layout.id, rule: 'efficiency-outlier',
          detail: `${row.damagePerCredit} dmg/credit is ${(row.damagePerCredit / baseline).toFixed(1)}x the median (${baseline})`,
        });
      }
      if (row.maxHitsPerAttack > thresholds.maxHitsPerAttack) {
        flags.push({
          familyId: row.familyId, compositionId: composition.id, layoutId: layout.id, rule: 'multi-hit-ceiling',
          detail: `one attack hit ${row.maxHitsPerAttack} creeps (mean ${row.meanHitsPerAttack})`,
        });
      }
    }
  }
  return { results, flags };
};

export const formatTowerReport = ({ results, flags }: ReturnType<typeof buildTowerReport>): string => {
  const header = ['layout', 'comp', 'tower', 'cr', 'kills', 'leaks', 'dmg/cr', 'kills/cr', 'hits avg', 'hits max', 'overkill%'];
  const lines = results.map((r) => [
    r.layoutId, r.compositionId, r.familyId, r.credits, `${r.kills}/${r.spawned}`, r.leaks, r.damagePerCredit,
    r.killsPerCredit, r.meanHitsPerAttack, r.maxHitsPerAttack,
    r.usefulDamage + r.overkillDamage === 0 ? 0 :
      Math.round((100 * r.overkillDamage) / (r.usefulDamage + r.overkillDamage)),
  ].map(String));
  const widths = header.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i]!.length)));
  const row = (cells: readonly string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ');
  const flagText = flags.length === 0 ? 'No flags.' :
    flags.map((f) => `FLAG ${f.rule}: ${f.familyId} vs ${f.compositionId} on ${f.layoutId} - ${f.detail}`).join('\n');
  return [row(header), ...lines.map(row), '', flagText].join('\n');
};

export interface DensityRow {
  readonly layoutId: string;
  readonly burstSize: number;
  readonly familyId: TowerFamilyId;
  readonly kills: number;
  readonly damagePerCredit: number;
  readonly meanHitsPerAttack: number;
  readonly maxHitsPerAttack: number;
}

/**
 * Same swarm, packed tighter and tighter. A capped weapon (Rail) flattens out;
 * an uncapped splash keeps climbing wherever the maze lets the crowd bunch up.
 */
export const buildDensitySweep = (
  catalog: Readonly<Partial<Record<TowerFamilyId, TowerCombatDefinition>>>,
  creeps: Readonly<Partial<Record<BenchmarkCreepId, CreepDefinition>>>,
  families: readonly TowerFamilyId[],
  creepId: BenchmarkCreepId = 'broodling',
  burstSizes: readonly number[] = [1, 2, 4, 8, 16],
  layouts: readonly ProbeLayout[] = [SERPENTINE_LAYOUT],
): readonly DensityRow[] =>
  layouts.flatMap((layout) =>
    burstSizes.flatMap((burstSize) =>
      families.map((familyId) => {
        const result = runProbe(catalog, creeps, familyId, {
          id: `density-${burstSize}`, description: `Bursts of ${burstSize}`,
          group: { creepId, count: 32, intervalTicks: 6, burstSize },
        }, layout);
        return Object.freeze({
          layoutId: layout.id, burstSize, familyId, kills: result.kills,
          damagePerCredit: result.damagePerCredit,
          meanHitsPerAttack: result.meanHitsPerAttack, maxHitsPerAttack: result.maxHitsPerAttack,
        });
      })));

export const formatDensitySweep = (rows: readonly DensityRow[]): string => {
  const header = ['layout', 'burst', 'tower', 'kills/32', 'dmg/cr', 'hits avg', 'hits max'];
  const lines = rows.map((r) => [r.layoutId, r.burstSize, r.familyId, r.kills, r.damagePerCredit,
    r.meanHitsPerAttack, r.maxHitsPerAttack].map(String));
  const widths = header.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i]!.length)));
  const row = (cells: readonly string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join('  ');
  return [row(header), ...lines.map(row)].join('\n');
};
