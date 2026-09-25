import { SOUND_CATALOG, SOUND_IDS, type SoundId } from './sound-catalog.js';
import { SOUND_RECIPES, seededRng } from './sound-recipes.js';

const PEAK = 0.89;
const TAIL_FADE_SECONDS = 0.012;

const seedFor = (id: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < id.length; index += 1) hash = Math.imul(hash ^ id.charCodeAt(index), 16_777_619);
  return hash >>> 0;
};

/** Peak-normalizes and fades the tail so every baked buffer starts and ends cleanly. */
export const finishBuffer = (data: Float32Array, sampleRate: number): void => {
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample));
  const scale = peak > 0 ? PEAK / peak : 1;
  const fade = Math.min(data.length, Math.ceil(TAIL_FADE_SECONDS * sampleRate));
  for (let index = 0; index < data.length; index += 1) {
    const remaining = data.length - index;
    data[index] = data[index]! * scale * (remaining < fade ? remaining / fade : 1);
  }
};

/** Renders one recipe to a mono buffer that any AudioContext can play. */
export const bakeSound = async (id: SoundId, sampleRate: number): Promise<AudioBuffer> => {
  const length = Math.ceil(SOUND_CATALOG[id].duration * sampleRate);
  const offline = new OfflineAudioContext(1, length, sampleRate);
  const out = offline.createGain();
  out.connect(offline.destination);
  SOUND_RECIPES[id](offline, out, seededRng(seedFor(id)));
  const buffer = await offline.startRendering();
  finishBuffer(buffer.getChannelData(0), sampleRate);
  return buffer;
};

/** Bakes in priority order so alerts and weapons are ready first; `onReady` fires per sound. */
export const bakeSoundBank = async (
  sampleRate: number,
  onReady: (id: SoundId, buffer: AudioBuffer) => void,
  isCancelled: () => boolean = () => false,
): Promise<void> => {
  const ordered = [...SOUND_IDS].sort((a, b) => SOUND_CATALOG[b].priority - SOUND_CATALOG[a].priority);
  for (const id of ordered) {
    if (isCancelled()) return;
    onReady(id, await bakeSound(id, sampleRate));
  }
};
