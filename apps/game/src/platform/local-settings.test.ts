import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalSettingsStore } from './local-settings.js';

const KEY = 'maze-defense.settings';
const choices = {
  highContrast: true,
  reducedMotion: false,
  showAirRoute: false,
  effectsEnabled: false,
  hapticsEnabled: false,
  frameRate: 60 as const,
};

class MemoryPreferences {
  readonly values = new Map<string, string>();

  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    return { value: this.values.get(key) ?? null };
  }

  async set({ key, value }: { key: string; value: string }): Promise<void> {
    this.values.set(key, value);
  }
}

describe('LocalSettingsStore', () => {
  afterEach(() => vi.useRealTimers());

  it('retries a lost native read reply and ignores its late result', async () => {
    vi.useFakeTimers();
    const preferences = new MemoryPreferences();
    let finishFirst!: (value: { value: string | null }) => void;
    preferences.get = vi.fn()
      .mockReturnValueOnce(new Promise((resolve) => { finishFirst = resolve; }))
      .mockResolvedValue({ value: JSON.stringify({ schemaVersion: 1, settings: choices }) });
    const loaded = vi.fn();
    void new LocalSettingsStore(preferences).load(true).then(loaded);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(loaded).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(preferences.get).toHaveBeenCalledTimes(2);
    expect(loaded).toHaveBeenCalledExactlyOnceWith(choices);
    expect(vi.getTimerCount()).toBe(0);
    finishFirst({ value: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(loaded).toHaveBeenCalledTimes(1);
    expect(preferences.values.size).toBe(0);
  });

  it('bounds two unanswered reads and never enables unknown saved feedback preferences', async () => {
    vi.useFakeTimers();
    const preferences = new MemoryPreferences();
    preferences.get = vi.fn(() => new Promise<{ value: string | null }>(() => {}));
    const loaded = vi.fn();
    void new LocalSettingsStore(preferences).load(true).then(loaded);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(preferences.get).toHaveBeenCalledTimes(2);
    expect(loaded).toHaveBeenCalledExactlyOnceWith({
      highContrast: false, reducedMotion: true, showAirRoute: true,
      effectsEnabled: false, hapticsEnabled: false, frameRate: 60,
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(preferences.values.size).toBe(0);
  });

  it('clears the read deadline without retrying a successful request', async () => {
    vi.useFakeTimers();
    const preferences = new MemoryPreferences();
    const get = vi.spyOn(preferences, 'get');
    await new LocalSettingsStore(preferences).load(false);
    expect(get).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('uses system motion preference only when no user setting has been saved', async () => {
    const preferences = new MemoryPreferences();
    const store = new LocalSettingsStore(preferences);
    expect(await store.load(true)).toEqual({
      highContrast: false, reducedMotion: true, showAirRoute: true, effectsEnabled: true, hapticsEnabled: true, frameRate: 60,
    });
    expect(preferences.values.size).toBe(0);
    await store.save(choices);
    expect(await new LocalSettingsStore(preferences).load(true)).toEqual(choices);
  });

  it('round-trips every setting across a new store without touching unrelated preferences', async () => {
    const preferences = new MemoryPreferences();
    preferences.values.set('another-feature', 'preserve');
    await new LocalSettingsStore(preferences).save(choices);
    expect(await new LocalSettingsStore(preferences).load(false)).toEqual(choices);
    expect(preferences.values.get('another-feature')).toBe('preserve');
  });

  it('restores a saved frame rate and defaults older preferences to Quality without losing opt-outs', async () => {
    const preferences = new MemoryPreferences();
    preferences.values.set(KEY, JSON.stringify({ schemaVersion: 1, settings: { effectsEnabled: false, hapticsEnabled: false } }));
    expect(await new LocalSettingsStore(preferences).load(false)).toMatchObject({
      effectsEnabled: false, hapticsEnabled: false, frameRate: 60,
    });
    preferences.values.set(KEY, JSON.stringify({ schemaVersion: 1, settings: { ...choices, frameRate: 30 } }));
    expect((await new LocalSettingsStore(preferences).load(false)).frameRate).toBe(30);
  });

  it.each([0, 45, '30', null, true])('rejects unsupported frame-rate preference %j', async (frameRate) => {
    const preferences = new MemoryPreferences();
    preferences.values.set(KEY, JSON.stringify({ schemaVersion: 1, settings: { ...choices, frameRate } }));
    expect((await new LocalSettingsStore(preferences).load(false)).frameRate).toBe(60);
  });

  it.each(['{broken', 'null', '[]', '{"schemaVersion":2,"settings":{"effectsEnabled":false}}'])(
    'falls back without overwriting malformed or unsupported settings: %s', async (stored) => {
      const preferences = new MemoryPreferences();
      preferences.values.set(KEY, stored);
      expect(await new LocalSettingsStore(preferences).load(false)).toEqual({
        highContrast: false, reducedMotion: false, showAirRoute: true, effectsEnabled: true, hapticsEnabled: true, frameRate: 60,
      });
      expect(preferences.values.get(KEY)).toBe(stored);
    },
  );

  it('accepts saved booleans but never treats invalid values as enabled', async () => {
    const preferences = new MemoryPreferences();
    preferences.values.set(KEY, JSON.stringify({ schemaVersion: 1, settings: {
      highContrast: 'true', reducedMotion: false, showAirRoute: 0, effectsEnabled: false, hapticsEnabled: null,
    } }));
    expect(await new LocalSettingsStore(preferences).load(true)).toEqual({
      highContrast: false, reducedMotion: false, showAirRoute: true, effectsEnabled: false, hapticsEnabled: true, frameRate: 60,
    });
  });

  it('keeps gameplay available when reading preferences fails', async () => {
    const preferences = new MemoryPreferences();
    preferences.get = async () => { throw new Error('Storage unavailable'); };
    expect(await new LocalSettingsStore(preferences).load(true)).toEqual({
      highContrast: false, reducedMotion: true, showAirRoute: true, effectsEnabled: false, hapticsEnabled: false, frameRate: 60,
    });
  });

  it('serializes rapid changes so a slow older write cannot win', async () => {
    const preferences = new MemoryPreferences();
    let finishFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => { finishFirst = resolve; });
    let writesStarted = 0;
    preferences.set = async ({ key, value }) => {
      writesStarted += 1;
      if (writesStarted === 1) await firstWrite;
      preferences.values.set(key, value);
    };
    const store = new LocalSettingsStore(preferences);
    const earlier = store.save(choices);
    const later = store.save({ ...choices, effectsEnabled: true });
    await Promise.resolve();
    await Promise.resolve();
    expect(writesStarted).toBe(1);
    finishFirst();
    await earlier;
    await later;
    expect((await new LocalSettingsStore(preferences).load(false)).effectsEnabled).toBe(true);
  });

  it('reports a failed write and lets the next explicit change save successfully', async () => {
    const preferences = new MemoryPreferences();
    let fail = true;
    preferences.set = async ({ key, value }) => {
      if (fail) { fail = false; throw new Error('Write failed'); }
      preferences.values.set(key, value);
    };
    const store = new LocalSettingsStore(preferences);
    await expect(store.save(choices)).rejects.toThrow('Write failed');
    await store.save({ ...choices, hapticsEnabled: true });
    expect((await new LocalSettingsStore(preferences).load(false)).hapticsEnabled).toBe(true);
  });
});
