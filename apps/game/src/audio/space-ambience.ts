import type { SoundId } from './sound-catalog.js';

type Scheduler = (callback: () => void, delayMs: number) => number;
type Cancel = (handle: number) => void;

/**
 * Real-time space bed: a slow detuned drone, filtered "solar wind", and a pulsing tension layer
 * that rises with combat intensity. Occasional plasma-wave events (whistlers and chorus chirps)
 * are delegated to the engine so they share its voice budget.
 */
export class SpaceAmbience {
  readonly #output: GainNode;
  readonly #tension: GainNode;
  readonly #sources: AudioScheduledSourceNode[] = [];
  #started = false;
  #timer: number | null = null;
  #running = false;

  constructor(
    private readonly ctx: AudioContext,
    destination: AudioNode,
    private readonly playEvent: (id: SoundId, pan: number) => void,
    private readonly random: () => number = Math.random,
    private readonly schedule: Scheduler = (callback, delayMs) => window.setTimeout(callback, delayMs),
    private readonly cancel: Cancel = (handle) => window.clearTimeout(handle),
  ) {
    this.#output = ctx.createGain();
    this.#output.gain.value = 0;
    this.#output.connect(destination);

    // Drone: root, fifth, and a detuned octave under a slowly breathing low-pass.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 360;
    droneFilter.Q.value = 2;
    this.#lfo(0.043, 170, droneFilter.frequency);
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.22;
    droneFilter.connect(droneGain).connect(this.#output);
    for (const [type, frequency, detune] of [['sine', 55, 0], ['sine', 82.41, 4], ['triangle', 110, -7]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      osc.detune.value = detune;
      osc.connect(droneFilter);
      this.#sources.push(osc);
    }

    // Solar wind: looped noise through a wandering band-pass.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < data.length; index += 1) {
      brown = (brown + 0.02 * (this.random() * 2 - 1)) / 1.02;
      data[index] = brown * 3.5;
    }
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 650;
    windFilter.Q.value = 0.7;
    this.#lfo(0.027, 380, windFilter.frequency);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.35;
    wind.connect(windFilter).connect(windGain).connect(this.#output);
    this.#sources.push(wind);

    // Tension: a low pulsing saw pair that fades in while a wave is active.
    const tensionFilter = ctx.createBiquadFilter();
    tensionFilter.type = 'lowpass';
    tensionFilter.frequency.value = 240;
    tensionFilter.Q.value = 4;
    const pulse = ctx.createGain();
    pulse.gain.value = 0.5;
    this.#lfo(1.6, 0.5, pulse.gain);
    this.#tension = ctx.createGain();
    this.#tension.gain.value = 0;
    tensionFilter.connect(pulse).connect(this.#tension).connect(this.#output);
    for (const detune of [-10, 10]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 41.2;
      osc.detune.value = detune;
      osc.connect(tensionFilter);
      this.#sources.push(osc);
    }
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    if (!this.#started) {
      for (const source of this.#sources) source.start();
      this.#started = true;
    }
    this.#fade(1, 2.5);
    this.#queueEvent(4_000);
  }

  stop(): void {
    if (!this.#running) return;
    this.#running = false;
    this.#fade(0, 0.6);
    if (this.#timer !== null) this.cancel(this.#timer);
    this.#timer = null;
  }

  /** 0 = calm planning, 1 = full wave. */
  setIntensity(value: number): void {
    const target = Math.max(0, Math.min(1, value)) * 0.3;
    this.#tension.gain.setTargetAtTime(target, this.ctx.currentTime, 1.2);
  }

  dispose(): void {
    this.stop();
    for (const source of this.#sources) {
      try {
        if (this.#started) source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
    }
    this.#output.disconnect();
  }

  #fade(target: number, seconds: number): void {
    const now = this.ctx.currentTime;
    this.#output.gain.cancelScheduledValues(now);
    this.#output.gain.setValueAtTime(this.#output.gain.value, now);
    this.#output.gain.linearRampToValueAtTime(target, now + seconds);
  }

  #lfo(frequency: number, depth: number, param: AudioParam): void {
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = frequency;
    const amount = this.ctx.createGain();
    amount.gain.value = depth;
    lfo.connect(amount).connect(param);
    this.#sources.push(lfo);
  }

  #queueEvent(delayMs: number): void {
    this.#timer = this.schedule(() => {
      if (!this.#running) return;
      this.playEvent(this.random() < 0.55 ? 'amb-whistler' : 'amb-chorus', (this.random() * 2 - 1) * 0.8);
      this.#queueEvent(7_000 + this.random() * 9_000);
    }, delayMs);
  }
}
