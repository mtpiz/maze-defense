import type { PresentationEvent } from '@tower-defense/sim';
import { SOUND_CATALOG, type SoundId } from './sound-catalog.js';

export interface SoundRequest {
  readonly id: SoundId;
  /** Stereo position, -1 (left) to 1 (right). */
  readonly pan: number;
  /** Multiplier on the catalog gain; dense batches play once, a little louder. */
  readonly gain: number;
}

const MAX_PAN = 0.6;
const MAX_REQUESTS_PER_BATCH = 6;
const MILLI = 1_000;

const WEAPON_SOUNDS: Readonly<Record<string, SoundId>> = Object.freeze({
  direct: 'foundation-fire',
  'rail-line': 'rail-fire',
  'arc-chain': 'arc-fire',
  'siege-blast': 'siege-launch',
});

const DEATH_SOUNDS: Readonly<Record<string, SoundId>> = Object.freeze({
  drone: 'drone-death',
  broodling: 'broodling-death',
  carapace: 'carapace-death',
  glider: 'glider-death',
});

const weaponSound = (mechanicId: unknown): SoundId => {
  const id = String(mechanicId);
  return WEAPON_SOUNDS[id] ?? (id.startsWith('gravity') ? 'gravity-fire' : 'foundation-fire');
};

interface Pending {
  count: number;
  xSum: number;
  xCount: number;
}

/**
 * Turns simulation presentation events into a bounded set of sound requests.
 *
 * Pure and headless: no Web Audio, so batching, throttling, and priorities are unit-testable.
 * Every event batch plays each sound at most once; repeats inside the sound's minimum interval are
 * dropped rather than stacked, which keeps a 100-creep wave from turning into noise.
 */
export class AudioDirector {
  #lastSequence = 0;
  #lastTick = 0;
  readonly #lastStart = new Map<SoundId, number>();

  constructor(private readonly arenaWidthCells: number) {}

  consume(events: readonly PresentationEvent[], tick: number, now: number): SoundRequest[] {
    if (tick < this.#lastTick) {
      this.#lastSequence = 0;
      this.#lastStart.clear();
    }
    this.#lastTick = tick;

    const pending = new Map<SoundId, Pending>();
    const add = (id: SoundId, xMilli?: unknown): void => {
      const entry = pending.get(id) ?? { count: 0, xSum: 0, xCount: 0 };
      entry.count += 1;
      if (typeof xMilli === 'number' && Number.isFinite(xMilli)) {
        entry.xSum += xMilli;
        entry.xCount += 1;
      }
      pending.set(id, entry);
    };
    const cellX = (cell: unknown): number | undefined =>
      typeof cell === 'number' ? (cell % this.arenaWidthCells) * MILLI + MILLI / 2 : undefined;

    for (const event of events) {
      if (event.sequence <= this.#lastSequence) continue;
      this.#lastSequence = event.sequence;
      const { payload } = event;
      switch (event.type) {
        case 'tower-fired':
          add(weaponSound(payload.mechanicId), payload.fromXMilli);
          break;
        case 'weapon-impact':
          add(String(payload.mechanicId).startsWith('gravity') ? 'gravity-fire' : 'siege-impact', payload.xMilli);
          break;
        case 'creep-died':
          add(DEATH_SOUNDS[String(payload.creepType)] ?? 'drone-death', payload.xMilli);
          break;
        case 'creep-leaked':
          add('leak', payload.xMilli);
          break;
        case 'construction':
          add('build', cellX(payload.cell));
          break;
        case 'specialist-installed':
          add('specialist');
          break;
        case 'dismantle':
          add('dismantle', cellX(payload.cell));
          break;
        case 'route-changed':
          add('route-changed');
          break;
        case 'wave-started':
        case 'early-launched':
          add('wave-start');
          break;
        case 'wave-completed':
          add('wave-clear');
          break;
        case 'mission-completed':
          add('victory');
          break;
        case 'mission-defeated':
          add('defeat');
          break;
        case 'pause-changed':
        case 'speed-changed':
          add('ui-tap');
          break;
        default:
          break;
      }
    }

    // Construction already speaks for its route change; results replace ordinary wave and leak cues.
    if (pending.has('build') || pending.has('dismantle')) pending.delete('route-changed');
    if (pending.has('victory') || pending.has('defeat')) {
      pending.delete('wave-clear');
      pending.delete('leak');
    }

    const requests: SoundRequest[] = [];
    for (const [id, entry] of pending) {
      const spec = SOUND_CATALOG[id];
      if (now - (this.#lastStart.get(id) ?? -Infinity) < spec.minIntervalMs) continue;
      const x = entry.xCount > 0 ? entry.xSum / entry.xCount : (this.arenaWidthCells * MILLI) / 2;
      const pan = Math.max(-1, Math.min(1, (x / (this.arenaWidthCells * MILLI)) * 2 - 1)) * MAX_PAN;
      const gain = Math.min(1.5, 1 + 0.15 * Math.log2(entry.count));
      requests.push({ id, pan: Math.round(pan * 1_000) / 1_000, gain });
    }
    requests.sort((a, b) => SOUND_CATALOG[b.id].priority - SOUND_CATALOG[a.id].priority);
    const selected = requests.slice(0, MAX_REQUESTS_PER_BATCH);
    for (const request of selected) this.#lastStart.set(request.id, now);
    return selected;
  }
}
