import { describe, expect, it } from 'vitest';
import { movingRouteDashes, routeEndpointAngles, routeSegments } from './route-motion.js';

describe('route motion geometry', () => {
  it('moves dash geometry forward along the authored route', () => {
    const segments = routeSegments([0, 1, 2]);
    const initial = movingRouteDashes(segments, 0);
    const advanced = movingRouteDashes(segments, .1);

    expect(initial[0]).toMatchObject({ from: { x: .5, y: .5 } });
    expect(advanced[0]!.from.x).toBeGreaterThan(initial[0]!.from.x);
    expect(advanced[0]!.to.y).toBe(.5);
  });

  it('separates opposite traversals of the same board edge', () => {
    const segments = routeSegments([0, 1, 0]);

    expect(segments).toHaveLength(2);
    expect(segments[0]!.from.y).toBeLessThan(.5);
    expect(segments[1]!.from.y).toBeGreaterThan(.5);
  });

  it('aims the spawn arrow into the route and the exit arrow out of it', () => {
    const angles = routeEndpointAngles([0, 1, 10]);

    expect(angles.start).toBeCloseTo(0);
    expect(angles.end).toBeCloseTo(Math.PI / 2);
  });
});
