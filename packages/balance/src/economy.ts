import type { MissionDefinition } from '@tower-defense/sim';

export interface WaveBudget {
  readonly waveId: string;
  /** Credits the player can have spent before this wave starts (opening + prior allotments + prior bounties). */
  readonly creditsBeforeWave: number;
  readonly waveEffectiveHealth: number;
  readonly waveBounty: number;
  /** Wave health per available credit. Watch the curve's shape, not the absolute value. */
  readonly healthPerCredit: number;
}

/** Guaranteed-income ledger assuming every creep dies (upper bound on bounties). */
export const buildCreditLedger = (definition: MissionDefinition): readonly WaveBudget[] => {
  let credits = definition.openingFieldCredits;
  return definition.waves.map((wave) => {
    let health = 0;
    let bounty = 0;
    for (const group of wave.groups) {
      const creep = definition.creeps[group.creepId];
      if (creep === undefined) throw new Error(`Wave ${wave.id} uses undefined creep ${group.creepId}`);
      health += creep.maxHealth * group.count;
      bounty += creep.fieldCreditBounty * group.count;
    }
    const row = Object.freeze({
      waveId: wave.id,
      creditsBeforeWave: credits,
      waveEffectiveHealth: health,
      waveBounty: bounty,
      healthPerCredit: Math.round((health / credits) * 100) / 100,
    });
    credits += (wave.fieldCreditAllotment ?? 0) + bounty;
    return row;
  });
};
