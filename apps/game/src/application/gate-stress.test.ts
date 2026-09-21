import { describe, expect, it } from 'vitest';
import { CombatFeedback, DAMAGE_LABEL_LIMIT } from '../presentation/combat-feedback.js';
import {
  SemanticFeedback,
  type SemanticCue,
  type SemanticFeedbackOutput,
} from '../platform/semantic-feedback.js';
import {
  GATE_STRESS_CREEP_COUNT,
  GATE_STRESS_TOWER_COUNT,
  createGateStressSession,
} from './gate-stress.js';

class RecordingOutput implements SemanticFeedbackOutput {
  readonly sounds: SemanticCue[] = [];
  readonly haptics: SemanticCue[] = [];
  playSound(cue: SemanticCue): void { this.sounds.push(cue); }
  vibrate(cue: SemanticCue): void { this.haptics.push(cue); }
}

describe('Gate stress fixture', () => {
  it('holds 100 active creeps under 40 firing towers at 3x with bounded feedback', () => {
    const session = createGateStressSession();
    const combatFeedback = new CombatFeedback();
    const output = new RecordingOutput();
    const semanticFeedback = new SemanticFeedback(output);
    const firingTowers = new Set<string>();
    let peakActiveCreeps = 0;
    let peakEventBatch = 0;
    let peakDamageLabels = 0;
    let totalEventCount = 0;

    expect(session.getUiSnapshot()).toMatchObject({ phase: 'wave', speed: 3 });
    expect(session.getRenderSnapshot().towers).toHaveLength(GATE_STRESS_TOWER_COUNT);

    for (let tick = 0; tick < 110; tick += 1) {
      expect(session.advance(1).advancedTicks).toBe(1);
      const snapshot = session.getRenderSnapshot();
      const events = session.drainPresentationEvents();
      totalEventCount += events.length;
      peakActiveCreeps = Math.max(peakActiveCreeps, snapshot.creeps.length);
      peakEventBatch = Math.max(peakEventBatch, events.length);
      for (const event of events) {
        if (event.type === 'tower-fired' && typeof event.payload.towerId === 'string') {
          firingTowers.add(event.payload.towerId);
        }
      }
      combatFeedback.consume(events, snapshot.tick, tick * 16);
      peakDamageLabels = Math.max(peakDamageLabels, combatFeedback.snapshot(tick * 16).length);
      semanticFeedback.consume(events, snapshot.tick, tick * 16, {
        effectsEnabled: true,
        hapticsEnabled: true,
      });
    }

    expect(peakActiveCreeps).toBeGreaterThanOrEqual(100);
    expect(peakActiveCreeps).toBeLessThanOrEqual(GATE_STRESS_CREEP_COUNT);
    expect(firingTowers).toHaveLength(GATE_STRESS_TOWER_COUNT);
    expect(peakEventBatch).toBeGreaterThan(100);
    expect(totalEventCount).toBeLessThanOrEqual(10_000);
    expect(peakDamageLabels).toBeLessThanOrEqual(DAMAGE_LABEL_LIMIT);
    expect(output.sounds).toEqual(['wave-start']);
    expect(output.haptics).toEqual(['wave-start']);
  });
});
