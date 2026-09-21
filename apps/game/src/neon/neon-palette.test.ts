import { describe, expect, it } from 'vitest';
import type { TowerFamilyId } from '@tower-defense/content';
import { projectileColors, TOWER_COLORS } from './neon-palette.js';

const families: readonly TowerFamilyId[] = ['foundation', 'rail', 'siege', 'arc', 'gravity'];

const expectedColors: Record<TowerFamilyId, number> = {
  foundation: 0x6f8f92,
  rail: 0x48cfff,
  siege: 0xffce39,
  arc: 0xed66ff,
  gravity: 0x77f0c7,
};

const expectedCores: Record<TowerFamilyId, number> = {
  foundation: 0x93abad,
  rail: 0x76dbff,
  siege: 0xffda6b,
  arc: 0xf28cff,
  gravity: 0x99f4d5,
};

const channels = (color: number): readonly number[] => [
  color >> 16 & 0xff,
  color >> 8 & 0xff,
  color & 0xff,
];

describe('neon palette', () => {
  it('uses the canonical identity color for every tower family', () => {
    for (const family of families) {
      expect(TOWER_COLORS[family]).toBe(expectedColors[family]);
      expect(projectileColors(family).color).toBe(expectedColors[family]);
    }
  });

  it('uses the exact 25 percent white tint for every projectile core', () => {
    for (const family of families) {
      expect(projectileColors(family).core).toBe(expectedCores[family]);
    }
  });

  it('retains the source channel ordering and never becomes white', () => {
    for (const family of families) {
      const source = channels(TOWER_COLORS[family]);
      const core = channels(projectileColors(family).core);

      for (let left = 0; left < source.length; left += 1) {
        for (let right = left + 1; right < source.length; right += 1) {
          expect(Math.sign(core[left]! - core[right]!)).toBe(Math.sign(source[left]! - source[right]!));
        }
      }
      expect(projectileColors(family).core).not.toBe(0xffffff);
    }
  });
});
