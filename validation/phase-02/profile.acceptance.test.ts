// Astra-owned contract: failure injection and preservation of the last verified save.
import { afterEach, describe, expect, it, vi } from 'vitest';

interface Profile {
  schemaVersion: 1;
  completedMissions: Record<string, 1 | 2 | 3>;
  unlockedBlueprints: string[];
  seenHelp: string[];
  destination: { kind: 'mission'; missionId: string } | { kind: 'map' };
}
interface Storage {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}
type Load = { status: string; profile: Profile | null; revision: number | null };
interface Store { load(): Promise<Load>; save(profile: Profile): Promise<{ revision: number }> }
interface Api {
  createPlayerProfile(): Profile;
  parsePlayerProfile(value: unknown): Profile;
  PROFILE_SLOT_KEYS: readonly [string, string];
  ProfileStore: new (storage: Storage, options?: { readTimeoutMs?: number }) => Store;
}

async function api(): Promise<Api> {
  const profilePath = '@phase2/player-profile';
  const storePath = '@phase2/profile-store';
  const profile = await import(/* @vite-ignore */ profilePath);
  const store = await import(/* @vite-ignore */ storePath);
  expect(profile.createPlayerProfile).toBeTypeOf('function');
  expect(profile.parsePlayerProfile).toBeTypeOf('function');
  expect(store.ProfileStore).toBeTypeOf('function');
  expect(store.PROFILE_SLOT_KEYS).toEqual(['maze-defense.profile.a', 'maze-defense.profile.b']);
  return { ...profile, ...store } as Api;
}

function memoryStorage() {
  const data = new Map<string, string>();
  const writes: { key: string; value: string }[] = [];
  const storage: Storage = {
    async get({ key }) { return { value: data.get(key) ?? null }; },
    async set(entry) { writes.push(entry); data.set(entry.key, entry.value); },
  };
  return { storage, data, writes };
}

function completed(base: Profile): Profile {
  return { ...structuredClone(base), completedMissions: { 'world-01-mission-01': 2 },
    destination: { kind: 'map' } };
}

function deepFrozen(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) deepFrozen(child);
}

afterEach(() => vi.useRealTimers());

