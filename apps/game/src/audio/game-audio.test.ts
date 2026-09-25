import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from './game-audio.js';
import { MAX_VOICES, SOUND_CATALOG, SOUND_IDS } from './sound-catalog.js';

// Minimal Web Audio stand-in: every node accepts any param call; buffer sources track playback.
const param = () => ({
  value: 0,
  setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
  setTargetAtTime() {}, cancelScheduledValues() {},
});
const node = (): Record<string, unknown> => {
  const target: Record<string, unknown> = { connect: (next: unknown) => next, disconnect() {} };
  return new Proxy(target, {
    get: (object, key: string) => {
      if (!(key in object)) object[key] = ['start', 'stop'].includes(key) ? () => {} : param();
      return object[key];
    },
  });
};

class FakeBuffer {
  constructor(readonly length: number) {}
  readonly duration = 1;
  getChannelData() { return new Float32Array(this.length); }
}

class FakeContext {
  static current: FakeContext;
  state = 'running';
  readonly sampleRate = 8_000;
  readonly currentTime = 0;
  readonly destination = node();
  readonly playing = new Set<object>();
  constructor() { FakeContext.current = this; }
  createBuffer(_channels: number, length: number) { return new FakeBuffer(length); }
  createBufferSource() {
    const source = node();
    source.start = () => { this.playing.add(source); };
    source.stop = () => { this.playing.delete(source); };
    return source;
  }
  createGain() { return node(); }
  createStereoPanner() { return node(); }
  createBiquadFilter() { return node(); }
  createOscillator() { return node(); }
  createWaveShaper() { return node(); }
  createDynamicsCompressor() { return node(); }
  createAnalyser() { return node(); }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.state = 'closed'; }
}

class FakeOffline extends FakeContext {
  constructor(_channels: number, readonly length: number) { super(); }
  async startRendering() { return new FakeBuffer(this.length); }
}

const settle = async () => {
  for (let index = 0; index < SOUND_IDS.length * 3; index += 1) await Promise.resolve();
};

describe('GameAudio', () => {
  let live: FakeContext;
  beforeEach(() => {
    vi.stubGlobal('window', {
      AudioContext: class extends FakeContext { constructor() { super(); live = this; } },
      setTimeout: () => 0,
      clearTimeout: () => {},
    });
    vi.stubGlobal('OfflineAudioContext', FakeOffline);
  });
  afterEach(() => vi.unstubAllGlobals());

  const unlocked = async (effectsEnabled = true) => {
    const audio = new GameAudio({ effectsEnabled, musicEnabled: false });
    audio.unlock();
    await settle();
    return audio;
  };

  it('bakes the whole bank after unlock', async () => {
    const audio = await unlocked();
    expect(audio.ready).toBe(true);
    audio.play('wave-start');
    expect(audio.activeVoices).toBe(1);
  });

  it('caps repeats of one sound at its voice limit', async () => {
    const audio = await unlocked();
    for (let index = 0; index < 10; index += 1) audio.play('rail-fire');
    expect(audio.activeVoices).toBe(SOUND_CATALOG['rail-fire'].maxVoices);
  });

  it('keeps the whole mix inside the voice budget and lets alerts steal from combat', async () => {
    const audio = await unlocked();
    const combat = SOUND_IDS.filter((id) => SOUND_CATALOG[id].bus === 'combat');
    for (let round = 0; round < 4; round += 1) for (const id of combat) audio.play(id);
    expect(audio.activeVoices).toBe(MAX_VOICES);
    audio.play('leak');
    expect(audio.activeVoices).toBe(MAX_VOICES);
    audio.play('broodling-death');
    expect(audio.activeVoices).toBe(MAX_VOICES);
    expect(live.playing.size).toBe(MAX_VOICES);
  });

  it('stays silent when effects are off and stops effects when switched off', async () => {
    const muted = await unlocked(false);
    muted.play('build');
    expect(muted.activeVoices).toBe(0);
    const audio = await unlocked();
    audio.play('build');
    audio.setPreferences({ effectsEnabled: false, musicEnabled: false });
    expect(audio.activeVoices).toBe(0);
  });

  it('stops sound while hidden and closes its context on dispose', async () => {
    const audio = await unlocked();
    audio.play('victory');
    audio.setVisible(false);
    expect(audio.activeVoices).toBe(0);
    audio.play('victory');
    expect(audio.activeVoices).toBe(0);
    audio.dispose();
    await settle();
    expect(live.state).toBe('closed');
  });
});
