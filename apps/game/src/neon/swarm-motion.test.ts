import { describe, expect, it } from 'vitest';
import { smoothHeading, swarmMotion } from './swarm-motion.js';

describe('creep swarm presentation motion', () => {
  it('gives stable identities distinct lanes and motion phases', () => {
    const first = swarmMotion('creep-17', 'broodling', 600);
    const repeated = swarmMotion('creep-17', 'broodling', 600);
    const neighbor = swarmMotion('creep-18', 'broodling', 600);

    expect(first).toEqual(repeated);
    expect(neighbor).not.toEqual(first);
  });

  it('makes Broodlings swarm wider than heavy Carapaces', () => {
    const times = [0, 250, 500, 750, 1_000];
    const broodlings = times.map(time => swarmMotion('creep-17', 'broodling', time));
    const carapaces = times.map(time => swarmMotion('creep-17', 'carapace', time));

    expect(Math.max(...broodlings.map(({ lateral }) => Math.abs(lateral))))
      .toBeGreaterThan(Math.max(...carapaces.map(({ lateral }) => Math.abs(lateral))));
    expect(Math.max(...broodlings.map(({ rotation }) => Math.abs(rotation))))
      .toBeGreaterThan(Math.max(...carapaces.map(({ rotation }) => Math.abs(rotation))));
  });

  it('keeps Ground identity motion lateral so visual wobble cannot overtake a neighbor', () => {
    for (const family of ['drone', 'broodling', 'carapace'] as const) {
      for (const time of [0, 250, 500, 750, 1_000]) {
        expect(Math.abs(swarmMotion('creep-17', family, time).longitudinal)).toBe(0);
      }
    }
    expect(swarmMotion('creep-17', 'glider', 600).longitudinal).not.toBe(0);
  });

  it('removes ambient swarm motion for reduced motion', () => {
    expect(swarmMotion('creep-17', 'broodling', 600, true)).toEqual({
      lateral: 0,
      longitudinal: 0,
      rotation: 0,
      scale: 1,
    });
  });

  it('eases a right-angle turn instead of snapping', () => {
    const halfway = smoothHeading(0, Math.PI / 2, 70, 140);
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(Math.PI / 2);
    expect(smoothHeading(Math.PI * 1.9, .1, 70, 140)).toBeGreaterThan(Math.PI * 1.9);
  });
});
