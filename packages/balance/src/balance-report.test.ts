import { describe, expect, it } from 'vitest';
import { BENCHMARK_CREEPS, BENCHMARK_TOWERS } from '@tower-defense/content';
import {
  buildDensitySweep, buildTowerReport, formatDensitySweep, formatTowerReport,
} from './report.js';

// Run with `npm run balance`. Prints tables; flags are findings, not failures.
describe('tower balance report', () => {
  it('prints damage and kills per credit for every tower against the standard compositions', () => {
    const report = buildTowerReport(BENCHMARK_TOWERS, BENCHMARK_CREEPS);
    console.log(`\n${formatTowerReport(report)}\n`);
    expect(report.results.length).toBeGreaterThan(0);
  });

  it('prints how multi-target towers scale as the swarm packs tighter', () => {
    const rows = buildDensitySweep(BENCHMARK_TOWERS, BENCHMARK_CREEPS, ['rail', 'siege']);
    console.log(`\n${formatDensitySweep(rows)}\n`);
    expect(rows.length).toBeGreaterThan(0);
  });
});
