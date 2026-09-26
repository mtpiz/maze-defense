import { describe, expect, it } from 'vitest';
import { SHELL_ARC_HEIGHT, siegeShellPose, siegeShellRadius } from './siege-shell.js';

describe('siege shell pose', () => {
  const muzzle = { x: 2, y: 3 };
  const impact = { x: 5, y: 7 };

  it('leaves the muzzle and lands on the impact point', () => {
    expect(siegeShellPose(muzzle, impact, 0)).toMatchObject({ x: 2, y: 3, height: 0 });
    const landed = siegeShellPose(muzzle, impact, 1);
    expect(landed.x).toBeCloseTo(5, 12);
    expect(landed.y).toBeCloseTo(7, 12);
    expect(landed.height).toBeCloseTo(0, 12);
  });

  it('lifts the shell above a shadow that runs straight along the ground', () => {
    const top = siegeShellPose(muzzle, impact, .5);
    expect(top.ground).toEqual({ x: 3.5, y: 5 });
    expect(top.height).toBeCloseTo(1, 12);
    expect(top.y).toBeCloseTo(5 - SHELL_ARC_HEIGHT, 12);
  });

  it('grows the shell with the Tower Level and swells it at the top of the arc', () => {
    expect(siegeShellRadius(1, 0)).toBeCloseTo(.1, 12);
    expect(siegeShellRadius(2, 0)).toBeCloseTo(.105, 12);
    expect(siegeShellRadius(5, 0)).toBeCloseTo(.12, 12);
    expect(siegeShellRadius(1, 1)).toBeCloseTo(.13, 12);
  });

  it('clamps progress outside the flight', () => {
    expect(siegeShellPose(muzzle, impact, -1)).toEqual(siegeShellPose(muzzle, impact, 0));
    expect(siegeShellPose(muzzle, impact, 2)).toEqual(siegeShellPose(muzzle, impact, 1));
  });
});
