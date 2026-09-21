import { describe, expect, it } from 'vitest';
import type { PresentationEvent } from '@tower-defense/sim';
import { CombatFeedback, DAMAGE_LABEL_LIMIT } from './combat-feedback.js';

const event = (sequence: number, type: PresentationEvent['type'] = 'creep-damaged'): PresentationEvent => ({
  id: `mission:${sequence}`, sequence, tick: 10, type,
  payload: { creepId: `creep-${sequence}`, damage: 25, blockedDamage: 1, xMilli: 1_000, yMilli: 2_000, lifeDamage: 2 },
});

describe('bounded combat labels', () => {
  it('caps damage text while retaining a separate aggregated leak warning', () => {
    const feedback = new CombatFeedback();
    feedback.consume([event(1, 'creep-leaked'), ...Array.from({ length: 50 }, (_, i) => event(i + 2)), event(52, 'creep-leaked')], 10, 0);
    const labels = feedback.snapshot(0);
    expect(labels.filter(({ tone }) => tone !== 'leak')).toHaveLength(DAMAGE_LABEL_LIMIT);
    expect(labels.find(({ tone }) => tone === 'leak')).toMatchObject({ text: '-4 Lives', xMilli: 1_000, yMilli: 2_000 });
    expect(labels.some(({ text }) => text === '25\nArmor')).toBe(true);
  });

  it('does not duplicate events and expires labels by presentation time, independent of Mission Speed', () => {
    const feedback = new CombatFeedback();
    feedback.consume([event(1)], 10, 100);
    feedback.consume([event(1)], 100, 200);
    expect(feedback.snapshot(200)).toHaveLength(1);
    expect(feedback.snapshot(1_000)).toHaveLength(0);
  });

  it('resets on retry and accepts the new run event sequence', () => {
    const feedback = new CombatFeedback();
    feedback.consume([event(100)], 100, 0);
    feedback.consume([], 0, 10);
    expect(feedback.snapshot(10)).toEqual([]);
    feedback.consume([event(1)], 10, 20);
    expect(feedback.snapshot(20)).toHaveLength(1);
  });
});
