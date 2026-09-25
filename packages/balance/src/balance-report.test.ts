import { describe, expect, it } from 'vitest';
import { NEON_MISSION } from '../../../apps/game/src/neon/neon-mission.js';
import {
  buildDensitySweep, buildTowerReport, formatDensitySweep, formatTowerReport,
} from './report.js';

// Run with `npm run balance`. Measures the tower and creep stats the playable build uses.
// Prints tables; flags are findings, not failures.
const { towerCatalog, creeps } = NEON_MISSION;

describe('tower balance report (playable mission stats)', () => {
  it('prints damage and kills per credit for every tower against the standard compositions', () => {
    const report = buildTowerReport(towerCatalog, creeps);
    console.log(`\n${formatTowerReport(report)}\n`);
    expect(report.results.length).toBeGreaterThan(0);
  }, 120_000);

  it('prints how multi-target towers scale as the swarm packs tighter', () => {
    const rows = buildDensitySweep(towerCatalog, creeps, ['rail', 'arc', 'siege']);
    console.log(`\n${formatDensitySweep(rows)}\n`);
    expect(rows.length).toBeGreaterThan(0);
  }, 120_000);
});
