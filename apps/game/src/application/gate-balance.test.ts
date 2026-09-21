import { describe, expect, it } from 'vitest';
import { createMission, type MissionDefinition } from '@tower-defense/sim';
import { GATE_MISSION } from './gate-mission.js';
import { aimTowersForRoute } from './directional-defense.test-helper.js';

const POSITIONS = [42, 83, 47, 76, 29, 66, 24, 102, 100, 88, 38, 78, 51, 74, 33];

function runDefense(mission: MissionDefinition, mode: 'mixed' | 'rail' | 'siege' | 'opening', positions = POSITIONS) {
  const session = createMission(mission, 42);
  let next = 0;
  const waves = [];
  for (let wave = 0; wave < mission.waves.length; wave += 1) {
    while (next < positions.length && (mode !== 'opening' || wave === 0)) {
      const familyId = mode === 'rail' ? 'rail' : mode === 'siege' ? 'siege' : next % 3 === 2 ? 'siege' : 'rail';
      const cost = 10 + mission.towerCatalog[familyId]!.fieldCreditCost;
      if (session.getUiSnapshot().fieldCredits < cost) break;
      expect(session.dispatch({ type: 'place-foundation', cell: positions[next]! }).accepted).toBe(true);
      const tower = session.getRenderSnapshot().towers.at(-1)!;
      expect(session.dispatch({ type: 'install-specialist', towerId: tower.id, familyId }).accepted).toBe(true);
      next += 1;
    }
    aimTowersForRoute(session);
    session.dispatch({ type: wave === 0 ? 'start-wave' : 'early-launch' });
    session.advance(30_000);
    const ui = session.getUiSnapshot();
    waves.push(`${ui.lives}/${ui.fieldCredits}`);
    session.drainPresentationEvents();
    if (ui.phase === 'defeat') break;
  }
  return { mode, phase: session.getUiSnapshot().phase, lives: session.getUiSnapshot().lives,
    credits: session.getUiSnapshot().fieldCredits, towers: next,
    seconds: Math.round(session.getUiSnapshot().tick / 30), waves: waves.join(', ') };
}

describe('combat Gate balance scenarios', () => {
  it('compares staged defenses and an undeveloped opening', () => {
    const results = (['mixed', 'rail', 'siege', 'opening'] as const).map((mode) => runDefense(GATE_MISSION, mode));
    console.table(results);
    expect(results[0]).toMatchObject({ phase: 'victory' });
    expect(results[1]).toMatchObject({ phase: 'defeat' });
    expect(results[2]).toMatchObject({ phase: 'defeat' });
    expect(results[3]).toMatchObject({ phase: 'defeat' });
    expect(results[0]!.credits).toBeLessThan(100);
    expect(results[0]!.lives).toBeGreaterThan(0);
  });
});
