import type { PresentationEvent, PresentationEventType } from '@tower-defense/sim';

export type SemanticCue =
  | 'build'
  | 'specialist'
  | 'wave-start'
  | 'wave-clear'
  | 'leak'
  | 'victory'
  | 'defeat';

export interface SemanticFeedbackPreferences {
  readonly effectsEnabled: boolean;
  readonly hapticsEnabled: boolean;
}

export interface SemanticFeedbackOutput {
  playSound(cue: SemanticCue): void;
  vibrate(cue: SemanticCue): void;
}

const CUES: Readonly<Partial<Record<PresentationEventType, SemanticCue>>> = Object.freeze({
  construction: 'build',
  'specialist-installed': 'specialist',
  'wave-started': 'wave-start',
  'early-launched': 'wave-start',
  'creep-leaked': 'leak',
  'wave-completed': 'wave-clear',
  'mission-completed': 'victory',
  'mission-defeated': 'defeat',
});

const PRIORITY: Readonly<Record<SemanticCue, number>> = Object.freeze({
  build: 10,
  specialist: 20,
  'wave-start': 30,
  'wave-clear': 40,
  leak: 50,
  victory: 60,
  defeat: 70,
});

const REPEAT_COOLDOWN_MILLISECONDS = 500;
const CHANNEL_COOLDOWN_MILLISECONDS = 200;

export class SemanticFeedback {
  #lastSequence = 0;
  #lastTick = 0;
  readonly #soundTimes = new Map<SemanticCue, number>();
  readonly #hapticTimes = new Map<SemanticCue, number>();
  #lastSoundAt = -Infinity;
  #lastHapticAt = -Infinity;

  constructor(private readonly output: SemanticFeedbackOutput) {}

  consume(
    events: readonly PresentationEvent[],
    tick: number,
    now: number,
    preferences: SemanticFeedbackPreferences,
  ): void {
    if (tick < this.#lastTick) {
      this.#lastSequence = 0;
      this.#soundTimes.clear();
      this.#hapticTimes.clear();
      this.#lastSoundAt = -Infinity;
      this.#lastHapticAt = -Infinity;
    }
    this.#lastTick = tick;

    let selected: SemanticCue | null = null;
    for (const event of events) {
      if (event.sequence <= this.#lastSequence) continue;
      this.#lastSequence = event.sequence;
      const cue = CUES[event.type];
      if (cue !== undefined && (selected === null || PRIORITY[cue] > PRIORITY[selected])) {
        selected = cue;
      }
    }
    if (selected === null) return;

    if (preferences.effectsEnabled && this.#canPlay(selected, now, this.#soundTimes, this.#lastSoundAt)) {
      this.output.playSound(selected);
      this.#soundTimes.set(selected, now);
      this.#lastSoundAt = now;
    }
    if (preferences.hapticsEnabled && this.#canPlay(selected, now, this.#hapticTimes, this.#lastHapticAt)) {
      this.output.vibrate(selected);
      this.#hapticTimes.set(selected, now);
      this.#lastHapticAt = now;
    }
  }

  #canPlay(cue: SemanticCue, now: number, times: ReadonlyMap<SemanticCue, number>, lastAt: number): boolean {
    if (now - (times.get(cue) ?? -Infinity) < REPEAT_COOLDOWN_MILLISECONDS) return false;
    // Results may interrupt ordinary feedback; the output still owns only one active voice.
    return cue === 'victory' || cue === 'defeat' || now - lastAt >= CHANNEL_COOLDOWN_MILLISECONDS;
  }
}

const SOUND: Readonly<Record<SemanticCue, {
  readonly frequency: number;
  readonly endFrequency: number;
  readonly duration: number;
  readonly type: OscillatorType;
}>> = Object.freeze({
  build: { frequency: 260, endFrequency: 330, duration: 0.07, type: 'triangle' },
  specialist: { frequency: 390, endFrequency: 560, duration: 0.12, type: 'triangle' },
  'wave-start': { frequency: 520, endFrequency: 440, duration: 0.12, type: 'sine' },
  'wave-clear': { frequency: 520, endFrequency: 720, duration: 0.16, type: 'sine' },
  leak: { frequency: 150, endFrequency: 95, duration: 0.18, type: 'sawtooth' },
  victory: { frequency: 620, endFrequency: 880, duration: 0.28, type: 'triangle' },
  defeat: { frequency: 130, endFrequency: 70, duration: 0.32, type: 'sawtooth' },
});

const HAPTIC: Readonly<Record<SemanticCue, number | readonly number[]>> = Object.freeze({
  build: 12,
  specialist: Object.freeze([18, 28, 24]),
  'wave-start': 18,
  'wave-clear': Object.freeze([14, 30, 28]),
  leak: Object.freeze([35, 35, 35]),
  victory: Object.freeze([20, 35, 25, 35, 45]),
  defeat: Object.freeze([70, 45, 110]),
});

export class BrowserSemanticFeedbackOutput implements SemanticFeedbackOutput {
  #audioContext: AudioContext | null = null;
  #activeVoice: { oscillator: OscillatorNode; gain: GainNode } | null = null;
  #unlocked = false;

  unlock(): void {
    if (this.#audioContext === null && typeof window.AudioContext === 'function') {
      try {
        this.#audioContext = new window.AudioContext();
      } catch {
        return;
      }
    }
    this.#unlocked = this.#audioContext !== null;
    if (this.#audioContext?.state === 'suspended') {
      void this.#audioContext.resume().catch(() => undefined);
    }
  }

  playSound(cue: SemanticCue): void {
    const context = this.#audioContext;
    if (!this.#unlocked || context?.state !== 'running' || document.visibilityState !== 'visible') return;
    this.stopSound();
    const sound = SOUND[cue];
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(sound.endFrequency, start + sound.duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.055, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + sound.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (this.#activeVoice?.oscillator === oscillator) this.#activeVoice = null;
    };
    this.#activeVoice = { oscillator, gain };
    oscillator.start(start);
    oscillator.stop(start + sound.duration);
  }

  vibrate(cue: SemanticCue): void {
    if (document.visibilityState !== 'visible' || typeof navigator.vibrate !== 'function') return;
    const pattern = HAPTIC[cue];
    try {
      navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    } catch {
      // Unsupported vibration patterns should not interrupt play.
    }
  }

  stopSound(): void {
    const voice = this.#activeVoice;
    if (voice === null) return;
    this.#activeVoice = null;
    voice.oscillator.onended = null;
    voice.oscillator.stop();
    voice.oscillator.disconnect();
    voice.gain.disconnect();
  }

  stopHaptics(): void {
    if (typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(0);
    } catch {
      // Some hosts expose vibration but do not support it.
    }
  }

  dispose(): void {
    this.stopSound();
    this.stopHaptics();
    void this.#audioContext?.close().catch(() => undefined);
    this.#audioContext = null;
    this.#unlocked = false;
  }
}
