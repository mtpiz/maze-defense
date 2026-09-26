import { describe, expect, it } from 'vitest';
import { FIRST_SESSION_MISSIONS } from './first-session-missions.js';
import { applyMissionResult, createPlayerProfile, parsePlayerProfile } from './player-profile.js';

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

  it('applies a victory as immutable max-Star, set-based campaign progress', () => {
    const base = parsePlayerProfile({
      ...createPlayerProfile(),
      completedMissions: { 'world-01-mission-01': 3 },
      seenHelp: ['foundation-help'],
    });
    const railTrial = FIRST_SESSION_MISSIONS[2]!;

    const cleared = applyMissionResult(base, railTrial, { outcome: 'victory', stars: 2 });
    const replayed = applyMissionResult(cleared, railTrial, { outcome: 'victory', stars: 1 });

    expect(replayed).toEqual(cleared);
    expect(cleared).toMatchObject({
      completedMissions: { 'world-01-mission-01': 3, 'world-01-rail-trial': 2 },
      unlockedBlueprints: ['rail'],
      seenHelp: ['foundation-help'],
      destination: { kind: 'map' },
    });
    expect(base.completedMissions['world-01-rail-trial']).toBeUndefined();
    verifyDeepFreeze(cleared);
  });

  it('rejects mismatched outcome and star values without changing a profile', () => {
    const base = createPlayerProfile();
    expect(() => applyMissionResult(
      base,
      FIRST_SESSION_MISSIONS[0]!,
      { outcome: 'victory', stars: 0 } as never,
    )).toThrow('Invalid Mission result');
    expect(applyMissionResult(base, FIRST_SESSION_MISSIONS[0]!, { outcome: 'defeat', stars: 0 }))
      .toEqual(base);
  });
});
