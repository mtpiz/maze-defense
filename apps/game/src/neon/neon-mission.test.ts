import { describe, expect, it } from 'vitest';
import { BenchmarkController } from '../application/benchmark-controller.js';
import { NEON_MISSION } from './neon-mission.js';

const TERMINAL_RUN_TOWERS = [
  { cell: 29, family: 'rail' }, { cell: 42, family: 'siege' },
  { cell: 74, family: 'arc' }, { cell: 96, family: 'rail' },
  { cell: 48, family: 'foundation' }, { cell: 57, family: 'foundation' },
  { cell: 76, family: 'foundation' }, { cell: 77, family: 'foundation' },
] as const;

describe('isolated neon comparison mission', () => {
  it('authors distinct directional coverage for all three specialists', () => {
    expect(NEON_MISSION.towerCatalog.rail?.weapon).toMatchObject({
      rangeMilliCells: 2_500, minimumRangeMilliCells: 0, coverageArcMilliDegrees: 90_000,
      maxTargets: 1,
    });
    expect(NEON_MISSION.towerCatalog.siege?.weapon).toMatchObject({
      rangeMilliCells: 3_500, minimumRangeMilliCells: 1_250, coverageArcMilliDegrees: 90_000,
    });
    expect(NEON_MISSION.towerCatalog.arc?.weapon).toMatchObject({
      rangeMilliCells: 2_250, minimumRangeMilliCells: 0, coverageArcMilliDegrees: 180_000,
      jumpRangeMilliCells: 1_250, maxTargets: 3,
    });
  });
  it('keeps the original benchmark at two specialists', () => {
    expect(new BenchmarkController().getState().specialistOptions.map((o) => o.familyId))
      .toEqual(['rail', 'siege']);
  });
  it('exposes three actual specialists, charges once, and preserves retry content', () => {
    const controller = new BenchmarkController(NEON_MISSION);
    expect(controller.getState().specialistOptions.map((o) => o.familyId)).toEqual(['rail', 'siege', 'arc']);
    controller.tapCell(42);
    const placed = controller.getState();
    expect(placed.ui.fieldCredits).toBe(NEON_MISSION.openingFieldCredits - 10);
    controller.installSelected('arc');
    const installed = controller.getState();
    expect(installed.render.towers[0]?.weapon.mechanicId).toBe('arc-chain');
    expect(installed.ui.fieldCredits).toBe(placed.ui.fieldCredits - 45);
    controller.installSelected('arc');
    expect(controller.getState().ui.fieldCredits).toBe(installed.ui.fieldCredits);
    controller.startWave();
    controller.retry();
    expect(controller.getState().render.towers[0]?.familyId).toBe('arc');
    expect(controller.getState().briefing.title).toBe('Neon Contact');
  });
  it('runs the seeded comparison to a terminal result and restores its opening', () => {
    const controller = new BenchmarkController(NEON_MISSION);
    for (const t of TERMINAL_RUN_TOWERS) {
      controller.tapCell(t.cell);
      if (t.family !== 'foundation') controller.installSelected(t.family);
    }
    const opening = controller.getState();
    controller.startWave();
    controller.cycleSpeed(); controller.cycleSpeed();
    for (let frame = 0; frame < 12000; frame++) {
      controller.advanceFrame(100);
      if (['victory', 'defeat'].includes(controller.getState().ui.phase)) break;
    }
    expect(['victory', 'defeat']).toContain(controller.getState().ui.phase);
    expect(controller.getState().ui.defeatedCreeps).toBeGreaterThan(0);
    controller.retry();
    expect(controller.getState().render.towers).toEqual(opening.render.towers);
    expect(controller.getState().ui.fieldCredits).toBe(opening.ui.fieldCredits);
  });
});
