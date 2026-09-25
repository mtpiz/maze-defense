import type { SoundId } from './sound-catalog.js';

/**
 * Synthesis recipes. Each one schedules Web Audio nodes from time 0 into `out` and is rendered once
 * through an OfflineAudioContext, so runtime playback only costs a buffer source, gain, and panner.
 *
 * Design language:
 * - Player Technology is clean and tuned: sine/saw sweeps, metallic partials, tight envelopes.
 *   Rail borrows Ben Burtt's struck-cable blaster: a dispersive downward chirp over a metallic ring.
 * - The Brood is organic: band-passed noise formants, wet pops, chitter, crunchy shell cracks.
 * - Space alerts borrow plasma-wave character: descending "whistlers" and rising "chorus" chirps
 *   heard in spacecraft plasma-wave recordings.
 */
export type Rng = () => number;
export type SoundRecipe = (ctx: BaseAudioContext, out: AudioNode, rng: Rng) => void;

const FLOOR = 0.0001;

/** Small deterministic PRNG so a baked bank is identical on every launch and in tests. */
export const seededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const chain = (...nodes: AudioNode[]): AudioNode => {
  for (let index = 1; index < nodes.length; index += 1) nodes[index - 1]!.connect(nodes[index]!);
  return nodes[nodes.length - 1]!;
};

const osc = (ctx: BaseAudioContext, type: OscillatorType, frequency: number, start = 0, stop = 1): OscillatorNode => {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.setValueAtTime(frequency, 0);
  node.start(start);
  node.stop(stop);
  return node;
};

const glide = (param: AudioParam, from: number, to: number, start: number, duration: number): void => {
  param.setValueAtTime(Math.max(from, FLOOR), start);
  param.exponentialRampToValueAtTime(Math.max(to, FLOOR), start + duration);
};

/** Percussive envelope: linear attack to `peak`, exponential decay to silence. */
const env = (ctx: BaseAudioContext, peak: number, attack: number, decay: number, start = 0): GainNode => {
  const gain = ctx.createGain();
  const top = start + Math.max(attack, 0.001);
  gain.gain.setValueAtTime(0, 0);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, top);
  gain.gain.exponentialRampToValueAtTime(FLOOR, top + decay);
  gain.gain.setValueAtTime(0, top + decay);
  return gain;
};

