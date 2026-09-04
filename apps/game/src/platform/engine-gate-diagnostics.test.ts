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

  it('separates lifecycle gaps from frame delivery', () => {
    const diagnostics = new EngineGateDiagnostics({ now: () => 0 });

    diagnostics.recordFrame(16, null);
    diagnostics.recordFrame(1_000, null);
    diagnostics.recordFrame(Number.NaN, null);

    const snapshot = diagnostics.snapshot();
    expect(snapshot.frames.sampleCount).toBe(1);
    expect(snapshot.frames.discardedSuspendGaps).toBe(1);
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

    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.context).toEqual({ arenaId: 'benchmark', native: true });
    expect(parsed.diagnostics.frames.sampleCount).toBe(0);
  });
});
