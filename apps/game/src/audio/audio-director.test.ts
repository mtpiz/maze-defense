import { describe, expect, it } from 'vitest';
import type { PresentationEvent, PresentationEventType } from '@tower-defense/sim';
import { AudioDirector } from './audio-director.js';
import { SOUND_CATALOG, SOUND_IDS } from './sound-catalog.js';
import { SOUND_RECIPES } from './sound-recipes.js';

let sequence = 0;
const event = (type: PresentationEventType, payload: PresentationEvent['payload'] = {}, tick = 1): PresentationEvent => {
  sequence += 1;
  return { id: `e${sequence}`, sequence, tick, type, payload };
};

describe('AudioDirector', () => {
  it('maps weapons and Brood deaths to their family sounds', () => {
    const director = new AudioDirector(9);
    const ids = director.consume([
      event('tower-fired', { mechanicId: 'rail-line', fromXMilli: 1_000 }),
      event('tower-fired', { mechanicId: 'arc-chain', fromXMilli: 1_000 }),
      event('tower-fired', { mechanicId: 'direct', fromXMilli: 1_000 }),
      event('creep-died', { creepType: 'carapace', xMilli: 4_500 }),
      event('creep-died', { creepType: 'broodling', xMilli: 4_500 }),
    ], 1, 0).map(({ id }) => id).sort();
    expect(ids).toEqual(['arc-fire', 'broodling-death', 'carapace-death', 'foundation-fire', 'rail-fire']);
  });

  it('plays a dense batch once, slightly louder, instead of stacking voices', () => {
    const director = new AudioDirector(9);
    const deaths = Array.from({ length: 16 }, () => event('creep-died', { creepType: 'broodling', xMilli: 4_500 }));
    const requests = director.consume(deaths, 1, 0);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.gain).toBeGreaterThan(1);
    expect(requests[0]!.gain).toBeLessThanOrEqual(1.5);
  });

  it('drops repeats inside a sound\'s minimum interval', () => {
    const director = new AudioDirector(9);
    const interval = SOUND_CATALOG['rail-fire'].minIntervalMs;
    expect(director.consume([event('tower-fired', { mechanicId: 'rail-line' })], 1, 0)).toHaveLength(1);
    expect(director.consume([event('tower-fired', { mechanicId: 'rail-line' })], 2, interval - 1)).toHaveLength(0);
    expect(director.consume([event('tower-fired', { mechanicId: 'rail-line' })], 3, interval)).toHaveLength(1);
  });

  it('pans by arena position and keeps it inside the soft stereo field', () => {
    const director = new AudioDirector(10);
    const [left] = director.consume([event('creep-died', { creepType: 'drone', xMilli: 0 })], 1, 0);
    const [right] = director.consume([event('creep-died', { creepType: 'glider', xMilli: 10_000 })], 2, 0);
    expect(left!.pan).toBeCloseTo(-0.6);
    expect(right!.pan).toBeCloseTo(0.6);
  });

  it('lets mission results replace wave-clear and leak, and construction replace route blips', () => {
    const director = new AudioDirector(9);
    const ids = director.consume([
      event('construction', { cell: 3 }),
      event('route-changed'),
      event('creep-leaked', { xMilli: 0 }),
      event('mission-defeated'),
    ], 1, 0).map(({ id }) => id);
    expect(ids).toEqual(['defeat', 'build']);
  });

  it('orders by priority and caps each batch', () => {
    const director = new AudioDirector(9);
    const requests = director.consume([
      event('tower-fired', { mechanicId: 'direct' }),
      event('tower-fired', { mechanicId: 'rail-line' }),
      event('tower-fired', { mechanicId: 'arc-chain' }),
      event('tower-fired', { mechanicId: 'siege-blast' }),
      event('weapon-impact', { mechanicId: 'siege-blast' }),
      event('creep-died', { creepType: 'drone' }),
      event('creep-died', { creepType: 'glider' }),
      event('wave-started'),
    ], 1, 0);
    expect(requests).toHaveLength(6);
    expect(requests[0]!.id).toBe('wave-start');
    expect(requests.map(({ id }) => id)).not.toContain('foundation-fire');
  });

  it('ignores replayed sequences and resets after a retry rewinds the tick', () => {
    const director = new AudioDirector(9);
    const fire = event('tower-fired', { mechanicId: 'rail-line' }, 50);
    expect(director.consume([fire], 50, 0)).toHaveLength(1);
    expect(director.consume([fire], 51, 1_000)).toHaveLength(0);
    sequence = 0;
    expect(director.consume([event('tower-fired', { mechanicId: 'rail-line' }, 1)], 1, 1_010)).toHaveLength(1);
  });
});

describe('sound catalog', () => {
  it('has a recipe and sane budget for every sound', () => {
    for (const id of SOUND_IDS) {
      const spec = SOUND_CATALOG[id];
      expect(SOUND_RECIPES[id]).toBeTypeOf('function');
      expect(spec.maxVoices).toBeGreaterThanOrEqual(1);
      expect(spec.gain).toBeGreaterThan(0);
      expect(spec.gain).toBeLessThanOrEqual(1);
      expect(spec.duration).toBeLessThanOrEqual(3);
    }
  });
});