const filter = (ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode => {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.setValueAtTime(frequency, 0);
  node.Q.setValueAtTime(q, 0);
  return node;
};

const gainNode = (ctx: BaseAudioContext, value: number): GainNode => {
  const node = ctx.createGain();
  node.gain.setValueAtTime(value, 0);
  return node;
};

/** Routes `source` through a depth gain into an AudioParam (LFOs, vibrato, gating). */
const modulate = (ctx: BaseAudioContext, source: AudioNode, depth: number, param: AudioParam): void => {
  source.connect(gainNode(ctx, depth)).connect(param);
};

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
const noise = (ctx: BaseAudioContext, rng: Rng, start = 0, stop = 1): AudioBufferSourceNode => {
  let buffer = noiseBuffers.get(ctx);
  if (buffer === undefined) {
    buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = rng() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = buffer.duration;
  source.start(start, rng() * 1.5);
  source.stop(stop);
  return source;
};

const curves = new Map<number, Float32Array<ArrayBuffer>>();
/** Soft tanh saturation used for grit on impacts and Brood shells. */
const drive = (ctx: BaseAudioContext, amount: number): WaveShaperNode => {
  let curve = curves.get(amount);
  if (curve === undefined) {
    curve = new Float32Array(1024);
    const norm = Math.tanh(amount);
    for (let index = 0; index < curve.length; index += 1) {
      const x = (index / (curve.length - 1)) * 2 - 1;
      curve[index] = Math.tanh(x * amount) / norm;
    }
    curves.set(amount, curve);
  }
  const node = ctx.createWaveShaper();
  node.curve = curve;
  node.oversample = '2x';
  return node;
};

/** Short high-passed noise click that gives a sound a crisp onset. */
const click = (ctx: BaseAudioContext, out: AudioNode, rng: Rng, start: number, level: number, cutoff = 3_000): void => {
  chain(noise(ctx, rng, start, start + 0.03), filter(ctx, 'highpass', cutoff), env(ctx, level, 0.001, 0.012, start), out);
};

/** Tuned bell/chime tone built from inharmonic partials. */
const bell = (ctx: BaseAudioContext, out: AudioNode, frequency: number, start: number, level: number, decay: number): void => {
  const partials: readonly (readonly [number, number])[] = [[1, 1], [2.01, 0.45], [2.76, 0.22], [5.4, 0.08]];
  for (const [ratio, weight] of partials) {
    chain(osc(ctx, 'sine', frequency * ratio, start, start + decay + 0.1),
      env(ctx, level * weight, 0.004, decay / Math.sqrt(ratio), start), out);
  }
};

const note = (semitonesFromA4: number): number => 440 * 2 ** (semitonesFromA4 / 12);

export const SOUND_RECIPES: Readonly<Record<SoundId, SoundRecipe>> = Object.freeze({
  // --- Player Technology -------------------------------------------------------------------------

  'foundation-fire': (ctx, out, rng) => {
    // Light pulse tick; Foundation fires constantly, so it stays small and bright.
    click(ctx, out, rng, 0, 0.35, 4_000);
    const tone = osc(ctx, 'triangle', 900, 0, 0.1);
    glide(tone.frequency, 1_100, 520, 0, 0.05);
    chain(tone, env(ctx, 0.6, 0.002, 0.06), out);
  },

  'rail-fire': (ctx, out, rng) => {
    // Struck-cable dispersion: two descending chirps a fraction apart, over a metallic ring.
    click(ctx, out, rng, 0, 0.8, 2_500);
    const tone = filter(ctx, 'lowpass', 5_000, 1.5);
    glide(tone.frequency, 7_000, 900, 0, 0.25);
    chain(tone, drive(ctx, 1.6), out);
    for (const [from, to, level, delay] of [[3_400, 190, 0.5, 0], [4_600, 260, 0.3, 0.006], [2_300, 140, 0.35, 0.012]] as const) {
      const chirp = osc(ctx, 'sawtooth', from, delay, 0.42);
      glide(chirp.frequency, from, to, delay, 0.22);
      chain(chirp, env(ctx, level, 0.002, 0.26, delay), tone);
    }
    for (const [frequency, level] of [[1_870, 0.12], [2_710, 0.09], [3_930, 0.06]] as const) {
      chain(osc(ctx, 'sine', frequency, 0, 0.45), env(ctx, level, 0.002, 0.32), out);
    }
  },

  'arc-fire': (ctx, out, rng) => {
    // Chain lightning: stochastic crackle, a gated mains-style buzz, and a snapping zap.
    const crackle = ctx.createGain();
    crackle.gain.setValueAtTime(0, 0);
    let time = 0;
    while (time < 0.24) {
      const level = rng() < 0.35 ? 0.9 * (1 - time / 0.26) : 0.05;
      crackle.gain.setValueAtTime(level, time);
      time += 0.003 + rng() * 0.009;
    }
    crackle.gain.setValueAtTime(0, 0.25);
    chain(noise(ctx, rng, 0, 0.3), filter(ctx, 'bandpass', 2_600, 0.9), crackle, out);

    const buzzGate = ctx.createGain();
    buzzGate.gain.setValueAtTime(0.5, 0);
    const lfo = osc(ctx, 'square', 48, 0, 0.3);
    modulate(ctx, lfo, 0.5, buzzGate.gain);
    const buzzFilter = filter(ctx, 'bandpass', 900, 1.2);
    chain(osc(ctx, 'sawtooth', 110, 0, 0.3), buzzFilter);
    chain(osc(ctx, 'square', 166, 0, 0.3), gainNode(ctx, 0.5), buzzFilter);
    chain(buzzFilter, buzzGate, env(ctx, 0.6, 0.004, 0.22), out);

    const zap = osc(ctx, 'sine', 2_000, 0, 0.12);
    glide(zap.frequency, 2_200, 500, 0, 0.07);
    chain(zap, env(ctx, 0.5, 0.001, 0.08), out);
  },

  'siege-launch': (ctx, out, rng) => {
    // Mortar tube thump: a pitched sub drop with a resonant bore of air behind it.
    const body = osc(ctx, 'sine', 150, 0, 0.4);
    glide(body.frequency, 160, 46, 0, 0.2);
    chain(body, env(ctx, 1, 0.003, 0.28), out);
    chain(noise(ctx, rng, 0, 0.3), filter(ctx, 'bandpass', 320, 4), env(ctx, 0.9, 0.004, 0.18), out);
    chain(noise(ctx, rng, 0, 0.1), filter(ctx, 'lowpass', 900), env(ctx, 0.5, 0.002, 0.05), out);
  },

  'siege-impact': (ctx, out, rng) => {
    // Plasma shell detonation: sweeping filtered noise, sub punch, and scattered debris.
    const blast = filter(ctx, 'lowpass', 3_500, 0.8);
    glide(blast.frequency, 4_500, 180, 0, 0.9);
    chain(noise(ctx, rng, 0, 1.2), env(ctx, 1, 0.003, 1), drive(ctx, 2.2), blast, out);
    const sub = osc(ctx, 'sine', 80, 0, 0.6);
    glide(sub.frequency, 90, 32, 0, 0.45);
    chain(sub, env(ctx, 1, 0.002, 0.5), out);
    for (let index = 0; index < 9; index += 1) {
      const at = 0.08 + rng() * 0.55;
      click(ctx, out, rng, at, 0.15 + rng() * 0.25, 1_500 + rng() * 2_500);
    }
  },

  'gravity-fire': (ctx, out, rng) => {
    // Gravity collapse: an inhaled swell that implodes into a sub drop.
    const suck = filter(ctx, 'bandpass', 200, 2);
    glide(suck.frequency, 180, 2_600, 0, 0.3);
    const swell = ctx.createGain();
    swell.gain.setValueAtTime(FLOOR, 0);
    swell.gain.exponentialRampToValueAtTime(0.8, 0.3);
    swell.gain.exponentialRampToValueAtTime(FLOOR, 0.34);
    chain(noise(ctx, rng, 0, 0.4), suck, swell, out);
    const drop = osc(ctx, 'sine', 110, 0.3, 0.7);
    glide(drop.frequency, 110, 28, 0.3, 0.35);
    chain(drop, env(ctx, 1, 0.004, 0.36, 0.3), out);
    const wobble = osc(ctx, 'triangle', 220, 0, 0.36);
    glide(wobble.frequency, 70, 440, 0, 0.3);
    chain(wobble, env(ctx, 0.25, 0.25, 0.06), out);
  },

  // --- Brood -------------------------------------------------------------------------------------

  'drone-death': (ctx, out, rng) => {
    // Chitinous chirp that squeals down into a wet pop.
    const squeal = osc(ctx, 'sawtooth', 1_400, 0, 0.2);
    glide(squeal.frequency, 1_500, 420, 0, 0.1);
    const vibrato = osc(ctx, 'sine', 38, 0, 0.2);
    modulate(ctx, vibrato, 90, squeal.frequency);
    chain(squeal, filter(ctx, 'bandpass', 1_300, 3), env(ctx, 0.7, 0.003, 0.1), out);
    const pop = filter(ctx, 'bandpass', 700, 5);
    glide(pop.frequency, 1_100, 300, 0.05, 0.08);
    chain(noise(ctx, rng, 0.04, 0.2), pop, env(ctx, 1, 0.002, 0.1, 0.05), out);
  },

  'broodling-death': (ctx, out, rng) => {
    // Tiny squish; it arrives in swarms, so it is short and quiet.
    const squish = filter(ctx, 'bandpass', 2_400, 4);
    glide(squish.frequency, 2_800, 900, 0, 0.05);
    chain(noise(ctx, rng, 0, 0.1), squish, env(ctx, 1, 0.002, 0.05), out);
    const blip = osc(ctx, 'sine', 900, 0, 0.08);
    glide(blip.frequency, 1_000, 380, 0, 0.05);
    chain(blip, env(ctx, 0.3, 0.001, 0.05), out);
  },

  'carapace-death': (ctx, out, rng) => {
    // Armored shell cracking open: sharp fracture clicks, a crunchy thud, then a low groan.
    click(ctx, out, rng, 0, 1, 1_500);
    for (let index = 0; index < 5; index += 1) click(ctx, out, rng, 0.01 + rng() * 0.09, 0.4 + rng() * 0.4, 1_200 + rng() * 2_000);
    const thud = osc(ctx, 'sine', 170, 0, 0.4);
    glide(thud.frequency, 180, 55, 0, 0.18);
    chain(thud, env(ctx, 0.9, 0.002, 0.22), drive(ctx, 3), gainNode(ctx, 0.7), out);
    const groan = osc(ctx, 'sawtooth', 95, 0.08, 0.6);
    glide(groan.frequency, 100, 52, 0.08, 0.4);
    chain(groan, filter(ctx, 'lowpass', 520, 3), env(ctx, 0.5, 0.05, 0.35, 0.08), out);
  },

  'glider-death': (ctx, out, rng) => {
    // Airborne membrane tearing: a falling airy whoosh with a descending cry.
    const air = filter(ctx, 'bandpass', 3_000, 2.5);
    glide(air.frequency, 3_400, 700, 0, 0.28);
    chain(noise(ctx, rng, 0, 0.34), air, env(ctx, 0.9, 0.01, 0.26), out);
    const cry = osc(ctx, 'triangle', 950, 0, 0.3);
    glide(cry.frequency, 1_050, 300, 0, 0.24);
    chain(cry, env(ctx, 0.35, 0.005, 0.22), out);
  },

  // --- Construction and interface ----------------------------------------------------------------

  build: (ctx, out, rng) => {
    // Materialize: rising filtered shimmer resolving into two quantized blips.
    const rise = filter(ctx, 'bandpass', 900, 3);
    glide(rise.frequency, 800, 6_000, 0, 0.12);
    chain(noise(ctx, rng, 0, 0.15), rise, env(ctx, 0.35, 0.08, 0.05), out);
    chain(osc(ctx, 'triangle', note(3), 0.07, 0.25), env(ctx, 0.5, 0.002, 0.08, 0.07), out);
    chain(osc(ctx, 'triangle', note(10), 0.12, 0.3), env(ctx, 0.55, 0.002, 0.14, 0.12), out);
  },

  specialist: (ctx, out, rng) => {
    // Power-up: a quick major arpeggio over a rising detuned shimmer.
    const sweep = filter(ctx, 'lowpass', 400, 4);
    glide(sweep.frequency, 400, 5_000, 0, 0.45);
    for (const detune of [-9, 9]) {
      const saw = osc(ctx, 'sawtooth', note(-9), 0, 0.7);
      saw.detune.setValueAtTime(detune, 0);
      chain(saw, sweep);
    }
    chain(sweep, env(ctx, 0.25, 0.25, 0.4), out);
    [3, 7, 10, 15].forEach((semitones, index) => bell(ctx, out, note(semitones), index * 0.055, 0.35, 0.35));
    click(ctx, out, rng, 0, 0.3, 5_000);
  },

  dismantle: (ctx, out, rng) => {
    // Build in reverse: descending blips and collapsing noise.
    chain(osc(ctx, 'triangle', note(10), 0, 0.2), env(ctx, 0.5, 0.002, 0.07), out);
    chain(osc(ctx, 'triangle', note(3), 0.06, 0.25), env(ctx, 0.5, 0.002, 0.1, 0.06), out);
    const fall = filter(ctx, 'bandpass', 5_000, 3);
    glide(fall.frequency, 5_000, 600, 0.02, 0.18);
    chain(noise(ctx, rng, 0.02, 0.25), fall, env(ctx, 0.3, 0.01, 0.17, 0.02), out);
  },

  'route-changed': (ctx, out) => {
    // Soft data chirp: route recalculated.
    chain(osc(ctx, 'sine', 1_320, 0, 0.1), env(ctx, 0.4, 0.006, 0.04), out);
    chain(osc(ctx, 'sine', 1_760, 0.05, 0.16), env(ctx, 0.35, 0.006, 0.06, 0.05), out);
  },

  'ui-tap': (ctx, out, rng) => {
    click(ctx, out, rng, 0, 0.5, 2_000);
    chain(osc(ctx, 'sine', 1_600, 0, 0.04), env(ctx, 0.35, 0.001, 0.02), out);
  },

  'ui-deny': (ctx, out) => {
    // Two low square pulses: not allowed.
    for (const start of [0, 0.09]) {
      chain(osc(ctx, 'square', 150, start, start + 0.08), filter(ctx, 'lowpass', 1_400), env(ctx, 0.5, 0.006, 0.06, start), out);
    }
  },

  // --- Mission flow ------------------------------------------------------------------------------

  'wave-start': (ctx, out, rng) => {
    // Incoming signal: a plasma "whistler" falls across the band over a low warning horn and ping.
    const whistle = osc(ctx, 'sine', 4_200, 0, 1.3);
    glide(whistle.frequency, 4_200, 380, 0, 1.1);
    const wobble = osc(ctx, 'sine', 7, 0, 1.3);
    modulate(ctx, wobble, 25, whistle.frequency);
    chain(whistle, env(ctx, 0.3, 0.05, 1.1), out);
    const horn = filter(ctx, 'lowpass', 200, 3);
    glide(horn.frequency, 200, 700, 0.15, 0.6);
    for (const [frequency, detune] of [[55, -8], [55, 8], [82.4, 0]] as const) {
      const saw = osc(ctx, 'sawtooth', frequency, 0.15, 1.8);
      saw.detune.setValueAtTime(detune, 0);
      chain(saw, horn);
    }
    chain(horn, env(ctx, 0.55, 0.35, 1.1, 0.15), out);
    bell(ctx, out, 1_320, 0.02, 0.25, 0.6);
    chain(noise(ctx, rng, 0, 1.2), filter(ctx, 'bandpass', 5_000, 1), env(ctx, 0.05, 0.3, 0.8), out);
  },

  'wave-clear': (ctx, out) => {
    // Sector stable: a rising chime chord.
    [0, 4, 7, 12].forEach((semitones, index) => bell(ctx, out, note(semitones + 3), index * 0.07, 0.3, 1.1));
    const pad = filter(ctx, 'lowpass', 1_400, 0.7);
    for (const semitones of [-9, -5, -2]) chain(osc(ctx, 'triangle', note(semitones), 0, 1.5), pad);
    chain(pad, env(ctx, 0.18, 0.2, 1.1), out);
  },

  leak: (ctx, out) => {
    // Breach klaxon: alternating two-tone alarm with a sub hit.
    const alarm = filter(ctx, 'lowpass', 2_200, 2);
    [0, 0.17, 0.34, 0.51].forEach((start, index) => {
      chain(osc(ctx, 'square', index % 2 === 0 ? 660 : 440, start, start + 0.16), env(ctx, 0.5, 0.004, 0.14, start), alarm);
    });
    chain(alarm, out);
    const sub = osc(ctx, 'sine', 70, 0, 0.4);
    glide(sub.frequency, 90, 40, 0, 0.3);
    chain(sub, env(ctx, 0.8, 0.003, 0.3), out);
  },

  victory: (ctx, out, rng) => {
    // "Sector secured": synth-brass rise into a bright major chord with sparkle.
    const brass = filter(ctx, 'lowpass', 600, 2);
    glide(brass.frequency, 600, 3_800, 0, 0.9);
    const voices: readonly (readonly [number, number, number])[] = [
      [-2, 0, 0.35], [3, 0.18, 0.35], [7, 0.36, 2.2], [10, 0.36, 2.2], [15, 0.36, 2.2], [-14, 0.36, 2.2],
    ];
    for (const [semitones, start, length] of voices) {
      for (const detune of [-6, 6]) {
        const saw = osc(ctx, 'sawtooth', note(semitones), start, start + length + 0.1);
        saw.detune.setValueAtTime(detune, 0);
        chain(saw, env(ctx, 0.18, 0.03, length, start), brass);
      }
    }
    chain(brass, out);
    for (let index = 0; index < 7; index += 1) bell(ctx, out, note(27 + Math.floor(rng() * 8)), 0.4 + index * 0.09, 0.08, 0.5);
  },

  defeat: (ctx, out, rng) => {
    // "Signal lost": a detuned pad sinks while radio static gates out, ending on a low thud.
    const pad = filter(ctx, 'lowpass', 1_800, 1.5);
    glide(pad.frequency, 1_800, 250, 0, 2);
    for (const [start, detune] of [[220, -12], [220, 12], [164.8, 0], [110, 5]] as const) {
      const saw = osc(ctx, 'sawtooth', start, 0, 2.5);
      glide(saw.frequency, start, start / 2, 0.1, 1.8);
      saw.detune.setValueAtTime(detune, 0);
      chain(saw, pad);
    }
    chain(pad, env(ctx, 0.35, 0.05, 2.2), out);
    const gate = ctx.createGain();
    gate.gain.setValueAtTime(0, 0);
    let time = 0.2;
    while (time < 2.2) {
      gate.gain.setValueAtTime(rng() < 0.5 * (1 - time / 2.3) ? 0.25 : 0, time);
      time += 0.02 + rng() * 0.08;
    }
    gate.gain.setValueAtTime(0, 2.25);
    chain(noise(ctx, rng, 0, 2.4), filter(ctx, 'bandpass', 2_500, 0.8), gate, out);
    const thud = osc(ctx, 'sine', 60, 1.9, 2.6);
    glide(thud.frequency, 70, 30, 1.9, 0.5);
    chain(thud, env(ctx, 0.7, 0.004, 0.55, 1.9), out);
  },

  // --- Ambient space events ----------------------------------------------------------------------

  'amb-whistler': (ctx, out, rng) => {
    // Magnetospheric whistler: a pure tone falling across the band, slightly dispersed.
    for (const [offset, level] of [[0, 0.5], [0.04, 0.25]] as const) {
      const tone = osc(ctx, 'sine', 5_000, offset, 2.4);
      glide(tone.frequency, 4_000 + rng() * 2_000, 300 + rng() * 200, offset, 1.8);
      chain(tone, env(ctx, level, 0.08, 2, offset), out);
    }
  },

  'amb-chorus': (ctx, out, rng) => {
    // Plasma "dawn chorus": a flock of short rising chirps.
    for (let index = 0; index < 7; index += 1) {
      const start = index * 0.18 + rng() * 0.08;
      const base = 700 + rng() * 700;
      const chirp = osc(ctx, 'sine', base, start, start + 0.25);
      glide(chirp.frequency, base, base * (1.6 + rng() * 0.6), start, 0.14);
      chain(chirp, env(ctx, 0.3 + rng() * 0.3, 0.02, 0.16, start), out);
    }
  },
});
