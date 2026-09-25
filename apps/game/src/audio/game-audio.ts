import { MAX_VOICES, SOUND_CATALOG, type SoundBus, type SoundId } from './sound-catalog.js';
import { bakeSoundBank } from './sound-bank.js';
import type { SoundRequest } from './audio-director.js';
import { SpaceAmbience } from './space-ambience.js';

export interface GameAudioPreferences {
  readonly effectsEnabled: boolean;
  readonly musicEnabled: boolean;
}

interface Voice {
  readonly id: SoundId;
  readonly priority: number;
  readonly startedAt: number;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly panner: StereoPannerNode;
}

const BUS_LEVELS: Readonly<Record<SoundBus, number>> = Object.freeze({
  combat: 0.75,
  interface: 0.9,
  alert: 1,
  ambience: 0.55,
});

/**
 * Web Audio runtime for the game. Owns one AudioContext, a baked buffer bank, a bounded voice pool,
 * four buses into a master limiter, and the space ambience. Must be unlocked from a user gesture.
 */
export class GameAudio {
  #ctx: AudioContext | null = null;
  #buses: Record<SoundBus, GainNode> | null = null;
  #master: GainNode | null = null;
  #ambience: SpaceAmbience | null = null;
  readonly #buffers = new Map<SoundId, AudioBuffer>();
  #voices: Voice[] = [];
  #disposed = false;
  #visible = true;
  #preferences: GameAudioPreferences;
  #volume = 0.9;
  #intensity = 0;
  #limiter: DynamicsCompressorNode | null = null;

  constructor(preferences: GameAudioPreferences) {
    this.#preferences = preferences;
  }

  get ready(): boolean {
    return this.#ctx?.state === 'running' && this.#buffers.size > 0;
  }

