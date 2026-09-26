import { describe, expect, it } from 'vitest';
import { compileCampaignMission, type CampaignMissionSource, type CompiledCampaignMission } from '@tower-defense/content';
import { createMission, SIMULATION_VERSION, type MissionCommand } from '@tower-defense/sim';

// Independent architecture contract. Workers may not change this file or expectations.
const ids = ['world-01-mission-01', 'world-01-mission-02', 'world-01-rail-trial'];
const catalogPath = '../../apps/game/src/application/first-session-missions.ts';
const plansPath = '../../packages/testkit/src/first-session/replay-plans.json';
interface Catalog {
  FIRST_SESSION_SOURCES: readonly CampaignMissionSource[];
  FIRST_SESSION_MISSIONS: readonly CompiledCampaignMission[];
  compileFirstSessionCatalog(sources: readonly unknown[]): readonly CompiledCampaignMission[];
  getWaveForecasts(entry: CompiledCampaignMission): readonly {
    waveId: string; total: number; counts: Record<string, number>;
  }[];
}
interface Plan {
  id: string; missionId: string; seed: number; simulationVersion: number;
  contentHash: string; outcome: 'victory' | 'defeat'; durationTicks: number;
  determinismHash: string;
  commands: { tick: number; command: MissionCommand }[];
}
const catalog = async (): Promise<Catalog> => import(catalogPath);
const plans = async (): Promise<Plan[]> => (await import(plansPath)).default;
const replay = (entry: CompiledCampaignMission, plan: Plan, reverseAim = false) => {
  const session = createMission(entry.mission, plan.seed);
  let liveRouteChanges = 0;
  let railDamage = 0;
  let foundationDamage = 0;
  const railIds = new Set<string>();
  let previousTick = 0;
  const drain = () => {
    for (const event of session.drainPresentationEvents()) {
      if (event.type === 'creep-damaged') {
        if (railIds.has(String(event.payload.towerId))) railDamage += Number(event.payload.damage);
        else foundationDamage += Number(event.payload.damage);
      }
    }
  };
  const advanceTo = (tick: number) => {
    while (session.getUiSnapshot().tick < tick) {
      const result = session.advance(1);
      drain();
      if (result.advancedTicks === 0) { if (reverseAim) return false; throw new Error(`Replay ${plan.id} stalled before tick ${tick}`); }
    }
  };
  for (const item of plan.commands) {
    expect(Number.isSafeInteger(item.tick) && item.tick >= previousTick).toBe(true);
    expect(item.tick).toBeLessThanOrEqual(plan.durationTicks);
    previousTick = item.tick;
    if (advanceTo(item.tick) === false) break;
    const before = session.getRenderSnapshot().groundRoute;
    const live = session.getUiSnapshot().phase === 'wave' && session.getUiSnapshot().activeCreeps > 0;
    const command = reverseAim && item.command.type === 'aim-tower'
      ? { ...item.command, facingMilliDegrees: (item.command.facingMilliDegrees + 180_000) % 360_000 }
      : item.command;
    const result = session.dispatch(command);
    if (!reverseAim) expect(result, `${plan.id} tick ${item.tick}: ${JSON.stringify(command)}`).toMatchObject({ accepted: true });
    if (command.type === 'install-specialist' && command.familyId === 'rail' && result.accepted) railIds.add(command.towerId);
    if (live && command.type === 'place-foundation' && result.accepted &&
      JSON.stringify(before) !== JSON.stringify(session.getRenderSnapshot().groundRoute)) liveRouteChanges += 1;
    expect(session.getUiSnapshot().fieldCredits).toBeGreaterThanOrEqual(0);
    drain();
  }
  if (reverseAim) {
    while (!['victory', 'defeat'].includes(session.getUiSnapshot().phase) && session.getUiSnapshot().tick < plan.durationTicks + 1800) {
      if (!session.advance(1).advancedTicks) break;
      drain();
    }
  } else advanceTo(plan.durationTicks);
  return { checkpoint: session.createCheckpoint(), hash: session.getDeterminismHash(), liveRouteChanges, railDamage, foundationDamage };
};

