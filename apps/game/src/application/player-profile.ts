import { TOWER_FAMILIES, type TowerFamilyId } from '@tower-defense/content';

export interface PlayerProfile {
  readonly schemaVersion: 1;
  readonly completedMissions: Readonly<Record<string, 1 | 2 | 3>>;
  readonly unlockedBlueprints: readonly Exclude<TowerFamilyId, 'foundation'>[];
  readonly seenHelp: readonly string[];
  readonly destination:
    | { readonly kind: 'mission'; readonly missionId: string }
    | { readonly kind: 'map' };
}

const PROFILE_KEYS = ['schemaVersion', 'completedMissions', 'unlockedBlueprints', 'seenHelp', 'destination'];
const KEBAB_CASE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

const isId = (value: unknown): value is string =>
  typeof value === 'string' && KEBAB_CASE_ID.test(value);

const isBlueprint = (value: unknown): value is Exclude<TowerFamilyId, 'foundation'> =>
  typeof value === 'string' && value !== 'foundation' && Object.hasOwn(TOWER_FAMILIES, value);

const freezeProfile = (profile: {
  completedMissions: Record<string, 1 | 2 | 3>;
  unlockedBlueprints: Exclude<TowerFamilyId, 'foundation'>[];
  seenHelp: string[];
  destination: PlayerProfile['destination'];
}): PlayerProfile => Object.freeze({
  schemaVersion: 1 as const,
  completedMissions: Object.freeze(profile.completedMissions),
  unlockedBlueprints: Object.freeze(profile.unlockedBlueprints),
  seenHelp: Object.freeze(profile.seenHelp),
  destination: Object.freeze(profile.destination),
});

export function createPlayerProfile(): PlayerProfile {
  return freezeProfile({
    completedMissions: {},
    unlockedBlueprints: [],
    seenHelp: [],
    destination: { kind: 'mission', missionId: 'world-01-mission-01' },
  });
}

export function parsePlayerProfile(value: unknown): PlayerProfile {
  if (!isRecord(value) || !hasOnlyKeys(value, PROFILE_KEYS) || value.schemaVersion !== 1) {
    throw new Error('Invalid player profile');
  }

  if (!isRecord(value.completedMissions)) throw new Error('Invalid completed Missions');
  const completedMissions: Record<string, 1 | 2 | 3> = {};
  for (const [missionId, stars] of Object.entries(value.completedMissions)) {
    if (!isId(missionId) || (stars !== 1 && stars !== 2 && stars !== 3)) {
      throw new Error('Invalid completed Mission');
    }
    completedMissions[missionId] = stars;
  }

  if (!Array.isArray(value.unlockedBlueprints)) throw new Error('Invalid unlocked Blueprints');
  const unlockedBlueprints: Exclude<TowerFamilyId, 'foundation'>[] = [];
  const seenBlueprints = new Set<string>();
  for (const blueprint of value.unlockedBlueprints) {
    if (!isBlueprint(blueprint) || seenBlueprints.has(blueprint)) {
      throw new Error('Invalid unlocked Blueprint');
    }
    seenBlueprints.add(blueprint);
    unlockedBlueprints.push(blueprint);
  }

  if (!Array.isArray(value.seenHelp)) throw new Error('Invalid seen Help');
  const seenHelp: string[] = [];
  const seenHelpIds = new Set<string>();
  for (const helpId of value.seenHelp) {
    if (!isId(helpId) || seenHelpIds.has(helpId)) throw new Error('Invalid seen Help');
    seenHelpIds.add(helpId);
    seenHelp.push(helpId);
  }

  if (!isRecord(value.destination)) throw new Error('Invalid destination');
  let destination: PlayerProfile['destination'];
  if (value.destination.kind === 'map' && hasOnlyKeys(value.destination, ['kind'])) {
    destination = { kind: 'map' };
  } else if (
    value.destination.kind === 'mission' &&
    hasOnlyKeys(value.destination, ['kind', 'missionId']) &&
    isId(value.destination.missionId)
  ) {
    destination = { kind: 'mission', missionId: value.destination.missionId };
  } else {
    throw new Error('Invalid destination');
  }

  return freezeProfile({ completedMissions, unlockedBlueprints, seenHelp, destination });
}
