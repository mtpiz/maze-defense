import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Capacitor } from '@capacitor/core';
import { SIMULATION_TICKS_PER_SECOND, type PresentationEvent } from '@tower-defense/sim';
import type { BenchmarkViewState } from '../application/benchmark-controller.js';
import { createGateStressSession, GATE_STRESS_CREEP_COUNT } from '../application/gate-stress.js';
import { EngineGateDiagnostics, readJsHeapSample, serializeDiagnosticsReport } from '../platform/engine-gate-diagnostics.js';
import { copyDiagnosticsReport } from '../platform/copy-diagnostics-report.js';
import { ArenaView } from '../presentation/arena-view.js';

interface StressReadout {
  readonly activeCreeps: number;
  readonly eventCount: number;
  readonly framesPerSecond: number;
  readonly frameP95: number;
  readonly tick: number;
}

const createViewState = (
  session: ReturnType<typeof createGateStressSession>,
  recentEvents: readonly PresentationEvent[],
): BenchmarkViewState => Object.freeze({
  render: session.getRenderSnapshot(),
  ui: session.getUiSnapshot(),
  selectedTowerId: null,
  specialistOptions: Object.freeze([]),
  recentEvents,
  feedback: Object.freeze({ sequence: 0, text: 'Stress fixture active.', tone: 'neutral' }),
  briefing: Object.freeze({ title: 'Concurrent Pressure', families: Object.freeze([]) }),
});

export const GateStressApp = () => {
  const renderStartedAt = performance.now();
  const frameRate = new URLSearchParams(window.location.search).get('fps') === '30' ? 30 : 60;
  const session = useMemo(() => createGateStressSession(), []);
  const diagnostics = useMemo(() => new EngineGateDiagnostics(), []);
  useLayoutEffect(() => {
    if (document.visibilityState === 'visible') diagnostics.recordUiCommit(performance.now() - renderStartedAt);
  });
  const mountRef = useRef<HTMLDivElement>(null);
  const sampleStart = useRef({ tick: 0, activeCreeps: 0, combatArt: 'unavailable' });
  const [exportStatus, setExportStatus] = useState('');
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [readout, setReadout] = useState<StressReadout>(() => ({
    activeCreeps: 0,
    eventCount: 0,
    framesPerSecond: 0,
    frameP95: 0,
    tick: 0,
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) return;
    let tickAccumulator = 0;
    let lastReadoutAt = performance.now();
    let disposed = false;
    const onVisibilityChange = (): void => {
      diagnostics.recordVisibility(document.visibilityState === 'visible');
      tickAccumulator = 0;
    };
    diagnostics.setFrameRate(frameRate);
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);

    const frame = (elapsedMilliseconds: number): void => {
      if (document.visibilityState !== 'visible') return;
      const time = performance.now();
      tickAccumulator += (
        Math.max(0, Math.min(elapsedMilliseconds, 100)) * SIMULATION_TICKS_PER_SECOND * 3
      ) / 1_000;
      const wholeTicks = Math.floor(tickAccumulator);
      let simulationSample = null;
      if (wholeTicks > 0) {
        tickAccumulator -= wholeTicks;
        const startedAt = performance.now();
        const result = session.advance(wholeTicks);
        simulationSample = {
          advancedTicks: result.advancedTicks,
          simulationMilliseconds: performance.now() - startedAt,
        };
      }
      const events = session.drainPresentationEvents();
      diagnostics.recordFrame(elapsedMilliseconds, simulationSample);
      diagnostics.recordPresentationEvents(events);
      const state = createViewState(session, events);
      view.render(state, { highContrast: false, reducedMotion: false, showAirRoute: false });

      if (time - lastReadoutAt >= 500) {
        diagnostics.recordMemory(readJsHeapSample());
        const snapshot = diagnostics.snapshot();
        setReadout({
          activeCreeps: state.render.creeps.length,
          eventCount: snapshot.presentationEvents.total,
          framesPerSecond: snapshot.frames.estimatedFramesPerSecond,
          frameP95: snapshot.frames.p95Milliseconds,
          tick: state.render.tick,
        });
        lastReadoutAt = time;
      }
    };

    const view = new ArenaView(mount, () => undefined, frame, (sample) => diagnostics.recordFrameWork(sample));
    view.setFrameRate(frameRate);
    void view.initialize().catch((error: unknown) => {
      if (disposed) return;
      setRendererError(error instanceof Error ? error.message : 'The stress renderer could not start.');
    });

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      view.destroy();
    };
  }, [diagnostics, frameRate, session]);

  const resetSample = (): void => {
    const state = session.getRenderSnapshot();
    sampleStart.current = { tick: state.tick, activeCreeps: state.creeps.length,
      combatArt: mountRef.current?.querySelector<HTMLCanvasElement>('canvas')?.dataset.combatArt ?? 'unavailable' };
    diagnostics.reset();
    diagnostics.recordVisibility(document.visibilityState === 'visible');
    setExportStatus('Sample reset.');
  };
  const copyReport = async (): Promise<void> => {
    const state = session.getRenderSnapshot();
    const report = serializeDiagnosticsReport(diagnostics.snapshot(), {
      capturedAt: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      nativePlatform: Capacitor.isNativePlatform(),
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      visibilityState: document.visibilityState,
      fixtureId: 'gate-stress',
      fixtureVersion: 1,
      arenaId: state.arenaId,
      simulationVersion: state.simulationVersion,
      simulationTick: state.tick,
      sampleStartTick: sampleStart.current.tick,
      sampleStartActiveCreeps: sampleStart.current.activeCreeps,
      sampleStartCombatArt: sampleStart.current.combatArt,
      combatArt: mountRef.current?.querySelector<HTMLCanvasElement>('canvas')?.dataset.combatArt ?? 'unavailable',
      activeCreeps: state.creeps.length,
      towerCount: state.towers.length,
      simulationSpeed: 3,
      frameRate,
    });
    setExportStatus(await copyDiagnosticsReport(report));
  };

  return (
    <main class="game-shell stress-shell">
      <header class="stress-hud" aria-label="Stress fixture status">
        <div><span>Fixture</span><strong>20×20</strong></div>
        <div><span>Active</span><strong>{readout.activeCreeps}/{GATE_STRESS_CREEP_COUNT}</strong></div>
        <div><span>Towers</span><strong>40</strong></div>
        <div><span>Speed</span><strong>3×</strong></div>
        <div><span>FPS / {frameRate}</span><strong>{readout.framesPerSecond.toFixed(0)}</strong></div>
      </header>
      <section class="arena-region stress-arena" aria-label="Engine Gate stress Arena">
        {rendererError === null ? (
          <div class="arena-surface" ref={mountRef} />
        ) : (
          <div class="renderer-error" role="alert">{rendererError}</div>
        )}
      </section>
      <footer class="stress-readout" aria-label="Stress diagnostics">
        <span>Tick <strong>{readout.tick}</strong></span>
        <span>Events <strong>{readout.eventCount}</strong></span>
        <span>Frame p95 <strong>{readout.frameP95.toFixed(1)} ms</strong></span>
        <div class="stress-actions">
          <button type="button" onClick={resetSample}>Reset sample</button>
          <button type="button" onClick={copyReport}>Copy JSON</button>
        </div>
        <p class="stress-export-status" role="status">{exportStatus}</p>
      </footer>
    </main>
  );
};
