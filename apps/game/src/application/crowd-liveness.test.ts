import { describe, expect, it } from 'vitest';
import { createMission, type MissionDefinition } from '@tower-defense/sim';
import { NEON_MISSION } from '../neon/neon-mission.js';

// Deterministic LCG so every run explores the same mazes.
const rng = (seed: number) => () => ((seed = (seed * 1_664_525 + 1_013_904_223) >>> 0) / 2 ** 32);

// Foundations deal no damage, so every creep must walk the whole maze. Before the unstick rule, most of
// these layouts jammed permanently where the route doubles back through a one-cell corridor.
const undefended: MissionDefinition = {
  ...NEON_MISSION, startingLives: 100_000, openingFieldCredits: 100_000,
  waves: NEON_MISSION.waves.map((wave) => ({ ...wave, fieldCreditAllotment: 0 })),
};

describe('ground crowd liveness', () => {
  it.each([1, 2, 5, 12])('clears random maze %i without any creep freezing, including mid-wave rebuilds', (seed) => {
    const random = rng(seed);
    const session = createMission(undefended);
    const target = 10 + Math.floor(random() * 25);
    for (let i = 0; i < target * 4 && session.getRenderSnapshot().towers.length < target; i++) {
      session.dispatch({ type: 'place-foundation', cell: Math.floor(random() * 126) });
    }
    session.dispatch({ type: 'start-wave' });
    const lastMoved = new Map<string, { x: number; y: number; tick: number }>();
    let longestFreeze = 0;
    for (let t = 0; t < 30 * 120 && session.getUiSnapshot().phase === 'wave'; t++) {
      session.advance(1);
      if (t % 300 === 150) session.dispatch({ type: 'place-foundation', cell: Math.floor(random() * 126) });
      const tick = session.getUiSnapshot().tick;
      for (const creep of session.getRenderSnapshot().creeps) {
        const last = lastMoved.get(creep.id);
        if (!last || Math.hypot(creep.xMilli - last.x, creep.yMilli - last.y) > 150) {
          lastMoved.set(creep.id, { x: creep.xMilli, y: creep.yMilli, tick });
        } else longestFreeze = Math.max(longestFreeze, tick - last.tick);
      }
    }
    expect(session.getUiSnapshot().phase, 'wave cleared').toBe('planning');
    expect(longestFreeze, 'longest time any creep stood still (ticks)').toBeLessThan(120);
  });
});
