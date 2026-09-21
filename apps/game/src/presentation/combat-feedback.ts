import type { PresentationEvent } from '@tower-defense/sim';

export const DAMAGE_LABEL_LIMIT = 8;

interface CombatLabel {
  readonly creepId: string;
  readonly text: string;
  readonly tone: 'damage' | 'armor' | 'leak';
  readonly xMilli: number;
  readonly yMilli: number;
  readonly value: number;
  readonly createdAt: number;
  readonly duration: number;
}

export class CombatFeedback {
  #damage: CombatLabel[] = [];
  #leak: CombatLabel | null = null;
  #lastSequence = 0;
  #lastTick = 0;

  consume(events: readonly PresentationEvent[], tick: number, now: number): void {
    if (tick < this.#lastTick) {
      this.#damage = [];
      this.#leak = null;
      this.#lastSequence = 0;
    }
    this.#lastTick = tick;
    this.#damage = this.#damage.filter((label) => now - label.createdAt < label.duration);
    for (const event of events) {
      if (event.sequence <= this.#lastSequence) continue;
      this.#lastSequence = event.sequence;
      if (event.type !== 'creep-damaged' && event.type !== 'creep-leaked') continue;
      const { xMilli, yMilli, damage, blockedDamage, lifeDamage, creepId } = event.payload;
      if (typeof xMilli !== 'number' || typeof yMilli !== 'number' || typeof creepId !== 'string') continue;
      if (event.type === 'creep-leaked' && typeof lifeDamage === 'number') {
        const previous = this.#leak;
        const value = lifeDamage + (previous !== null && now - previous.createdAt < previous.duration ? previous.value : 0);
        this.#leak = { creepId, text: `-${value} ${value === 1 ? 'Life' : 'Lives'}`, tone: 'leak',
          xMilli, yMilli, value, createdAt: now, duration: 1_200 };
      } else if (typeof damage === 'number') {
        const armored = typeof blockedDamage === 'number' && blockedDamage > 0;
        this.#damage = this.#damage.filter((label) => label.creepId !== creepId);
        this.#damage.push({ creepId, text: `${damage}${armored ? '\nArmor' : ''}`,
          tone: armored ? 'armor' : 'damage', xMilli, yMilli, value: damage, createdAt: now, duration: 800 });
        this.#damage = this.#damage.slice(-DAMAGE_LABEL_LIMIT);
      }
    }
  }

  snapshot(now: number): readonly (CombatLabel & { readonly progress: number })[] {
    const labels = this.#leak === null ? this.#damage : [...this.#damage, this.#leak];
    return labels.filter((label) => now - label.createdAt < label.duration)
      .map((label) => ({ ...label, progress: Math.max(0, (now - label.createdAt) / label.duration) }));
  }
}
