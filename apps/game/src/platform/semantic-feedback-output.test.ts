import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserSemanticFeedbackOutput } from './semantic-feedback.js';
import { AudioFixture } from '../test/feedback-fixture.js';

describe('BrowserSemanticFeedbackOutput', () => {
  let vibrations: (number | number[])[];

  beforeEach(() => {
    AudioFixture.instances = [];
    vibrations = [];
    vi.stubGlobal('window', { AudioContext: AudioFixture });
    vi.stubGlobal('document', { visibilityState: 'visible' });
    vi.stubGlobal('navigator', { vibrate: (pattern: number | number[]) => { vibrations.push(pattern); return true; } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('replaces an active voice when a terminal cue interrupts ordinary feedback', () => {
    const output = new BrowserSemanticFeedbackOutput();
    output.unlock();
    output.playSound('leak');
    output.playSound('defeat');
    expect(AudioFixture.current.voices.size).toBe(1);
  });

  it('stops an in-progress sound immediately when muted', () => {
    const output = new BrowserSemanticFeedbackOutput();
    output.unlock();
    output.playSound('victory');
    output.stopSound();
    expect(AudioFixture.current.voices.size).toBe(0);
  });

  it('cancels an active vibration even during a visibility transition', () => {
    const output = new BrowserSemanticFeedbackOutput();
    output.vibrate('defeat');
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    output.stopHaptics();
    expect(vibrations).toEqual([[70, 45, 110], 0]);
  });

  it('releases audio and cancels haptics when its owning UI is disposed', () => {
    const output = new BrowserSemanticFeedbackOutput();
    output.unlock();
    output.playSound('build');
    output.dispose();
    expect(AudioFixture.current.voices.size).toBe(0);
    expect(AudioFixture.current.state).toBe('closed');
    expect(vibrations).toEqual([0]);
  });

  it('does not start sound or vibration while hidden', () => {
    const output = new BrowserSemanticFeedbackOutput();
    output.unlock();
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    output.playSound('build');
    output.vibrate('build');
    expect(AudioFixture.current.voices.size).toBe(0);
    expect(vibrations).toEqual([]);
  });
});
