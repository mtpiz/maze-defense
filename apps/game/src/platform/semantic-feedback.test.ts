import { describe, expect, it } from 'vitest';
import type { PresentationEvent } from '@tower-defense/sim';
import {
  SemanticFeedback,
  type SemanticCue,
  type SemanticFeedbackOutput,
} from './semantic-feedback.js';

const event = (sequence: number, type: PresentationEvent['type']): PresentationEvent => Object.freeze({
  id: `test:${sequence}`,
  sequence,
  tick: sequence,
  type,
  payload: Object.freeze({}),
});

class RecordingOutput implements SemanticFeedbackOutput {
  readonly sounds: SemanticCue[] = [];
  readonly haptics: SemanticCue[] = [];

  playSound(cue: SemanticCue): void {
    this.sounds.push(cue);
  }

  vibrate(cue: SemanticCue): void {
    this.haptics.push(cue);
  }
}

describe('SemanticFeedback', () => {
  it('chooses one highest-priority semantic cue and ignores ordinary combat events', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);

    feedback.consume([
      event(1, 'tower-fired'),
      event(2, 'construction'),
      event(3, 'creep-damaged'),
      event(4, 'wave-started'),
      event(5, 'creep-leaked'),
    ], 5, 1_000, { effectsEnabled: true, hapticsEnabled: true });

    expect(output.sounds).toEqual(['leak']);
    expect(output.haptics).toEqual(['leak']);
  });

  it('supports independent effects and haptics controls', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);

    feedback.consume([event(1, 'specialist-installed')], 1, 1_000, {
      effectsEnabled: false,
      hapticsEnabled: true,
    });
    feedback.consume([event(2, 'wave-completed')], 2, 2_000, {
      effectsEnabled: true,
      hapticsEnabled: false,
    });

    expect(output.sounds).toEqual(['wave-clear']);
    expect(output.haptics).toEqual(['specialist']);
  });

  it('rate-limits repeated leaks and does not replay duplicate events', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);
    const enabled = { effectsEnabled: true, hapticsEnabled: true } as const;

    feedback.consume([event(1, 'creep-leaked')], 1, 1_000, enabled);
    feedback.consume([event(1, 'creep-leaked')], 2, 1_100, enabled);
    feedback.consume([event(2, 'creep-leaked')], 2, 1_200, enabled);
    feedback.consume([event(3, 'creep-leaked')], 3, 1_600, enabled);

    expect(output.sounds).toEqual(['leak', 'leak']);
    expect(output.haptics).toEqual(['leak', 'leak']);
  });

  it('accepts a fresh event sequence after retry rewinds the Mission tick', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);
    const enabled = { effectsEnabled: true, hapticsEnabled: true } as const;

    feedback.consume([event(9, 'mission-completed')], 90, 1_000, enabled);
    feedback.consume([event(1, 'construction')], 0, 2_000, enabled);

    expect(output.sounds).toEqual(['victory', 'build']);
    expect(output.haptics).toEqual(['victory', 'build']);
  });

  it('keeps per-cue cooldowns when build and leak events alternate', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);
    const enabled = { effectsEnabled: true, hapticsEnabled: true } as const;

    feedback.consume([event(1, 'construction')], 1, 1_000, enabled);
    feedback.consume([event(2, 'creep-leaked')], 2, 1_200, enabled);
    feedback.consume([event(3, 'construction')], 3, 1_400, enabled);
    expect(output.sounds).toEqual(['build', 'leak']);
    expect(output.haptics).toEqual(['build', 'leak']);

    feedback.consume([event(4, 'construction')], 4, 1_500, enabled);
    expect(output.sounds).toEqual(['build', 'leak', 'build']);
    expect(output.haptics).toEqual(['build', 'leak', 'build']);
  });

  it('bounds rapid different cues without extending the budget for suppressed events', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);
    const enabled = { effectsEnabled: true, hapticsEnabled: true } as const;

    feedback.consume([event(1, 'construction')], 1, 1_000, enabled);
    feedback.consume([event(2, 'specialist-installed')], 2, 1_050, enabled);
    feedback.consume([event(3, 'wave-started')], 3, 1_100, enabled);
    feedback.consume([event(4, 'creep-leaked')], 4, 1_199, enabled);
    feedback.consume([event(5, 'creep-leaked')], 5, 1_200, enabled);

    expect(output.sounds).toEqual(['build', 'leak']);
    expect(output.haptics).toEqual(['build', 'leak']);
  });

  it.each([
    ['mission-completed', 'victory'],
    ['mission-defeated', 'defeat'],
  ] as const)('lets %s interrupt the ordinary cue budget', (type, cue) => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);
    const enabled = { effectsEnabled: true, hapticsEnabled: true } as const;

    feedback.consume([event(1, 'creep-leaked')], 1, 1_000, enabled);
    feedback.consume([event(2, type)], 2, 1_010, enabled);

    expect(output.sounds).toEqual(['leak', cue]);
    expect(output.haptics).toEqual(['leak', cue]);
  });

  it('does not consume a muted channel budget or replay its old events on unmute', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);

    feedback.consume([event(1, 'construction')], 1, 1_000, { effectsEnabled: false, hapticsEnabled: true });
    feedback.consume([event(1, 'construction')], 1, 1_050, { effectsEnabled: true, hapticsEnabled: false });
    expect(output.sounds).toEqual([]);
    feedback.consume([event(2, 'construction')], 2, 1_100, { effectsEnabled: true, hapticsEnabled: false });
    expect(output.sounds).toEqual(['build']);
    expect(output.haptics).toEqual(['build']);
  });

  it('resets both cue budgets on retry even before the old cooldown expires', () => {
    const output = new RecordingOutput();
    const feedback = new SemanticFeedback(output);
    const enabled = { effectsEnabled: true, hapticsEnabled: true } as const;

    feedback.consume([event(9, 'construction')], 90, 1_000, enabled);
    feedback.consume([event(1, 'construction')], 0, 1_010, enabled);
    expect(output.sounds).toEqual(['build', 'build']);
    expect(output.haptics).toEqual(['build', 'build']);
  });
});
