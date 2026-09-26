import { describe, expect, it, vi } from 'vitest';
import type { MissionCommand } from '@tower-defense/sim';
import fixtures from '../../../../packages/testkit/src/first-session/replay-plans.json';
import { FirstSessionController } from './first-session-controller.js';
import { FIRST_SESSION_MISSIONS } from './first-session-missions.js';
import { createPlayerProfile, parsePlayerProfile, type PlayerProfile } from './player-profile.js';

const ids = FIRST_SESSION_MISSIONS.map(({ mission }) => mission.id);

const completedProfile = (): PlayerProfile => parsePlayerProfile({
  ...createPlayerProfile(),
  completedMissions: { [ids[0]!]: 3, [ids[1]!]: 3 },
  destination: { kind: 'map' },
});

const play = (controller: FirstSessionController, planId: string): void => {
  const plan = fixtures.find((candidate) => candidate.id === planId)!;
  const advanceTo = (tick: number): void => {
    while (controller.getState().mission!.ui.tick < tick) controller.advanceFrame(1000 / 30);
  };
  for (const { tick, command } of plan.commands) {
    advanceTo(tick);
    const item = command as MissionCommand;
    if (item.type === 'place-foundation') controller.tapCell(item.cell);
    else if (item.type === 'start-wave' || item.type === 'early-launch') controller.startWave();
    else if (item.type === 'install-specialist' || item.type === 'aim-tower') {
      const tower = controller.getState().mission!.render.towers.find(({ id }) => id === item.towerId)!;
      controller.tapCell(tower.cell);
      if (item.type === 'install-specialist') controller.installSelected(item.familyId);
      else controller.aimSelected(item.facingMilliDegrees);
    }
  }
  advanceTo(plan.durationTicks);
};

describe('first session controller', () => {
  it('holds one frozen victory candidate through a failed, coalesced retry', async () => {
    const writes: PlayerProfile[] = [];
    let throwSynchronously = true;
    let hold = false;
    let release: () => void = () => {};
    const writer = { save(profile: PlayerProfile): Promise<{ revision: number }> {
      writes.push(profile);
      if (throwSynchronously) throw new Error('disk full');
      if (hold) return new Promise((resolve) => { release = () => resolve({ revision: writes.length }); });
      return Promise.resolve({ revision: writes.length });
    } };
    const controller = new FirstSessionController(completedProfile(), writer);

    expect(controller.selectMission(ids[2]!)).toBe(true);
    play(controller, 'm3-east-rail-win');
    await vi.waitFor(() => expect(controller.getState().saveStatus).toBe('error'));
    const candidate = writes[0]!;
    throwSynchronously = false;
    hold = true;
    const first = controller.retrySave();
    const second = controller.retrySave();

    expect(writes).toEqual([candidate, candidate]);
    release();
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
    expect(controller.getState().profile.unlockedBlueprints).toEqual(['rail']);
  }, 10_000);

  it('detaches a selected session when returning to the map', () => {
    const controller = new FirstSessionController(completedProfile(), { save: async () => ({ revision: 1 }) });
    expect(controller.selectMission(ids[1]!)).toBe(true);
    expect(controller.showMap()).toBe(true);

    expect(controller.getState()).toMatchObject({
      screen: 'map', activeMissionId: null, mission: null, loanedBlueprints: [],
    });
    expect(controller.retryMission()).toBe(false);
  });

  it('does not retain a mutable view or a listener after disposal', () => {
    const controller = new FirstSessionController(createPlayerProfile(), { save: async () => ({ revision: 1 }) });
    const before = controller.getState();
    let calls = 0;
    controller.subscribe(() => { calls += 1; });
    controller.tapCell(21);

    expect(before.mission!.render.towers).toEqual([]);
    expect(Object.isFrozen(before)).toBe(true);
    controller.dispose();
    const disposed = calls;
    controller.tapCell(30);
    expect(calls).toBe(disposed);
  });
});
