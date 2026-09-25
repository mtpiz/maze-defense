import type { CreepDefinition, WeaponDefinition } from '@tower-defense/content';

const TICKS_PER_SECOND = 30;

/** Damage one hit lands on this creep, mirroring the sim's flat-Armor rule (minimum 1). */
export const damagePerHit = (weapon: WeaponDefinition, creep: CreepDefinition): number =>
  Math.max(1, weapon.damage - Math.max(0, creep.armor - weapon.armorPiercing));

export const hitsToKill = (weapon: WeaponDefinition, creep: CreepDefinition): number =>
  Math.ceil(creep.maxHealth / damagePerHit(weapon, creep));

/** Share of listed weapon damage that survives Armor (1 = unmitigated). */
export const armorEfficiency = (weapon: WeaponDefinition, creep: CreepDefinition): number =>
  damagePerHit(weapon, creep) / weapon.damage;

/** Share of landed damage wasted on the killing hit (overkill), single target, full health. */
export const overkillShare = (weapon: WeaponDefinition, creep: CreepDefinition): number => {
  const perHit = damagePerHit(weapon, creep);
  const landed = hitsToKill(weapon, creep) * perHit;
  return (landed - creep.maxHealth) / landed;
};

/** Useful single-target damage per second, before multi-target mechanics. */
export const sustainedDps = (weapon: WeaponDefinition, creep: CreepDefinition): number => {
  if (!weapon.targets[creep.layer]) return 0;
  return (damagePerHit(weapon, creep) * TICKS_PER_SECOND) / weapon.cooldownTicks;
};
