import { Preferences } from '@capacitor/preferences';
import { parsePlayerProfile, createPlayerProfile, type PlayerProfile } from '../application/player-profile.js';

export const PROFILE_SLOT_KEYS = ['maze-defense.profile.a', 'maze-defense.profile.b'] as const;

export interface ProfileStorage {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}

export type ProfileLoad =
  | { status: 'new' | 'loaded' | 'recovered'; profile: PlayerProfile; revision: number }
  | { status: 'corrupt' | 'unsupported-version' | 'unavailable'; profile: null; revision: null };

interface ProfileEnvelope {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly checksum: string;
  readonly profile: PlayerProfile;
}

type Slot =
  | { readonly key: string; readonly raw: string | null; readonly status: 'empty' | 'invalid' | 'unsupported' }
  | { readonly key: string; readonly raw: string; readonly status: 'valid'; readonly revision: number; readonly profile: PlayerProfile };

const DEFAULT_READ_TIMEOUT_MILLISECONDS = 2_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const compareCodeUnits = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const canonicalProfile = (profile: PlayerProfile): string => JSON.stringify({
  schemaVersion: profile.schemaVersion,
  completedMissions: Object.fromEntries(Object.entries(profile.completedMissions).sort(([left], [right]) => compareCodeUnits(left, right))),
  unlockedBlueprints: [...profile.unlockedBlueprints].sort(),
  seenHelp: [...profile.seenHelp].sort(),
  destination: profile.destination.kind === 'map'
    ? { kind: 'map' }
    : { kind: 'mission', missionId: profile.destination.missionId },
});

const checksum = (revision: number, profile: PlayerProfile): string => {
  const data = `${revision}:${canonicalProfile(profile)}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < data.length; index += 1) {
    hash = Math.imul(hash ^ data.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const inspectSlot = (key: string, raw: string | null): Slot => {
  if (raw === null) return { key, raw, status: 'empty' };
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return { key, raw, status: 'invalid' };
  }
  if (!isRecord(envelope)) return { key, raw, status: 'invalid' };
  if (isRecord(envelope.profile) && typeof envelope.profile.schemaVersion === 'number' && Number.isSafeInteger(envelope.profile.schemaVersion) && envelope.profile.schemaVersion !== 1) {
    return { key, raw, status: 'unsupported' };
  }
  if (typeof envelope.schemaVersion === 'number' && Number.isSafeInteger(envelope.schemaVersion) && envelope.schemaVersion !== 1) {
    return { key, raw, status: 'unsupported' };
  }
  if (
    envelope.schemaVersion !== 1 ||
    typeof envelope.revision !== 'number' ||
    !Number.isSafeInteger(envelope.revision) ||
    envelope.revision <= 0 ||
    typeof envelope.checksum !== 'string'
  ) {
    return { key, raw, status: 'invalid' };
  }
  try {
    const profile = parsePlayerProfile(envelope.profile);
    if (checksum(envelope.revision, profile) !== envelope.checksum) return { key, raw, status: 'invalid' };
    return { key, raw, status: 'valid', revision: envelope.revision, profile };
  } catch {
    return { key, raw, status: 'invalid' };
  }
};

export class ProfileStore {
  #pendingOperation: Promise<void> = Promise.resolve();
  #slots: readonly Slot[] = [];
  #revision = 0;
  #canSave = false;

  constructor(
    private readonly storage: ProfileStorage = Preferences,
    private readonly options: { readonly readTimeoutMs?: number } = {},
  ) {}

  load(): Promise<ProfileLoad> {
    const load = this.#pendingOperation.then(() => this.#load());
    this.#pendingOperation = load.then(() => undefined, () => undefined);
    return load;
  }

  async #load(): Promise<ProfileLoad> {
    let values: readonly { value: string | null }[];
    try {
      values = await Promise.all(PROFILE_SLOT_KEYS.map(key => this.#read(key)));
    } catch {
      this.#canSave = false;
      return { status: 'unavailable', profile: null, revision: null };
    }

    const slots = PROFILE_SLOT_KEYS.map((key, index) => inspectSlot(key, values[index]!.value));
    this.#slots = slots;
    if (slots.some(slot => slot.status === 'unsupported')) {
      this.#canSave = false;
      return { status: 'unsupported-version', profile: null, revision: null };
    }

    const validSlots = slots.filter((slot): slot is Extract<Slot, { status: 'valid' }> => slot.status === 'valid');
    if (validSlots.length === 0) {
      if (slots.every(slot => slot.status === 'empty')) {
        this.#revision = 0;
        this.#canSave = true;
        return { status: 'new', profile: createPlayerProfile(), revision: 0 };
      }
      this.#canSave = false;
      return { status: 'corrupt', profile: null, revision: null };
    }

    const newest = validSlots.reduce((best, slot) => slot.revision > best.revision ? slot : best);
    this.#revision = newest.revision;
    this.#canSave = true;
    return {
      status: slots.some(slot => slot.status === 'invalid') ? 'recovered' : 'loaded',
      profile: newest.profile,
      revision: newest.revision,
    };
  }

  save(profile: PlayerProfile): Promise<{ revision: number }> {
    if (!this.#canSave) return Promise.reject(new Error('Profile must load successfully before saving'));
    let snapshot: PlayerProfile;
    try {
      snapshot = parsePlayerProfile(profile);
    } catch (error) {
      return Promise.reject(error);
    }
    const write = this.#pendingOperation.then(() => this.#commit(snapshot));
    this.#pendingOperation = write.then(() => undefined, () => undefined);
    return write;
  }

  async #read(key: string): Promise<{ value: string | null }> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.storage.get({ key }),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('Profile read timed out')), this.options.readTimeoutMs ?? DEFAULT_READ_TIMEOUT_MILLISECONDS);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  async #commit(profile: PlayerProfile): Promise<{ revision: number }> {
    if (!this.#canSave) throw new Error('Profile must load successfully before saving');
    let target: Slot | undefined = this.#slots.find(slot => slot.status !== 'valid');
    if (!target) {
      const validSlots = this.#slots.filter(
        (slot): slot is Extract<Slot, { status: 'valid' }> => slot.status === 'valid',
      );
      if (validSlots.length === 0) throw new Error('Profile must load successfully before saving');
      target = validSlots.reduce((oldest, slot) => slot.revision < oldest.revision ? slot : oldest);
    }
    if (!target) throw new Error('Profile must load successfully before saving');
    const revision = this.#revision + 1;
    const envelope: ProfileEnvelope = {
      schemaVersion: 1,
      revision,
      checksum: checksum(revision, profile),
      profile,
    };
    const value = JSON.stringify(envelope);
    try {
      await this.storage.set({ key: target.key, value });
    } catch (error) {
      try {
        const readback = await this.#read(target.key);
        if (readback.value === value) return this.#confirmCommit(target.key, value, revision, profile);
        if (readback.value !== target.raw) this.#canSave = false;
      } catch {
        this.#canSave = false;
      }
      throw error;
    }
    return this.#confirmCommit(target.key, value, revision, profile);
  }

  #confirmCommit(key: string, raw: string, revision: number, profile: PlayerProfile): { revision: number } {
    this.#revision = revision;
    this.#slots = this.#slots.map(slot => slot.key === key
      ? { key, raw, status: 'valid', revision, profile }
      : slot,
    );
    return { revision };
  }
}