describe('P2-03 opening campaign contract', () => {
  it('compiles exactly the required connected M1 -> M2 -> Rail trial path', async () => {
    const c = await catalog();
    expect(c.FIRST_SESSION_MISSIONS.map(e => e.mission.id)).toEqual(ids);
    expect(c.compileFirstSessionCatalog(c.FIRST_SESSION_SOURCES)).toEqual(c.FIRST_SESSION_MISSIONS);
    c.FIRST_SESSION_MISSIONS.forEach((entry, i) => {
      expect(entry).toEqual(compileCampaignMission(c.FIRST_SESSION_SOURCES[i]));
      expect(entry.progression.requires).toEqual(i ? [ids[i - 1]] : []);
      const snapshot = createMission(entry.mission).getRenderSnapshot();
      expect(snapshot.groundRoute.length).toBeGreaterThan(1);
      expect(snapshot.airRoute.length).toBeGreaterThan(1);
    });
  });
  it('keeps M1 Foundation-only, Drone-only and without Waypoints', async () => {
    const entry = (await catalog()).FIRST_SESSION_MISSIONS[0]!;
    expect(entry.mission.arena.waypointCells).toHaveLength(0);
    expect(entry.mission.waves.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(entry.mission.towerCatalog)).toEqual(['foundation']);
    expect(entry.progression).toEqual({ requires: [], loans: [], awards: [] });
    expect(entry.mission.waves.flatMap(w => w.groups).every(g => g.creepId === 'drone')).toBe(true);
    expect(entry.mission.waves[0]!.groups[0]!.firstSpawnTick).toBeLessThanOrEqual(30);
  });
  it('gives M2 one Waypoint and live Foundation construction', async () => {
    const entry = (await catalog()).FIRST_SESSION_MISSIONS[1]!;
    expect(entry.mission.arena.waypointCells).toHaveLength(1);
    expect(entry.mission.constructionPolicy).toBe('live-foundation');
    expect(Object.keys(entry.mission.towerCatalog)).toEqual(['foundation']);
    expect(entry.progression.loans).toEqual([]);
    expect(entry.progression.awards).toEqual([]);
  });
  it('loans and awards only level-one Rail at the required trial', async () => {
    const entry = (await catalog()).FIRST_SESSION_MISSIONS[2]!;
    expect(entry.progression).toEqual({ requires: [ids[1]], loans: ['rail'], awards: ['rail'] });
    expect(Object.keys(entry.mission.towerCatalog).sort()).toEqual(['foundation', 'rail']);
    expect(entry.mission.towerCatalog.rail!.weapon).toMatchObject({
      mechanicId: 'rail-line', maxTargets: 1, coverageArcMilliDegrees: 90_000, rangeMilliCells: 2_500,
    });
  });
  it('gives every wave a distinct purpose and an exact group-derived forecast', async () => {
    const c = await catalog();
    for (const entry of c.FIRST_SESSION_MISSIONS) {
      const purposes = entry.mission.waves.map(w => w.tacticalPurpose.trim());
      expect(purposes.every(p => p.length >= 20)).toBe(true);
      expect(new Set(purposes).size).toBe(purposes.length);
      expect(c.getWaveForecasts(entry)).toEqual(entry.mission.waves.map(wave => {
        const counts: Record<string, number> = {};
        for (const group of wave.groups) counts[group.creepId] = (counts[group.creepId] ?? 0) + group.count;
        return { waveId: wave.id, total: Object.values(counts).reduce((a, b) => a + b, 0), counts };
      }));
    }
  });
  it.each(['duplicate', 'missing', 'cycle', 'unreachable-trial'])( 'rejects %s catalog topology', async kind => {
    const c = await catalog();
    const source = structuredClone(c.FIRST_SESSION_SOURCES) as CampaignMissionSource[];
    if (kind === 'duplicate') source.push(source[0]!);
    if (kind === 'missing') Object.assign(source[1]!.progression, { requires: ['missing-mission'] });
    if (kind === 'cycle') Object.assign(source[0]!.progression, { requires: [ids[2]] });
    if (kind === 'unreachable-trial') Object.assign(source[2]!.progression, { requires: [] });
    expect(() => c.compileFirstSessionCatalog(source)).toThrow();
  });
  it.each(['ground', 'air'])('rejects an impossible initial %s route', async layer => {
    const c = await catalog();
    const source = structuredClone(c.FIRST_SESSION_SOURCES) as CampaignMissionSource[];
    Object.assign(source[0]!.mission, { arena: {
      schemaVersion: 2, id: 'blocked-arena', name: 'Blocked', width: 3, height: 3,
      spawn: { x: 0, y: 1 }, exit: { x: 2, y: 1 }, waypoints: [], inactive: [],
      terrain: [{ id: 'wall', cells: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
        buildable: false, traversable: { ground: layer !== 'ground', air: layer !== 'air' } }],
    } });
    expect(() => c.compileFirstSessionCatalog(source)).toThrow();
  });
  it.each(ids)('replays affordable winning and empty-layout losing plans for %s', async id => {
    const entry = (await catalog()).FIRST_SESSION_MISSIONS.find(e => e.mission.id === id)!;
    const fixtures = (await plans()).filter(p => p.missionId === id);
    expect(fixtures.some(p => p.outcome === 'victory')).toBe(true);
    expect(fixtures.some(p => p.outcome === 'defeat' && p.commands.every(c => c.command.type === 'start-wave' || c.command.type === 'early-launch'))).toBe(true);
    for (const plan of fixtures) {
      expect(plan.simulationVersion).toBe(SIMULATION_VERSION);
      expect(plan.contentHash).toBe(entry.contentHash);
      expect(Number.isSafeInteger(plan.seed)).toBe(true);
      expect(plan.durationTicks).toBeGreaterThan(0);
      expect(plan.durationTicks).toBeLessThanOrEqual(18_000);
      const first = replay(entry, plan);
      expect(first.checkpoint.phase).toBe(plan.outcome);
      expect(first.checkpoint.tick).toBe(plan.durationTicks);
      expect(first.hash).toBe(plan.determinismHash);
      expect(replay(entry, plan).checkpoint).toEqual(first.checkpoint);
      if (plan.outcome === 'victory') {
        expect(first.foundationDamage).toBeGreaterThan(0);
        if (id === ids[0]) {
          expect(plan.durationTicks / 30).toBeGreaterThanOrEqual(180);
          expect(plan.durationTicks / 30).toBeLessThanOrEqual(300);
        }
        if (id === ids[1]) expect(first.liveRouteChanges).toBeGreaterThan(0);
        if (id === ids[2]) {
          expect(first.railDamage).toBeGreaterThan(0);
          expect(plan.commands.some(c => c.command.type === 'aim-tower')).toBe(true);
        }
      }
    }
  }, 120_000);
  it('has two materially different winning Rail placements with consequential facing', async () => {
    const entry = (await catalog()).FIRST_SESSION_MISSIONS[2]!;
    const wins = (await plans()).filter(p => p.missionId === ids[2] && p.outcome === 'victory');
    expect(wins.length).toBeGreaterThanOrEqual(2);
    const layouts = wins.map(p => replay(entry, p).checkpoint.towers
      .filter(tower => tower.familyId === 'rail').map(tower => tower.cell).sort((a, b) => a - b).join(','));
    expect(new Set(layouts).size).toBeGreaterThanOrEqual(2);
    const good = replay(entry, wins[0]!);
    const bad = replay(entry, wins[0]!, true);
    expect(bad.railDamage).toBeLessThan(good.railDamage);
    expect(bad.checkpoint.defeatedCreeps).toBeLessThan(good.checkpoint.defeatedCreeps);
  }, 120_000);
});
