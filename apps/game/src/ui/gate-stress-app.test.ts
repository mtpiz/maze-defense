// @vitest-environment jsdom

import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GateStressApp } from './gate-stress-app.js';
import { GATE_STRESS_CREEP_COUNT } from '../application/gate-stress.js';
import type { FrameWorkSample } from '../platform/engine-gate-diagnostics.js';

const clock = vi.hoisted(() => ({ frame: (_milliseconds: number) => {}, work: (_sample: FrameWorkSample) => {} }));
vi.mock('../presentation/arena-view.js', () => ({ ArenaView: class {
  constructor(_mount: unknown, _tap: unknown, frame: typeof clock.frame, work: typeof clock.work) {
    clock.frame = frame;
    clock.work = work;
  }
  async initialize() {}
  render() {}
  setFrameRate() {}
  destroy() {}
} }));

let root: HTMLDivElement;
let now: number;
const writeText = vi.fn();
const click = async (name: string): Promise<void> => {
  const button = [...root.querySelectorAll('button')].find((item) => item.textContent === name);
  expect(button).toBeDefined();
  await act(() => button!.click());
};
beforeEach(() => {
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  window.history.replaceState(null, '', '/?stress&fps=30');
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  root = document.createElement('div');
  document.body.appendChild(root);
});
afterEach(async () => {
  await act(() => render(null, root));
  root.remove();
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.restoreAllMocks();
});

it('exports a reset, sustained full-load sample with fixture identity and frame budget', async () => {
  await act(() => render(h(GateStressApp, {}), root));
  const canvas = document.createElement('canvas');
  canvas.className = 'arena-canvas';
  canvas.dataset.combatArt = 'proxy-v1';
  root.querySelector('.stress-arena')!.firstElementChild!.appendChild(canvas);
  await act(() => {
    for (let frame = 0; frame < 60; frame += 1) { now += 1_000 / 30; clock.frame(1_000 / 30); }
  });
  const active = Number(root.textContent?.match(/Active(\d+)\/120/)?.[1]);
  expect(active).toBeGreaterThanOrEqual(100);
  expect(active).toBeLessThanOrEqual(GATE_STRESS_CREEP_COUNT);
  await click('Reset sample');
  await act(() => {
    for (let frame = 0; frame < 90; frame += 1) {
      now += 1_000 / 30;
      clock.frame(1_000 / 30);
      clock.work({ updateMilliseconds: 1, sceneMilliseconds: 2, renderSubmissionMilliseconds: 3 });
    }
  });
  await click('Copy JSON');
  const report = JSON.parse(writeText.mock.calls[0]![0]);
  expect(report.context).toMatchObject({
    fixtureId: 'gate-stress', fixtureVersion: 1, frameRate: 30,
    towerCount: 40,
    sampleStartCombatArt: 'proxy-v1', combatArt: 'proxy-v1',
  });
  expect(report.context.sampleStartActiveCreeps).toBeGreaterThanOrEqual(100);
  expect(report.context.activeCreeps).toBeGreaterThanOrEqual(100);
  expect(report.context.activeCreeps).toBeLessThanOrEqual(GATE_STRESS_CREEP_COUNT);
  expect(report.context.simulationTick - report.context.sampleStartTick).toBe(270);
  expect(report.diagnostics.frames).toMatchObject({ sampleCount: 90, targetFramesPerSecond: 30, longFrameCount: 0 });
  expect(report.diagnostics.sampleDurationMilliseconds).toBeCloseTo(3_000);
  expect(report.diagnostics.presentationEvents.total).toBeGreaterThan(0);
  expect(report.diagnostics.simulation.advancedTicks).toBe(270);
  expect(report.diagnostics.cpuWork.uiCommit.sampleCount).toBeGreaterThan(0);
  expect(report.diagnostics.cpuWork.frameUpdate).toMatchObject({ sampleCount: 90, p95Milliseconds: 1 });
  expect(report.diagnostics.cpuWork.scene.p95Milliseconds).toBe(2);
  expect(report.diagnostics.cpuWork.renderSubmission.p95Milliseconds).toBe(3);
});

it('reports a failed clipboard export without losing the report', async () => {
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  writeText.mockRejectedValue(new Error('denied'));
  await act(() => render(h(GateStressApp, {}), root));
  await click('Copy JSON');
  await vi.waitFor(() => expect(root.textContent).toContain('Clipboard unavailable'));
  expect(log.mock.calls[0]![1]).toContain('gate-stress');
});

it('does not count a root UI commit when first mounted in the background', async () => {
  window.history.replaceState(null, '', '/?stress&fps=60');
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  await act(() => render(h(GateStressApp, {}), root));
  await click('Copy JSON');
  const report = JSON.parse(writeText.mock.calls[0]![0]);
  expect(report.diagnostics.cpuWork.uiCommit.sampleCount).toBe(0);
});
