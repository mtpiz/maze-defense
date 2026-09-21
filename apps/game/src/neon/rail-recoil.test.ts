import { describe, expect, it } from 'vitest';
import { kickBarrel, barrelOffset } from './rail-recoil.js';

describe('independent alternating Rail recoil', () => {
  it('fires left then right without moving the idle barrel', () => {
    const first = kickBarrel({ shots: 0, left: -1000, right: -1000 }, 0);
    expect(first).toEqual({ shots: 1, left: 0, right: -1000 });
    expect(barrelOffset(first.left, 0)).toBe(.17);
    expect(barrelOffset(first.right, 0)).toBe(0);
    expect(barrelOffset(first.left, 190)).toBe(0);
    const second = kickBarrel(first, 1000);
    expect(second).toEqual({ shots: 2, left: 0, right: 1000 });
    expect(barrelOffset(second.left, 1000)).toBe(0);
    expect(barrelOffset(second.right, 1000)).toBe(.17);
    expect(kickBarrel(second, 2000).left).toBe(2000);
  });
});