  /** Call from a pointer or key handler; browsers only start audio inside a user gesture. */
  unlock(): void {
    if (this.#disposed) return;
    if (this.#ctx === null) {
      if (typeof window.AudioContext !== 'function') return;
      try {
        this.#ctx = new window.AudioContext({ latencyHint: 'interactive' });
      } catch {
        return;
      }
      this.#buildGraph(this.#ctx);
      void bakeSoundBank(this.#ctx.sampleRate, (id, buffer) => this.#buffers.set(id, buffer), () => this.#disposed)
        .catch(() => undefined);
    }
    if (this.#ctx.state === 'suspended' && this.#visible) void this.#ctx.resume().catch(() => undefined);
    this.#applyPreferences();
  }

  setPreferences(preferences: GameAudioPreferences): void {
    this.#preferences = preferences;
    if (!preferences.effectsEnabled) this.stopEffects();
    this.#applyPreferences();
  }

  /** Analyser on the final mix, for meters and the Sound Lab scope. Null until unlocked. */
  createAnalyser(): AnalyserNode | null {
    if (this.#ctx === null || this.#limiter === null) return null;
    const analyser = this.#ctx.createAnalyser();
    analyser.fftSize = 2_048;
    this.#limiter.connect(analyser);
    return analyser;
  }

  get activeVoices(): number {
    return this.#voices.length;
  }

  /** Master output level, 0 to 1. */
  setMasterVolume(value: number): void {
    this.#volume = Math.max(0, Math.min(1, value));
    const master = this.#master;
    if (master !== null && this.#ctx !== null) master.gain.setTargetAtTime(this.#volume, this.#ctx.currentTime, 0.03);
  }

  /** 0 = calm (planning), 1 = active wave. */
  setIntensity(value: number): void {
    if (value === this.#intensity) return;
    this.#intensity = value;
    this.#ambience?.setIntensity(value);
  }

  setVisible(visible: boolean): void {
    this.#visible = visible;
    const ctx = this.#ctx;
    if (ctx === null || ctx.state === 'closed') return;
    if (visible) void ctx.resume().catch(() => undefined);
    else {
      this.stopEffects();
      void ctx.suspend().catch(() => undefined);
    }
  }

  playAll(requests: readonly SoundRequest[]): void {
    for (const request of requests) this.play(request.id, request.pan, request.gain);
  }

  play(id: SoundId, pan = 0, gain = 1): void {
    const ctx = this.#ctx;
    const buffer = this.#buffers.get(id);
    const spec = SOUND_CATALOG[id];
    if (ctx === null || this.#buses === null || buffer === undefined || ctx.state !== 'running' || !this.#visible) return;
    if (spec.bus === 'ambience' ? !this.#preferences.musicEnabled : !this.#preferences.effectsEnabled) return;

    const sameSound = this.#voices.filter((voice) => voice.id === id);
    if (sameSound.length >= spec.maxVoices) this.#release(sameSound[0]!);
    if (this.#voices.length >= MAX_VOICES) {
      const victim = this.#voices.reduce((lowest, voice) =>
        voice.priority < lowest.priority || (voice.priority === lowest.priority && voice.startedAt < lowest.startedAt)
          ? voice : lowest);
      if (victim.priority > spec.priority) return;
      this.#release(victim);
    }

    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1 + (Math.random() * 2 - 1) * spec.pitchJitter;
    const voiceGain = ctx.createGain();
    voiceGain.gain.value = spec.gain * gain;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(voiceGain).connect(panner).connect(this.#buses[spec.bus]);
    const voice: Voice = { id, priority: spec.priority, startedAt: now, source, gain: voiceGain, panner };
    source.onended = () => {
      this.#forget(voice);
      this.#disconnect(voice);
    };
    this.#voices.push(voice);
    source.start(now);
  }

  stopEffects(): void {
    for (const voice of [...this.#voices]) {
      if (SOUND_CATALOG[voice.id].bus !== 'ambience') this.#release(voice);
    }
  }

  dispose(): void {
    this.#disposed = true;
    for (const voice of [...this.#voices]) this.#release(voice);
    this.#ambience?.dispose();
    this.#ambience = null;
    void this.#ctx?.close().catch(() => undefined);
    this.#ctx = null;
    this.#buses = null;
  }

  #buildGraph(ctx: AudioContext): void {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    this.#limiter = limiter;
    this.#master = ctx.createGain();
    this.#master.gain.value = this.#volume;
    this.#master.connect(limiter).connect(ctx.destination);
    const bus = (level: number): GainNode => {
      const node = ctx.createGain();
      node.gain.value = level;
      node.connect(this.#master!);
      return node;
    };
    this.#buses = {
      combat: bus(BUS_LEVELS.combat),
      interface: bus(BUS_LEVELS.interface),
      alert: bus(BUS_LEVELS.alert),
      ambience: bus(BUS_LEVELS.ambience),
    };
    this.#ambience = new SpaceAmbience(ctx, this.#buses.ambience, (id, pan) => this.play(id, pan));
    this.#ambience.setIntensity(this.#intensity);
  }

  #applyPreferences(): void {
    if (this.#ambience === null) return;
    if (this.#preferences.musicEnabled) this.#ambience.start();
    else this.#ambience.stop();
  }

  #release(voice: Voice): void {
    const ctx = this.#ctx;
    voice.source.onended = null;
    this.#forget(voice);
    try {
      if (ctx !== null && ctx.state === 'running') {
        const now = ctx.currentTime;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(0, now, 0.006);
        voice.source.stop(now + 0.03);
        voice.source.onended = () => this.#disconnect(voice);
        return;
      }
      voice.source.stop();
    } catch {
      // Source may already have ended.
    }
    this.#disconnect(voice);
  }

  #forget(voice: Voice): void {
    this.#voices = this.#voices.filter((candidate) => candidate !== voice);
  }

  #disconnect(voice: Voice): void {
    voice.source.disconnect();
    voice.gain.disconnect();
    voice.panner.disconnect();
  }
}
