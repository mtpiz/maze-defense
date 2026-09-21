// Astra-owned acceptance contract. Workers add unit tests but do not weaken these checks.
import { describe, expect, it } from 'vitest';
import * as content from '@tower-defense/content';
import { createMission, type MissionDefinition } from '@tower-defense/sim';

const fixture = () => ({
  schemaVersion: 1,
  contentVersion: 1,
  mission: {
    id: 'phase-02-compiler-fixture',
    arena: {
      schemaVersion: 2, id: 'phase-02-arena', name: 'Compiler fixture',
      width: 9, height: 14, spawn: { x: 0, y: 2 }, exit: { x: 8, y: 11 },
      waypoints: [], inactive: [], terrain: [],
    },
    startingLives: 20, openingFieldCredits: 120, constructionPolicy: 'live-foundation',
    planningDurationTicks: 450, earlyLaunchMaxCredits: 8, twoStarLives: 15,
    towerCatalog: { foundation: structuredClone(content.BENCHMARK_TOWERS.foundation!) },
    creeps: { drone: structuredClone(content.BENCHMARK_CREEPS.drone) },
    waves: [{ id: 'opening', tacticalPurpose: 'Read the entrance and place a Foundation.',
      fieldCreditAllotment: 30,
      groups: [{ creepId: 'drone', count: 4, firstSpawnTick: 0, intervalTicks: 30, burstSize: 1 }] }],
  },
  progression: { requires: [] as string[], loans: [] as string[], awards: [] as string[] },
});

interface Compiled {
  schemaVersion: number;
  contentVersion: number;
  contentHash: string;
  mission: MissionDefinition;
  progression: { requires: readonly string[]; loans: readonly string[]; awards: readonly string[] };
}

function compile(source: unknown): Compiled {
  const candidate = (content as unknown as Record<string, unknown>).compileCampaignMission;
  expect(candidate, 'P2-01 must export compileCampaignMission from @tower-defense/content').toBeTypeOf('function');
  return (candidate as (source: unknown) => Compiled)(source);
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseKeys(child)]));
  }
  return value;
}

function expectDeepFrozen(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeepFrozen(child);
}

describe('P2-01 authored campaign Mission contract', () => {
  it('compiles a versioned source into a directly usable deterministic Mission', () => {
    const result = compile(fixture());
    expect(result).toMatchObject({ schemaVersion: 1, contentVersion: 1,
      progression: { requires: [], loans: [], awards: [] } });
    expect(result.contentHash).toMatch(/^[a-f0-9]{8,64}$/);
    const a = createMission(result.mission, 42), b = createMission(result.mission, 42);
    a.dispatch({ type: 'start-wave' }); b.dispatch({ type: 'start-wave' });
    a.advance(180);
    for (let tick = 0; tick < 180; tick++) b.advance(1);
    expect(a.getUiSnapshot().spawnedCreeps).toBe(4);
    expect(a.getDeterminismHash()).toBe(b.getDeterminismHash());
  });

  it('returns detached deeply immutable data without freezing or changing the source', () => {
    const source = fixture(), before = structuredClone(source);
    const result = compile(source);
    expect(source).toEqual(before);
    expect(Object.isFrozen(source.mission.waves)).toBe(false);
    expectDeepFrozen(result);
    source.mission.waves[0]!.groups[0]!.count = 99;
    expect(result.mission.waves[0]!.groups[0]!.count).toBe(4);
  });

  it('canonicalizes object key order without changing authored array order', () => {
    const source = fixture();
    expect(compile(reverseKeys(source)).contentHash).toBe(compile(source).contentHash);
  });

  it('changes content identity for gameplay, progression, or version changes', () => {
    const original = compile(fixture()).contentHash;
    const balance = fixture(); balance.mission.waves[0]!.groups[0]!.count++;
    const version = fixture(); version.contentVersion++;
    const progression = fixture(); progression.progression.requires.push('earlier-mission');
    for (const source of [balance, version, progression]) expect(compile(source).contentHash).not.toBe(original);
  });

  it.each([null, {}, { ...fixture(), schemaVersion: 2 }, { ...fixture(), contentVersion: 0 }])(
    'rejects missing or unsupported schema/version input %#', source => {
      expect(() => compile(source)).toThrow(content.ContentValidationError);
    });

  it('reports duplicate wave IDs with structured field issues', () => {
    const source = fixture(); source.mission.waves.push(structuredClone(source.mission.waves[0]!));
    try { compile(source); expect.fail('Duplicate wave accepted'); }
    catch (error) {
      expect(error).toBeInstanceOf(content.ContentValidationError);
      expect((error as content.ContentValidationError).issues.some(issue => /waves/.test(issue.path))).toBe(true);
    }
  });

  it('rejects waves without a tactical purpose', () => {
    const source = fixture(); source.mission.waves[0]!.tacticalPurpose = '   ';
    expect(() => compile(source)).toThrow(content.ContentValidationError);
  });

  it.each(['count', 'intervalTicks', 'burstSize'] as const)('rejects a nonpositive %s', field => {
    const source = fixture(); source.mission.waves[0]!.groups[0]![field] = 0;
    expect(() => compile(source)).toThrow(content.ContentValidationError);
  });

  it('rejects fractional schedule ticks and unknown creep references', () => {
    const fractional = fixture(); fractional.mission.waves[0]!.groups[0]!.firstSpawnTick = .5;
    const unknown = fixture(); unknown.mission.waves[0]!.groups[0]!.creepId = 'missing-creep';
    for (const source of [fractional, unknown]) expect(() => compile(source)).toThrow(content.ContentValidationError);
  });

  it('rejects missing Foundation and unknown Blueprint loans', () => {
    const missing = { ...fixture(), mission: { ...fixture().mission, towerCatalog: {} } };
    const unknown = fixture(); unknown.progression.loans.push('missing-blueprint');
    for (const source of [missing, unknown]) expect(() => compile(source)).toThrow(content.ContentValidationError);
  });

  it('uses Arena validation rather than trusting raw Mission dimensions', () => {
    const source = fixture(); source.mission.arena.width = 0;
    expect(() => compile(source)).toThrow(content.ContentValidationError);
  });

  it('rejects a known Blueprint loan that the Mission cannot actually provide', () => {
    const source = fixture(); source.progression.loans.push('rail');
    expect(() => compile(source)).toThrow(content.ContentValidationError);
  });
});
