import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_CREEPS,
  BENCHMARK_TOWERS,
  ContentValidationError,
  compileCampaignMission,
  type TowerFamilyId,
} from './index.js';

const fixture = () => ({
  schemaVersion: 1,
  contentVersion: 1,
  mission: {
    id: 'compiler-unit-fixture',
    arena: {
      schemaVersion: 2, id: 'compiler-unit-arena', name: 'Compiler Unit Arena',
      width: 9, height: 14, spawn: { x: 0, y: 2 }, exit: { x: 8, y: 11 },
      waypoints: [], inactive: [], terrain: [],
    },
    startingLives: 20, openingFieldCredits: 120, constructionPolicy: 'live-foundation',
    planningDurationTicks: 450, earlyLaunchMaxCredits: 8, twoStarLives: 15,
    towerCatalog: { foundation: structuredClone(BENCHMARK_TOWERS.foundation!) },
    creeps: { drone: structuredClone(BENCHMARK_CREEPS.drone) },
    waves: [{
      id: 'opening', tacticalPurpose: 'Place a Foundation before the first drones arrive.',
      fieldCreditAllotment: 30,
      groups: [{ creepId: 'drone', count: 4, firstSpawnTick: 0, intervalTicks: 30, burstSize: 1 }],
    }],
  },
  progression: { requires: [] as string[], loans: [] as TowerFamilyId[], awards: [] as TowerFamilyId[] },
});

const compile = (source: unknown) => compileCampaignMission(source);

const expectIssue = (source: unknown, path: string): void => {
  try {
    compile(source);
    expect.fail(`Expected a validation issue at ${path}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ContentValidationError);
    expect((error as ContentValidationError).issues.map((issue) => issue.path)).toContain(path);
  }
};

describe('compileCampaignMission', () => {
  it('reports exact catalog paths for identity and mechanic-specific errors', () => {
    const original = fixture();
    const mismatchedTower = {
      ...original,
      mission: {
        ...original.mission,
        towerCatalog: {
          ...original.mission.towerCatalog,
          foundation: { ...original.mission.towerCatalog.foundation!, familyId: 'rail' as TowerFamilyId },
        },
      },
    };
    expectIssue(mismatchedTower, 'mission.towerCatalog.foundation.familyId');

    const invalidWeapon = {
      ...original,
      mission: {
        ...original.mission,
        towerCatalog: {
          ...original.mission.towerCatalog,
          foundation: {
            ...original.mission.towerCatalog.foundation!,
            weapon: { ...original.mission.towerCatalog.foundation!.weapon, damage: 0 },
          },
        },
      },
    };
    expectIssue(invalidWeapon, 'mission.towerCatalog.foundation.weapon.damage');

    const malformedWeapon = {
      ...original,
      mission: {
        ...original.mission,
        towerCatalog: {
          ...original.mission.towerCatalog,
          foundation: { ...original.mission.towerCatalog.foundation!, weapon: null },
        },
      },
    };
    expectIssue(malformedWeapon, 'mission.towerCatalog.foundation.weapon');
  });

  it('accepts every current weapon mechanic variant', () => {
    const source = fixture();
    Object.assign(source.mission.towerCatalog, {
      rail: structuredClone(BENCHMARK_TOWERS.rail!),
      siege: structuredClone(BENCHMARK_TOWERS.siege!),
      arc: {
        familyId: 'arc', fieldCreditCost: 40, constructionDelayTicks: 30,
        weapon: {
          mechanicId: 'arc-chain', damage: 12, armorPiercing: 1, rangeMilliCells: 3_000,
          cooldownTicks: 45, targets: { ground: true, air: true }, targeting: 'first',
          jumpRangeMilliCells: 1_500, maxTargets: 4,
        },
      },
    });

    expect(compile(source)).toBeDefined();
  });

  it('rejects invalid creep movement and invalid mission scalar ranges', () => {
    const original = fixture();
    const invalidMovement = {
      ...original,
      mission: {
        ...original.mission,
        creeps: {
          ...original.mission.creeps,
          drone: {
            ...original.mission.creeps.drone!,
            movement: { ...original.mission.creeps.drone!.movement!, radiusMilliCells: 12 },
          },
        },
      },
    };
    expectIssue(invalidMovement, 'mission.creeps.drone.movement.radiusMilliCells');

    const invalidStars = fixture();
    invalidStars.mission.twoStarLives = 21;
    expectIssue(invalidStars, 'mission.twoStarLives');
  });

  it('rejects duplicate or unknown progression families with paths', () => {
    const duplicateLoan = fixture();
    duplicateLoan.progression.loans.push('foundation', 'foundation');
    expectIssue(duplicateLoan, 'progression.loans[1]');

    const unknownAward = fixture();
    unknownAward.progression.awards.push('not-a-family' as TowerFamilyId);
    expectIssue(unknownAward, 'progression.awards[0]');

    const unavailableLoan = fixture();
    unavailableLoan.progression.loans.push('rail');
    expectIssue(unavailableLoan, 'progression.loans[0]');
  });
});
