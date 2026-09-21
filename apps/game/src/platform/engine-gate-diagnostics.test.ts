import { describe, expect, it } from 'vitest';
import {
  EngineGateDiagnostics,
  serializeDiagnosticsReport,
  type EngineGateDiagnosticsSnapshot,
} from './engine-gate-diagnostics.js';

const presentationEvent = (type: 'construction' | 'wave-started', sequence: number) =>
  Object.freeze({
    id: `event-${sequence}`,
    sequence,
    tick: sequence,
    type,
    payload: Object.freeze({}),
  });

describe('EngineGateDiagnostics', () => {
  it('keeps bounded, separate CPU work buckets without claiming GPU execution time', () => {
    const diagnostics = new EngineGateDiagnostics({ sampleCapacity: 2, now: () => 0 });
    for (const milliseconds of [1, 2, 3]) {
      diagnostics.recordFrameWork({ updateMilliseconds: milliseconds, sceneMilliseconds: milliseconds * 2,
        renderSubmissionMilliseconds: milliseconds * 3 });
      diagnostics.recordUiCommit(milliseconds * 4);
    }
    const snapshot = diagnostics.snapshot();
    expect(snapshot.cpuWork.frameUpdate).toMatchObject({ sampleCount: 2, averageMilliseconds: 2.5 });
    expect(snapshot.cpuWork.scene).toMatchObject({ sampleCount: 2, averageMilliseconds: 5 });
    expect(snapshot.cpuWork.renderSubmission).toMatchObject({ sampleCount: 2, averageMilliseconds: 7.5 });
    expect(snapshot.cpuWork.uiCommit).toMatchObject({ sampleCount: 2, averageMilliseconds: 10 });
    expect(snapshot.gpuTiming).toBe('not-measured');
  });

  it('rejects invalid CPU samples atomically and ignores work while hidden', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });
    diagnostics.recordFrameWork({ updateMilliseconds: -1, sceneMilliseconds: 2, renderSubmissionMilliseconds: 3 });
    diagnostics.recordFrameWork({ updateMilliseconds: 1, sceneMilliseconds: NaN, renderSubmissionMilliseconds: 3 });
    diagnostics.recordUiCommit(Infinity);
    diagnostics.recordVisibility(false);
    diagnostics.recordFrameWork({ updateMilliseconds: 1, sceneMilliseconds: 2, renderSubmissionMilliseconds: 3 });
    diagnostics.recordUiCommit(1);
    for (const summary of Object.values(diagnostics.snapshot().cpuWork)) expect(summary.sampleCount).toBe(0);
    diagnostics.recordVisibility(true);
    diagnostics.recordFrameWork({ updateMilliseconds: 500, sceneMilliseconds: 2, renderSubmissionMilliseconds: 3 });
    expect(diagnostics.snapshot().cpuWork.frameUpdate.maxMilliseconds).toBe(500);
  });

  it('clears every CPU bucket on sample reset and frame-mode changes', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });
    for (const reset of [() => diagnostics.reset(), () => diagnostics.setFrameRate(30)]) {
      diagnostics.recordFrameWork({ updateMilliseconds: 1, sceneMilliseconds: 2, renderSubmissionMilliseconds: 3 });
      diagnostics.recordUiCommit(4);
      reset();
      for (const summary of Object.values(diagnostics.snapshot().cpuWork)) expect(summary.sampleCount).toBe(0);
    }
  });

  it('uses the selected frame budget and separates samples when the mode changes', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });
    diagnostics.recordFrame(16, null);
    diagnostics.setFrameRate(30);
    diagnostics.recordFrame(33.4, null);
    diagnostics.recordFrame(50, null);
    expect(diagnostics.snapshot().frames).toMatchObject({
      targetFramesPerSecond: 30, longFrameThresholdMilliseconds: 40,
      sampleCount: 2, longFrameCount: 1,
    });
    diagnostics.setFrameRate(30);
    expect(diagnostics.snapshot().frames.sampleCount).toBe(2);
    diagnostics.setFrameRate(60);
    diagnostics.recordFrame(20, null);
    expect(diagnostics.snapshot().frames).toMatchObject({
      targetFramesPerSecond: 60, longFrameThresholdMilliseconds: 20,
      sampleCount: 1, longFrameCount: 1,
    });
  });
  it('keeps a bounded rolling frame and simulation sample', () => {
    let now = 100;
    const diagnostics = new EngineGateDiagnostics({ sampleCapacity: 2, now: () => now });

    diagnostics.recordFrame(10, { advancedTicks: 1, simulationMilliseconds: 0.5 });
    diagnostics.recordFrame(20, { advancedTicks: 2, simulationMilliseconds: 1.5 });
    diagnostics.recordFrame(30, { advancedTicks: 3, simulationMilliseconds: 2.5 });
    now = 1_100;

    const snapshot = diagnostics.snapshot();
    expect(snapshot.sampleDurationMilliseconds).toBe(1_000);
    expect(snapshot.frames.sampleCount).toBe(2);
    expect(snapshot.frames.averageMilliseconds).toBe(25);
    expect(snapshot.frames.p95Milliseconds).toBe(30);
    expect(snapshot.frames.longFrameCount).toBe(2);
    expect(snapshot.simulation.sampleCount).toBe(2);
    expect(snapshot.simulation.averageMilliseconds).toBe(2);
    expect(snapshot.simulation.advancedTicks).toBe(6);
  });

  it('retains foreground stalls and their simulation work without a lifecycle transition', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });

    diagnostics.recordFrame(16, { advancedTicks: 1, simulationMilliseconds: 0.5 });
    diagnostics.recordFrame(500, { advancedTicks: 3, simulationMilliseconds: 300 });
    diagnostics.recordFrame(16, null);

    const snapshot = diagnostics.snapshot();
    expect(snapshot.frames).toMatchObject({
      sampleCount: 3, maxMilliseconds: 500, p95Milliseconds: 500,
      longFrameCount: 1, discardedSuspendGaps: 0,
    });
    expect(snapshot.frames.estimatedFramesPerSecond).toBeCloseTo(3_000 / 532);
    expect(snapshot.simulation).toMatchObject({ sampleCount: 2, advancedTicks: 4, maxMilliseconds: 300 });
  });

  it('separates explicit background intervals from foreground frame delivery', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });

    diagnostics.recordFrame(16, null);
    diagnostics.recordVisibility(false);
    diagnostics.recordFrame(1_000, null);
    diagnostics.recordVisibility(true);
    diagnostics.recordFrame(Number.NaN, null);
    diagnostics.recordFrame(500, { advancedTicks: 1, simulationMilliseconds: 300 });
    diagnostics.recordFrame(16, null);

    const snapshot = diagnostics.snapshot();
    expect(snapshot.frames.sampleCount).toBe(2);
    expect(snapshot.frames.discardedSuspendGaps).toBe(2);
    expect(snapshot.frames.estimatedFramesPerSecond).toBe(62.5);
    expect(snapshot.simulation.maxMilliseconds).toBe(300);
    expect(snapshot.simulation.advancedTicks).toBe(1);
    expect(snapshot.lifecycle.map(({ type }) => type)).toEqual(['visibility:hidden', 'visibility:visible']);
  });

  it('excludes a short background transition but retains the next foreground hitch', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });

    diagnostics.recordVisibility(false);
    diagnostics.recordVisibility(true);
    diagnostics.recordFrame(20, null);
    diagnostics.recordFrame(500, null);

    const snapshot = diagnostics.snapshot();
    expect(snapshot.frames).toMatchObject({ sampleCount: 1, maxMilliseconds: 500, discardedSuspendGaps: 1 });
  });

  it('retains background state when resetting the measurement sample', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });
    diagnostics.recordVisibility(false);
    diagnostics.reset();
    diagnostics.recordVisibility(true);
    diagnostics.recordFrame(1_000, null);
    diagnostics.recordFrame(16, null);

    const snapshot = diagnostics.snapshot();
    expect(snapshot.frames.discardedSuspendGaps).toBe(1);
    expect(snapshot.frames.sampleCount).toBe(1);
    expect(snapshot.frames.estimatedFramesPerSecond).toBe(62.5);
  });

  it('counts presentation events and tracks current and peak JavaScript heap', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });
    diagnostics.recordPresentationEvents([
      presentationEvent('construction', 1),
      presentationEvent('construction', 2),
      presentationEvent('wave-started', 3),
    ]);
    diagnostics.recordMemory({ usedBytes: 100, totalBytes: 200, limitBytes: 1_000 });
    diagnostics.recordMemory({ usedBytes: 80, totalBytes: 200, limitBytes: 1_000 });

    const snapshot = diagnostics.snapshot();
    expect(snapshot.presentationEvents).toEqual({
      total: 3,
      byType: { construction: 2, 'wave-started': 1 },
    });
    expect(snapshot.jsHeap.current?.usedBytes).toBe(80);
    expect(snapshot.jsHeap.peakUsedBytes).toBe(100);
  });

  it('resets all accumulated evidence', () => {
    let now = 10;
    const diagnostics = new EngineGateDiagnostics({ now: () => now });
    diagnostics.recordFrame(20, { advancedTicks: 2, simulationMilliseconds: 1 });
    diagnostics.recordLifecycle('hidden');
    now = 50;

    diagnostics.reset();
    now = 70;
    const snapshot = diagnostics.snapshot();
    expect(snapshot.sampleDurationMilliseconds).toBe(20);
    expect(snapshot.frames.sampleCount).toBe(0);
    expect(snapshot.simulation.advancedTicks).toBe(0);
    expect(snapshot.lifecycle).toEqual([]);
  });

  it('serializes a versioned report with capture context', () => {
    const snapshot = new EngineGateDiagnostics({ now: () => 0 }).snapshot();
    const parsed = JSON.parse(
      serializeDiagnosticsReport(snapshot, { arenaId: 'benchmark', native: true }),
    ) as {
      schemaVersion: number;
      context: Record<string, unknown>;
      diagnostics: EngineGateDiagnosticsSnapshot;
    };

    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.context).toEqual({ arenaId: 'benchmark', native: true });
    expect(parsed.diagnostics.frames.sampleCount).toBe(0);
  });
});