describe('P2-02 recoverable local profile contract', () => {
  it('creates the cold-open profile without writing defaults during load', async () => {
    const contract = await api(), memory = memoryStorage();
    const result = await new contract.ProfileStore(memory.storage).load();
    expect(result).toEqual({ status: 'new', revision: 0, profile: {
      schemaVersion: 1, completedMissions: {}, unlockedBlueprints: [], seenHelp: [],
      destination: { kind: 'mission', missionId: 'world-01-mission-01' },
    } });
    deepFrozen(contract.createPlayerProfile());
    expect(memory.writes).toHaveLength(0);
  });

  it('validates and detaches profile data rather than coercing or retaining caller objects', async () => {
    const contract = await api(), input = completed(contract.createPlayerProfile());
    const parsed = contract.parsePlayerProfile(input);
    deepFrozen(parsed);
    expect(Object.isFrozen(input)).toBe(false);
    input.completedMissions['world-01-mission-01'] = 3;
    expect(parsed.completedMissions['world-01-mission-01']).toBe(2);
    const base = contract.createPlayerProfile();
    for (const invalid of [null, {}, { ...base, schemaVersion: 2 },
      { ...base, completedMissions: { 'world-01-mission-01': 4 } },
      { ...base, unlockedBlueprints: ['foundation'] }, { ...base, unlockedBlueprints: ['unknown'] },
      { ...base, unlockedBlueprints: ['rail', 'rail'] }, { ...base, seenHelp: ['build', 'build'] },
      { ...base, destination: { kind: 'mission', missionId: '' } }]) {
      expect(() => contract.parsePlayerProfile(invalid)).toThrow();
    }
  });

  it('round trips two revisions and preserves the latest verified backup', async () => {
    const contract = await api(), memory = memoryStorage();
    const store = new contract.ProfileStore(memory.storage);
    const fresh = contract.createPlayerProfile(), progress = completed(fresh);
    await store.load();
    expect(await store.save(fresh)).toEqual({ revision: 1 });
    expect(await store.save(progress)).toEqual({ revision: 2 });
    expect(new Set(memory.writes.map(w => w.key)).size).toBe(2);
    const loaded = await new contract.ProfileStore(memory.storage).load();
    expect(loaded).toEqual({ status: 'loaded', revision: 2, profile: progress });
    deepFrozen(loaded.profile);
    const envelope = JSON.parse(memory.writes[1]!.value);
    expect(envelope).toMatchObject({ schemaVersion: 1, revision: 2, profile: progress });
    expect(envelope.checksum).toBeTypeOf('string');
  });

  it.each(['truncated', 'checksum', 'revision'])('recovers without writes after %s corruption', async kind => {
    const contract = await api(), memory = memoryStorage();
    const store = new contract.ProfileStore(memory.storage), fresh = contract.createPlayerProfile();
    await store.load(); await store.save(fresh); await store.save(completed(fresh));
    const latest = memory.writes.at(-1)!;
    const broken = JSON.parse(latest.value);
    if (kind === 'checksum') broken.profile.unlockedBlueprints = ['rail'];
    if (kind === 'revision') broken.revision = 999;
    memory.data.set(latest.key, kind === 'truncated' ? '{' : JSON.stringify(broken));
    const before = [...memory.data];
    const recovered = await new contract.ProfileStore(memory.storage).load();
    expect(recovered).toEqual({ status: 'recovered', revision: 1, profile: fresh });
    expect([...memory.data]).toEqual(before);
    expect(memory.writes).toHaveLength(2);
  });

  it('preserves both corrupt originals and prohibits overwriting them with defaults', async () => {
    const contract = await api(), memory = memoryStorage();
    contract.PROFILE_SLOT_KEYS.forEach(key => memory.data.set(key, '{broken'));
    const store = new contract.ProfileStore(memory.storage), before = [...memory.data];
    expect(await store.load()).toEqual({ status: 'corrupt', profile: null, revision: null });
    await expect(store.save(contract.createPlayerProfile())).rejects.toThrow();
    expect([...memory.data]).toEqual(before);
    expect(memory.writes).toHaveLength(0);
  });

  it.each(['envelope', 'profile'])('protects a future %s version even when an older slot is valid', async kind => {
    const contract = await api(), memory = memoryStorage();
    const store = new contract.ProfileStore(memory.storage);
    await store.load(); await store.save(contract.createPlayerProfile());
    const future = JSON.parse(memory.writes[0]!.value);
    if (kind === 'envelope') future.schemaVersion = 2;
    else future.profile.schemaVersion = 2;
    memory.data.set(contract.PROFILE_SLOT_KEYS.find(key => key !== memory.writes[0]!.key)!, JSON.stringify(future));
    const before = [...memory.data], reloaded = new contract.ProfileStore(memory.storage);
    expect(await reloaded.load()).toEqual({ status: 'unsupported-version', profile: null, revision: null });
    await expect(reloaded.save(contract.createPlayerProfile())).rejects.toThrow();
    expect([...memory.data]).toEqual(before);
  });

  it('rejects a torn write but recovers the previous confirmed revision after restart', async () => {
    const contract = await api(), memory = memoryStorage();
    let fail = false;
    const storage: Storage = { get: memory.storage.get, async set(entry) {
      if (fail) { memory.data.set(entry.key, '{torn'); throw new Error('interrupted write'); }
      await memory.storage.set(entry);
    } };
    const store = new contract.ProfileStore(storage), fresh = contract.createPlayerProfile();
    await store.load(); await store.save(fresh); fail = true;
    await expect(store.save(completed(fresh))).rejects.toThrow('interrupted write');
    expect(await new contract.ProfileStore(memory.storage).load())
      .toEqual({ status: 'recovered', revision: 1, profile: fresh });
  });

  it('serializes concurrent saves and snapshots mutable input at invocation', async () => {
    const contract = await api(), memory = memoryStorage();
    let release!: () => void, entered!: () => void;
    const firstEntered = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    const storage: Storage = { get: memory.storage.get, async set(entry) {
      calls++;
      if (calls === 1) { entered(); await gate; }
      await memory.storage.set(entry);
    } };
    const store = new contract.ProfileStore(storage), fresh = contract.createPlayerProfile();
    await store.load();
    const first = store.save(fresh);
    await firstEntered;
    const input = completed(fresh), second = store.save(input);
    input.completedMissions['world-01-mission-01'] = 3;
    await Promise.resolve();
    expect(calls).toBe(1);
    release();
    expect(await first).toEqual({ revision: 1 });
    expect(await second).toEqual({ revision: 2 });
    expect((await new contract.ProfileStore(memory.storage).load()).profile?.completedMissions)
      .toEqual({ 'world-01-mission-01': 2 });
  });

  it('reports quota failure without poisoning later saves or consuming a revision', async () => {
    const contract = await api(), memory = memoryStorage();
    let fail = true;
    const store = new contract.ProfileStore({ get: memory.storage.get, async set(entry) {
      if (fail) throw new Error('quota');
      await memory.storage.set(entry);
    } });
    await store.load();
    await expect(store.save(contract.createPlayerProfile())).rejects.toThrow('quota');
    fail = false;
    expect(await store.save(contract.createPlayerProfile())).toEqual({ revision: 1 });
  });

  it('requires successful load before the first write', async () => {
    const contract = await api(), memory = memoryStorage();
    await expect(new contract.ProfileStore(memory.storage).save(contract.createPlayerProfile())).rejects.toThrow();
    expect(memory.writes).toHaveLength(0);
  });

  it('rejects invalid saves without consuming a revision or touching either slot', async () => {
    const contract = await api(), memory = memoryStorage(), store = new contract.ProfileStore(memory.storage);
    await store.load();
    const invalid = { ...contract.createPlayerProfile(), unlockedBlueprints: ['foundation'] };
    await expect(store.save(invalid)).rejects.toThrow();
    expect(memory.writes).toHaveLength(0);
    expect(await store.save(contract.createPlayerProfile())).toEqual({ revision: 1 });
  });

  it('does not fall back to a stale readable slot when the other slot fails to read', async () => {
    const contract = await api(), memory = memoryStorage(), original = new contract.ProfileStore(memory.storage);
    await original.load(); await original.save(contract.createPlayerProfile());
    const unreadable = contract.PROFILE_SLOT_KEYS.find(key => key !== memory.writes[0]!.key)!;
    const store = new contract.ProfileStore({ set: memory.storage.set, async get(options) {
      if (options.key === unreadable) throw new Error('native unavailable');
      return memory.storage.get(options);
    } });
    expect(await store.load()).toEqual({ status: 'unavailable', profile: null, revision: null });
    await expect(store.save(contract.createPlayerProfile())).rejects.toThrow();
    expect(memory.writes).toHaveLength(1);
  });

  it('bounds unavailable reads and ignores late replies without creating defaults', async () => {
    const contract = await api(), memory = memoryStorage();
    vi.useFakeTimers();
    const replies: ((value: { value: string | null }) => void)[] = [];
    const store = new contract.ProfileStore({ set: memory.storage.set,
      get: () => new Promise(resolve => replies.push(resolve)),
    }, { readTimeoutMs: 20 });
    const pending = store.load();
    await vi.advanceTimersByTimeAsync(100);
    const result = await pending;
    expect(result).toEqual({ status: 'unavailable', profile: null, revision: null });
    for (const reply of replies) reply({ value: null });
    await vi.runAllTimersAsync();
    await expect(store.save(contract.createPlayerProfile())).rejects.toThrow();
    expect(memory.writes).toHaveLength(0);
  });
});
