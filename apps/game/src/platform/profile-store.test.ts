import { describe, expect, it, vi } from 'vitest';
import { createPlayerProfile } from '../application/player-profile.js';
import { PROFILE_SLOT_KEYS, ProfileStore } from './profile-store.js';

class MemoryStorage {
  readonly values = new Map<string, string>();
  readonly writes: { key: string; value: string }[] = [];

  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    return { value: this.values.get(key) ?? null };
  }

  async set(entry: { key: string; value: string }): Promise<void> {
    this.writes.push(entry);
    this.values.set(entry.key, entry.value);
  }
}

const completedProfile = () => ({
  ...structuredClone(createPlayerProfile()),
  completedMissions: { 'world-01-mission-01': 2 as const },
  destination: { kind: 'map' as const },
});

const profileWithStars = (stars: 1 | 2 | 3) => ({
  ...structuredClone(createPlayerProfile()),
  completedMissions: { 'world-01-mission-01': stars },
  destination: { kind: 'map' as const },
});

describe('ProfileStore', () => {
  it('journals revisions and reloads the newest verified profile', async () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    const fresh = createPlayerProfile();
    const progress = completedProfile();

    await store.load();
    await expect(store.save(fresh)).resolves.toEqual({ revision: 1 });
    await expect(store.save(progress)).resolves.toEqual({ revision: 2 });
    expect(PROFILE_SLOT_KEYS).toEqual(['maze-defense.profile.a', 'maze-defense.profile.b']);
    expect(new Set(storage.writes.map(({ key }) => key))).toHaveLength(2);
    await expect(new ProfileStore(storage).load()).resolves.toEqual({
      status: 'loaded', revision: 2, profile: progress,
    });
  });

  it('preserves an invalid slot while recovering the last verified revision', async () => {
    const storage = new MemoryStorage();
    const original = new ProfileStore(storage);
    const fresh = createPlayerProfile();
    await original.load();
    await original.save(fresh);
    await original.save(completedProfile());
    const latest = storage.writes.at(-1)!;
    storage.values.set(latest.key, '{torn');

    await expect(new ProfileStore(storage).load()).resolves.toEqual({
      status: 'recovered', revision: 1, profile: fresh,
    });
    expect(storage.values.get(latest.key)).toBe('{torn');
  });

  it('captures a queued save before the caller mutates it', async () => {
    const storage = new MemoryStorage();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const set = vi.spyOn(storage, 'set').mockImplementationOnce(async (entry) => {
      await gate;
      storage.writes.push(entry);
      storage.values.set(entry.key, entry.value);
    });
    const store = new ProfileStore(storage);
    await store.load();

    const first = store.save(createPlayerProfile());
    const progress = completedProfile();
    const second = store.save(progress);
    (progress.completedMissions as Record<string, 1 | 2 | 3>)['world-01-mission-01'] = 3;
    release();
    await Promise.all([first, second]);

    expect((await new ProfileStore(storage).load()).profile?.completedMissions)
      .toEqual({ 'world-01-mission-01': 2 });
    set.mockRestore();
  });

  it('does not let a stale reload overtake a later save', async () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    await store.load();
    await store.save(createPlayerProfile());

    let releaseReads!: () => void;
    let readsEntered = 0;
    let allReadsEntered!: () => void;
    const readsReady = new Promise<void>(resolve => { allReadsEntered = resolve; });
    const reads = new Promise<void>(resolve => { releaseReads = resolve; });
    const get = storage.get.bind(storage);
    storage.get = async ({ key }) => {
      const snapshot = await get({ key });
      readsEntered += 1;
      if (readsEntered === 2) allReadsEntered();
      await reads;
      return snapshot;
    };
    let secondWriteStarted = false;
    const set = storage.set.bind(storage);
    storage.set = async (entry) => {
      if (storage.writes.length === 1) secondWriteStarted = true;
      await set(entry);
    };

    const reloading = store.load();
    await readsReady;
    const second = store.save(profileWithStars(2));
    await Promise.resolve();
    expect(secondWriteStarted).toBe(false);
    releaseReads();
    await Promise.all([reloading, second]);
    await expect(store.save(profileWithStars(3))).resolves.toEqual({ revision: 3 });
    expect((await new ProfileStore(storage).load()).profile?.completedMissions)
      .toEqual({ 'world-01-mission-01': 3 });
  });

  it('confirms a committed profile when native set rejects after writing it', async () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    await store.load();
    const set = storage.set.bind(storage);
    storage.set = async (entry) => {
      await set(entry);
      throw new Error('native completion lost');
    };

    await expect(store.save(createPlayerProfile())).resolves.toEqual({ revision: 1 });
    storage.set = set;
    await expect(store.save(completedProfile())).resolves.toEqual({ revision: 2 });
  });

  it('locks further saves after a rejected write leaves different target bytes', async () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    await store.load();
    storage.set = async ({ key }) => {
      storage.values.set(key, '{partial');
      throw new Error('interrupted write');
    };

    await expect(store.save(createPlayerProfile())).rejects.toThrow('interrupted write');
    await expect(store.save(createPlayerProfile())).rejects.toThrow();
    expect(storage.values.get(PROFILE_SLOT_KEYS[0])).toBe('{partial');
  });

  it('allows a later save after a clear quota rejection leaves the target unchanged', async () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    await store.load();
    const set = storage.set.bind(storage);
    storage.set = async () => { throw new Error('quota'); };

    await expect(store.save(createPlayerProfile())).rejects.toThrow('quota');
    storage.set = set;
    await expect(store.save(createPlayerProfile())).resolves.toEqual({ revision: 1 });
  });

  it('protects a future profile version before malformed envelope fields', async () => {
    const storage = new MemoryStorage();
    const store = new ProfileStore(storage);
    await store.load();
    await store.save(createPlayerProfile());
    storage.values.set(PROFILE_SLOT_KEYS[1], JSON.stringify({
      schemaVersion: 1,
      revision: 'not-a-revision',
      checksum: 0,
      profile: { ...createPlayerProfile(), schemaVersion: 2 },
    }));

    await expect(new ProfileStore(storage).load()).resolves.toEqual({
      status: 'unsupported-version', profile: null, revision: null,
    });
  });

  it('reloads the same checksum after the device collation locale changes', async () => {
    const english = new Intl.Collator('en');
    const danish = new Intl.Collator('da');
    expect(english.compare('aa-mission', 'z-mission')).toBeLessThan(0);
    expect(danish.compare('aa-mission', 'z-mission')).toBeGreaterThan(0);
    const localeCompare = vi.spyOn(String.prototype, 'localeCompare');
    const storage = new MemoryStorage();
    const profile = {
      ...structuredClone(createPlayerProfile()),
      completedMissions: { 'aa-mission': 1 as const, 'z-mission': 2 as const },
      destination: { kind: 'map' as const },
    };

    try {
      const store = new ProfileStore(storage);
      await store.load();
      localeCompare.mockImplementation(function (this: string, other: string) {
        return english.compare(String(this), other);
      });
      await store.save(profile);
      localeCompare.mockImplementation(function (this: string, other: string) {
        return danish.compare(String(this), other);
      });

      await expect(new ProfileStore(storage).load()).resolves.toEqual({
        status: 'loaded', profile, revision: 1,
      });
    } finally {
      localeCompare.mockRestore();
    }
  });
});
