// Presentation-only audio vocabulary. Nothing here feeds the deterministic simulation.

export type SoundBus = 'combat' | 'interface' | 'alert' | 'ambience';

export type SoundId =
  // Player technology: clean, synthetic, tuned.
  | 'foundation-fire'
  | 'rail-fire'
  | 'arc-fire'
  | 'siege-launch'
  | 'siege-impact'
  | 'gravity-fire'
  // Brood: organic, noisy, wet.
  | 'drone-death'
  | 'broodling-death'
  | 'carapace-death'
  | 'glider-death'
  // Construction and interface.
  | 'build'
  | 'specialist'
  | 'dismantle'
  | 'route-changed'
  | 'ui-tap'
  | 'ui-deny'
  // Mission flow and alerts.
  | 'wave-start'
  | 'wave-clear'
  | 'leak'
  | 'victory'
  | 'defeat'
  // Ambient space events scheduled by the ambience layer.
  | 'amb-whistler'
  | 'amb-chorus';

export interface SoundSpec {
  readonly bus: SoundBus;
  /** Linear playback gain before bus and master. */
  readonly gain: number;
  /** Higher values survive voice stealing. */
  readonly priority: number;
  /** Baked buffer length in seconds. */
  readonly duration: number;
  /** Maximum simultaneous voices of this sound. */
  readonly maxVoices: number;
  /** Minimum wall-clock spacing between starts of this sound. */
  readonly minIntervalMs: number;
  /** Random ± playback-rate variation that keeps repeats from sounding mechanical. */
  readonly pitchJitter: number;
}

const spec = (
  bus: SoundBus,
  gain: number,
  priority: number,
  duration: number,
  maxVoices: number,
  minIntervalMs: number,
  pitchJitter: number,
): SoundSpec => Object.freeze({ bus, gain, priority, duration, maxVoices, minIntervalMs, pitchJitter });

export const SOUND_CATALOG: Readonly<Record<SoundId, SoundSpec>> = Object.freeze({
  'foundation-fire': spec('combat', 0.32, 10, 0.12, 3, 90, 0.08),
  'rail-fire': spec('combat', 0.55, 30, 0.45, 3, 70, 0.05),
  'arc-fire': spec('combat', 0.5, 30, 0.34, 3, 80, 0.07),
  'siege-launch': spec('combat', 0.45, 30, 0.4, 2, 110, 0.05),
  'siege-impact': spec('combat', 0.75, 40, 1.2, 3, 120, 0.06),
  'gravity-fire': spec('combat', 0.5, 35, 0.7, 2, 150, 0.04),
  'drone-death': spec('combat', 0.42, 20, 0.22, 3, 70, 0.12),
  'broodling-death': spec('combat', 0.3, 12, 0.1, 3, 50, 0.15),
  'carapace-death': spec('combat', 0.7, 45, 0.6, 2, 140, 0.06),
  'glider-death': spec('combat', 0.45, 25, 0.34, 2, 90, 0.1),
  build: spec('interface', 0.5, 50, 0.3, 2, 60, 0.03),
  specialist: spec('interface', 0.55, 60, 0.7, 1, 120, 0),
  dismantle: spec('interface', 0.45, 50, 0.3, 1, 80, 0.03),
  'route-changed': spec('interface', 0.22, 15, 0.16, 1, 150, 0.02),
  'ui-tap': spec('interface', 0.3, 40, 0.04, 2, 40, 0.04),
  'ui-deny': spec('interface', 0.3, 55, 0.2, 1, 250, 0),
  'wave-start': spec('alert', 0.62, 80, 1.8, 1, 500, 0),
  'wave-clear': spec('alert', 0.65, 80, 1.5, 1, 500, 0),
  leak: spec('alert', 0.7, 90, 0.75, 1, 400, 0),
  victory: spec('alert', 0.7, 100, 2.6, 1, 1_000, 0),
  defeat: spec('alert', 0.7, 100, 2.6, 1, 1_000, 0),
  'amb-whistler': spec('ambience', 0.2, 5, 2.4, 1, 3_000, 0.2),
  'amb-chorus': spec('ambience', 0.16, 5, 1.6, 1, 3_000, 0.15),
});

export const SOUND_IDS = Object.freeze(Object.keys(SOUND_CATALOG) as SoundId[]);

/** Concurrency ceiling for the whole mix: the audio share of the Combat Readability Budget. */
export const MAX_VOICES = 16;
