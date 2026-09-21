import { describe, expect, it } from 'vitest';
import { burstLifetime, burstProgress, siegeFlightProgress } from './combat-timing.js';

describe('neon combat timing', () => {
  it('maps siege flight from its fired tick to its impact tick', () => {
    expect(siegeFlightProgress(10, 40, 10)).toBe(0);
    expect(siegeFlightProgress(10, 40, 25)).toBe(0.5);
    expect(siegeFlightProgress(10, 40, 40)).toBe(1);
  });

  it('clamps siege flight outside the active interval', () => {
    expect(siegeFlightProgress(10, 40, -100)).toBe(0);
    expect(siegeFlightProgress(10, 40, 100)).toBe(1);
  });

  it('finishes siege flight when its duration is invalid or nonpositive', () => {
    expect(siegeFlightProgress(10, 10, 10)).toBe(1);
    expect(siegeFlightProgress(40, 10, 20)).toBe(1);
    expect(siegeFlightProgress(Number.NaN, 40, 20)).toBe(1);
    expect(siegeFlightProgress(10, Number.POSITIVE_INFINITY, 20)).toBe(1);
  });

  it('uses reduced motion and normal burst durations', () => {
    expect(burstLifetime(true)).toBe(180);
    expect(burstLifetime(false)).toBe(620);
    expect(burstProgress(0, true)).toBe(0);
    expect(burstProgress(90, true)).toBe(0.5);
    expect(burstProgress(180, true)).toBe(1);
    expect(burstProgress(0, false)).toBe(0);
    expect(burstProgress(310, false)).toBe(0.5);
    expect(burstProgress(620, false)).toBe(1);
  });

  it('clamps burst progress to a finite range', () => {
    expect(burstProgress(-1, false)).toBe(0);
    expect(burstProgress(1000, false)).toBe(1);
    expect(burstProgress(Number.NaN, false)).toBe(0);
    expect(burstProgress(Number.POSITIVE_INFINITY, true)).toBe(1);
  });
});
