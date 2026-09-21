import { describe, expect, it } from 'vitest';
import { createMission } from '@tower-defense/sim';
import { BenchmarkController } from './benchmark-controller.js';
import { GATE_MISSION } from './gate-mission.js';
import { aimTowersForRoute } from './directional-defense.test-helper.js';

describe('playable combat Mission', () => {
  it('exposes fractional tick progress for smooth rendering without advancing combat', () => {
    const controller = new BenchmarkController();
    controller.startWave();
    controller.advanceFrame(50);
    expect(controller.interpolationAlpha).toBeCloseTo(.5);
    const tick = controller.getState().render.tick;
    controller.advanceFrame(5);
    expect(controller.interpolationAlpha).toBeCloseTo(.65);
    expect(controller.getState().render.tick).toBe(tick);
  });
  it('aims the selected specialist during planning and waves, then restores the opening facing on retry', () => {
    const controller = new BenchmarkController();
    controller.tapCell(42);
    controller.installSelected('rail');
    controller.aimSelected(90_000);
    expect(controller.getState().render.towers[0]?.facingMilliDegrees).toBe(90_000);
    expect(controller.getState().feedback.text).toBe('Rail facing locked.');
    controller.startWave();
    controller.tapCell(42);
    controller.aimSelected(180_000);
    expect(controller.getState().render.towers[0]?.facingMilliDegrees).toBe(180_000);
    expect(controller.getState().feedback.text).toBe('Rail facing locked.');
    controller.retry();
    expect(controller.getState().render.towers[0]?.facingMilliDegrees).toBe(90_000);
  });
  it.each([1, 2, 3])('preserves combat outcomes at 30 and 60 FPS at %ix simulation speed', (speed) => {
    const run = (frameRate: number) => {
      const controller = new BenchmarkController();
      controller.tapCell(42);
      controller.installSelected('rail');
      controller.startWave();
      for (let step = 1; step < speed; step += 1) controller.cycleSpeed();
      for (let frame = 0; frame < frameRate * 5; frame += 1) controller.advanceFrame(1_000 / frameRate);
      return controller.getState();
    };
    expect(run(30)).toEqual(run(60));
  });
  it('pauses on background and requires an explicit resume without replaying hidden time', () => {
    const controller = new BenchmarkController();
    controller.startWave();
    controller.advanceFrame(50);
    const before = controller.getState();
    controller.setForeground(false);
    expect(controller.getState().ui.paused).toBe(true);
    expect(controller.advanceFrame(30_000)).toBeNull();
    expect(controller.getState().render.tick).toBe(before.render.tick);
    controller.setForeground(true);
    expect(controller.advanceFrame(30_000)).toBeNull();
    expect(controller.getState().ui.paused).toBe(true);
    controller.togglePause();
    expect(controller.getState().feedback.text).toBe('Mission resumed.');
    expect(controller.advanceFrame(20)).toBeNull();
    expect(controller.getState().render.tick).toBe(before.render.tick);
    controller.advanceFrame(20);
    expect(controller.getState().render.tick).toBe(before.render.tick + 1);
  });

  it('does not resume an existing manual pause or change an untimed opening', () => {
    const controller = new BenchmarkController();
    const opening = controller.getState();
    controller.setForeground(false);
    controller.setForeground(true);
    expect(controller.getState()).toEqual(opening);
    controller.startWave();
    controller.togglePause();
    const paused = controller.getState();
    controller.setForeground(false);
    controller.setForeground(false);
    controller.setForeground(true);
    expect(controller.getState()).toEqual(paused);
  });

  it('freezes between-wave planning instead of auto-launching while away', () => {
    const controller = new BenchmarkController();
    controller.startWave();
    controller.cycleSpeed();
    controller.cycleSpeed();
    for (let frame = 0; frame < 2_000 && controller.getState().ui.phase === 'wave'; frame += 1) {
      controller.advanceFrame(100);
    }
    const planning = controller.getState().ui;
    expect(planning.phase).toBe('planning');
    controller.setForeground(false);
    for (let frame = 0; frame < 300; frame += 1) controller.advanceFrame(100);
    controller.setForeground(true);
    expect(controller.getState().ui).toMatchObject({
      phase: 'planning', paused: true, planningTicksRemaining: planning.planningTicksRemaining,
    });
    controller.togglePause();
    controller.advanceFrame(100);
    expect(controller.getState().ui.planningTicksRemaining).toBe(planning.planningTicksRemaining - 3);
  });

  it('discloses only the visible wave, with counts matching the encounter', () => {
    const controller = new BenchmarkController();
    expect(controller.getState().briefing).toMatchObject({
      title: 'First Contact', families: [{ count: 10, definition: { id: 'drone' } }],
    });
    controller.startWave();
    controller.cycleSpeed();
    controller.cycleSpeed();
    for (let frame = 0; frame < 2_000 && controller.getState().ui.phase === 'wave'; frame += 1) {
      controller.advanceFrame(100);
    }
    expect(controller.getState().ui.phase).toBe('planning');
    expect(controller.getState().briefing.title).toBe('Brood Surge');
    expect(controller.getState().briefing.families.reduce((sum, family) => sum + family.count, 0))
      .toBe(controller.getState().ui.waveCreepCount);
    for (let frame = 0; frame < 10; frame += 1) controller.advanceFrame(100);
    expect(controller.getState().ui.planningTicksRemaining).toBe(17 * 30);
  });

  it('restores only the accepted opening construction and allows a clean retry', () => {
    const controller = new BenchmarkController();
    controller.tapCell(42);
    controller.installSelected('rail');
    controller.tapCell(GATE_MISSION.arena.spawnCell);
    const opening = controller.getState();
    controller.startWave();
    controller.tapCell(83);
    expect(controller.getState().render.towers.length).toBe(2);
    controller.retry();
    expect(controller.getState().render.towers).toEqual(opening.render.towers);
    expect(controller.getState().ui).toMatchObject({ phase: 'opening', fieldCredits: 135, lives: 20 });
    controller.startWave();
    controller.retry();
    expect(controller.getState().render.towers).toEqual(opening.render.towers);
    controller.retry(false);
    expect(controller.getState().render.towers).toEqual([]);
    expect(controller.getState().ui.fieldCredits).toBe(180);
  });

  it('announces leaking families through the existing accessible feedback', () => {
    const controller = new BenchmarkController();
    const warnings: string[] = [];
    controller.subscribe(({ feedback }) => {
      if (feedback.tone === 'warning') warnings.push(feedback.text);
    });
    controller.startWave();
    for (let frame = 0; frame < 1_000 && warnings.length === 0; frame += 1) controller.advanceFrame(100);
    expect(warnings).toContain('Drone leaked. -1 Life.');
  });

  it('loses an undefended Mission and gives guaranteed income more weight than bounties', () => {
    const session = createMission(GATE_MISSION);
    session.dispatch({ type: 'start-wave' });
    for (let phase = 0; phase < 12 && session.getUiSnapshot().phase !== 'defeat'; phase += 1) {
      session.advance(30_000);
    }
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'defeat', stars: 0 });
    const income = GATE_MISSION.waves.reduce((sum, wave) => sum + (wave.fieldCreditAllotment ?? 0), 0);
    const bounties = GATE_MISSION.waves.flatMap((wave) => wave.groups)
      .reduce((sum, group) => sum + group.count * GATE_MISSION.creeps[group.creepId]!.fieldCreditBounty, 0);
    expect(income).toBeGreaterThan(bounties);
  });

  it.each([
    [42, 83, 47, 76, 29, 66, 24, 102, 100, 88],
    [38, 83, 47, 76, 29, 66, 24, 102, 100, 88],
  ])('can clear all six waves with a staged Rail/Siege defense (%j)', (...cells) => {
    const session = createMission(GATE_MISSION, 42);
    let next = 0;
    for (let wave = 0; wave < GATE_MISSION.waves.length; wave += 1) {
      while (next < cells.length) {
        const familyId = next % 3 === 2 ? 'siege' : 'rail';
        const cost = 10 + GATE_MISSION.towerCatalog[familyId]!.fieldCreditCost;
        if (session.getUiSnapshot().fieldCredits < cost) break;
        expect(session.dispatch({ type: 'place-foundation', cell: cells[next]! }).accepted).toBe(true);
        const tower = session.getRenderSnapshot().towers.at(-1)!;
        expect(session.dispatch({ type: 'install-specialist', towerId: tower.id, familyId }).accepted).toBe(true);
        next += 1;
      }
      aimTowersForRoute(session);
      session.dispatch({ type: wave === 0 ? 'start-wave' : 'early-launch' });
      session.advance(30_000);
      expect(session.getUiSnapshot().phase).not.toBe('defeat');
    }
    expect(session.getUiSnapshot()).toMatchObject({ phase: 'victory', completedWaves: 6 });
    expect(session.getUiSnapshot().defeatedCreeps).toBeGreaterThan(100);
  });
});
