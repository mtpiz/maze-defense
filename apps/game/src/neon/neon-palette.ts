import type { TowerFamilyId } from '@tower-defense/content';

export const TOWER_COLORS: Record<TowerFamilyId, number> = {
  foundation: 0x6f8f92,
  rail: 0x48cfff,
  siege: 0xffce39,
  arc: 0xed66ff,
  gravity: 0x77f0c7,
};

const mixTowardWhite = (channel: number): number => Math.round(channel + (255 - channel) * 0.25);

export function projectileColors(family: TowerFamilyId): { color: number; core: number } {
  const color = TOWER_COLORS[family];
  const red = mixTowardWhite(color >> 16 & 0xff);
  const green = mixTowardWhite(color >> 8 & 0xff);
  const blue = mixTowardWhite(color & 0xff);
  const core = red << 16 | green << 8 | blue;
  return { color, core };
}
