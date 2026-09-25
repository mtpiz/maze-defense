import { describe, expect, it } from 'vitest';
import { createPlayerProfile, parsePlayerProfile } from './player-profile.js';

const verifyDeepFreeze = (value: unknown): void => {
  if (value === null || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) verifyDeepFreeze(child);
};

describe('player profiles', () => {
  it('creates the immutable Mission One profile', () => {
    const profile = createPlayerProfile();

    expect(profile).toEqual({
      schemaVersion: 1,
      completedMissions: {},
      unlockedBlueprints: [],
      seenHelp: [],
      destination: { kind: 'mission', missionId: 'world-01-mission-01' },
    });
    verifyDeepFreeze(profile);
  });

  it('detaches validated progress from caller-owned values', () => {
    const input = {
      schemaVersion: 1,
      completedMissions: { 'world-01-mission-01': 2 as const },
      unlockedBlueprints: ['rail'] as const,
      seenHelp: ['build'],
      destination: { kind: 'map' as const },
    };

    const profile = parsePlayerProfile(input);
    (input.completedMissions as Record<string, 1 | 2 | 3>)['world-01-mission-01'] = 3;
    input.seenHelp.push('map');

    expect(profile).toEqual({
      schemaVersion: 1,
      completedMissions: { 'world-01-mission-01': 2 },
      unlockedBlueprints: ['rail'],
      seenHelp: ['build'],
      destination: { kind: 'map' },
    });
    verifyDeepFreeze(profile);
  });

  it.each([
    null,
    {},
    { ...createPlayerProfile(), schemaVersion: 2 },
    { ...createPlayerProfile(), completedMissions: { 'world-01-mission-01': 4 } },
    { ...createPlayerProfile(), unlockedBlueprints: ['foundation'] },
    { ...createPlayerProfile(), unlockedBlueprints: ['rail', 'rail'] },
    { ...createPlayerProfile(), seenHelp: ['build', 'build'] },
    { ...createPlayerProfile(), destination: { kind: 'mission', missionId: '' } },
  ])('rejects malformed profile data: %j', (value) => {
    expect(() => parsePlayerProfile(value)).toThrow();
  });
});
