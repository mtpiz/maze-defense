import { Capacitor } from '@capacitor/core';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  BenchmarkController,
  type BenchmarkViewState,
} from '../application/benchmark-controller.js';
import { ArenaView, type VisualPreferences } from '../presentation/arena-view.js';
import {
  EngineGateDiagnostics,
  readJsHeapSample,
  serializeDiagnosticsReport,
  type EngineGateDiagnosticsSnapshot,
} from '../platform/engine-gate-diagnostics.js';

interface ArenaSurfaceProps {
  readonly controller: BenchmarkController;
  readonly state: BenchmarkViewState;
  readonly preferences: VisualPreferences;
  readonly onError: (message: string | null) => void;
}

const ArenaSurface = ({ controller, state, preferences, onError }: ArenaSurfaceProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ArenaView | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) return;
    const view = new ArenaView(mount, (cell) => controller.tapCell(cell));
    viewRef.current = view;
    void view.initialize().catch((error: unknown) => {
      onError(error instanceof Error ? error.message : 'The Arena renderer could not start.');
    });
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [controller, onError]);

  useEffect(() => {
    viewRef.current?.render(state, preferences);
  }, [preferences, state]);

  return <div class="arena-surface" ref={mountRef} />;
};

interface AccessibleArenaGridProps {
  readonly controller: BenchmarkController;
  readonly state: BenchmarkViewState;
}

const AccessibleArenaGrid = ({ controller, state }: AccessibleArenaGridProps) => {
  const inactive = new Set(state.render.inactiveCells);
  const terrain = new Map(state.render.terrainCells.map((cell) => [cell.cell, cell]));
  const waypoints = new Map(state.render.waypointCells.map((cell, index) => [cell, index + 1]));
  const towers = new Set(state.render.towers.map(({ cell }) => cell));
  const cellCount = state.render.arenaWidth * state.render.arenaHeight;

  return (
    <div class="screen-reader-grid" role="grid" aria-label="Arena build grid">
      {Array.from({ length: cellCount }, (_, cell) => {
        const row = Math.floor(cell / state.render.arenaWidth) + 1;
        const column = (cell % state.render.arenaWidth) + 1;
        const waypoint = waypoints.get(cell);
        const terrainCell = terrain.get(cell);
        const kind =
          inactive.has(cell)
            ? 'outside Arena shape, unavailable'
            : cell === state.render.spawnCell
            ? 'spawn, unavailable'
            : cell === state.render.exitCell
              ? 'exit, unavailable'
              : waypoint !== undefined
                ? `Waypoint ${waypoint}, unavailable`
                : terrainCell !== undefined && !terrainCell.buildable
                  ? `${terrainCell.terrainId.replaceAll('-', ' ')} terrain, unavailable`
                  : towers.has(cell)
                    ? 'Foundation tower'
                    : 'open build tile';
        return (
          <button
            key={cell}
            type="button"
            role="gridcell"
            aria-label={`Row ${row}, column ${column}: ${kind}`}
            disabled={inactive.has(cell)}
            onClick={() => controller.tapCell(cell)}
          />
        );
      })}
    </div>
  );
};

const phaseLabel = (phase: BenchmarkViewState['ui']['phase']): string => {
  switch (phase) {
    case 'opening':
      return 'Opening plan';
    case 'planning':
      return 'Planning';
    case 'wave':
      return 'Wave active';
    case 'victory':
      return 'Benchmark clear';
    case 'defeat':
      return 'Integrity lost';
  }
};

const towerDescription = (familyId: BenchmarkViewState['render']['towers'][number]['familyId']) => {
  switch (familyId) {
    case 'foundation':
      return 'Ground maze · weak direct pulse';
    case 'rail':
      return 'Long range · Ground + Air · line penetration';
    case 'siege':
      return 'Delayed Ground blast · cluster damage';
    case 'arc':
      return 'Arc is outside this Gate slice';
    case 'gravity':
      return 'Gravity is outside this Gate slice';
  }
};

const formatMilliseconds = (value: number): string => `${value.toFixed(1)} ms`;

const formatBytes = (value: number | null): string => {
  if (value === null) return 'Unavailable';
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const copyWithSelectionFallback = (value: string): boolean => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
};

export const BenchmarkApp = () => {
  const controller = useMemo(() => new BenchmarkController(), []);
  const diagnostics = useMemo(() => new EngineGateDiagnostics(), []);
  const [state, setState] = useState<BenchmarkViewState>(() => controller.getState());
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [showAirRoute, setShowAirRoute] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsSnapshot, setDiagnosticsSnapshot] =
    useState<EngineGateDiagnosticsSnapshot>(() => diagnostics.snapshot());
  const [diagnosticsExportStatus, setDiagnosticsExportStatus] = useState('');

  useEffect(
    () =>
      controller.subscribe((nextState) => {
        diagnostics.recordPresentationEvents(nextState.recentEvents);
        setState(nextState);
      }),
    [controller, diagnostics],
  );

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();
    const frame = (time: number): void => {
      const elapsedMilliseconds = time - previousTime;
      const simulation = controller.advanceFrame(elapsedMilliseconds);
      diagnostics.recordFrame(elapsedMilliseconds, simulation);
      previousTime = time;
      animationFrame = requestAnimationFrame(frame);
    };
    animationFrame = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animationFrame);
  }, [controller, diagnostics]);

  useEffect(() => {
    diagnostics.recordLifecycle(`visibility:${document.visibilityState}`);
    const onVisibilityChange = (): void => {
      diagnostics.recordLifecycle(`visibility:${document.visibilityState}`);
    };
    const onPageHide = (event: PageTransitionEvent): void => {
      diagnostics.recordLifecycle(`pagehide:${event.persisted ? 'cached' : 'discarded'}`);
    };
    const onPageShow = (event: PageTransitionEvent): void => {
      diagnostics.recordLifecycle(`pageshow:${event.persisted ? 'cached' : 'fresh'}`);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [diagnostics]);

  useEffect(() => {
    const sampleMemory = (): void => diagnostics.recordMemory(readJsHeapSample());
    sampleMemory();
    const interval = window.setInterval(sampleMemory, 1_000);
    return () => window.clearInterval(interval);
  }, [diagnostics]);

  useEffect(() => {
    if (!diagnosticsOpen) return;
    const refresh = (): void => setDiagnosticsSnapshot(diagnostics.snapshot());
    refresh();
    const interval = window.setInterval(refresh, 1_000);
    return () => window.clearInterval(interval);
  }, [diagnostics, diagnosticsOpen]);

  const preferences = useMemo<VisualPreferences>(
    () => Object.freeze({ highContrast, reducedMotion, showAirRoute }),
    [highContrast, reducedMotion, showAirRoute],
  );
  const selectedTower = state.render.towers.find(({ id }) => id === state.selectedTowerId);
  const waveProgress =
    state.ui.waveCreepCount === 0
      ? 0
      : Math.min(
          100,
          ((state.ui.spawnedCreeps - state.ui.activeCreeps) / state.ui.waveCreepCount) * 100,
        );

  const copyDiagnostics = async (): Promise<void> => {
    const report = serializeDiagnosticsReport(diagnostics.snapshot(), {
      capturedAt: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      nativePlatform: Capacitor.isNativePlatform(),
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      visibilityState: document.visibilityState,
      arenaId: state.render.arenaId,
      simulationVersion: state.render.simulationVersion,
      simulationTick: state.render.tick,
      routeVersion: state.render.routeVersion,
      towerCount: state.render.towers.length,
      phase: state.ui.phase,
    });

    try {
      if (typeof navigator.clipboard?.writeText !== 'function') {
        if (!copyWithSelectionFallback(report)) throw new Error('Clipboard unavailable');
      } else {
        await navigator.clipboard.writeText(report);
      }
      setDiagnosticsExportStatus('JSON report copied.');
    } catch {
      console.info('Tower Defense v2 Engine Gate report', report);
      setDiagnosticsExportStatus('Clipboard unavailable. Report written to the device console.');
    }
  };

  const resetDiagnostics = (): void => {
    diagnostics.reset();
    diagnostics.recordLifecycle(`visibility:${document.visibilityState}`);
    setDiagnosticsSnapshot(diagnostics.snapshot());
    setDiagnosticsExportStatus('Sample reset.');
  };

  return (
    <main class={`game-shell${highContrast ? ' high-contrast' : ''}`}>
      <header class="mission-hud" aria-label="Mission status">
        <div class="mission-mark">
          <span class="mission-kicker">W1 · ENGINE GATE</span>
          <strong>Routing Range</strong>
        </div>
        <div class="hud-stat" aria-label={`${state.ui.lives} lives remaining`}>
          <span>Integrity</span>
          <strong>{state.ui.lives}</strong>
        </div>
        <div class="hud-stat" aria-label={`Wave ${state.ui.waveNumber} of ${state.ui.waveCount}`}>
          <span>Wave</span>
          <strong>
            {state.ui.waveNumber}<small>/{state.ui.waveCount}</small>
          </strong>
        </div>
        <div class="hud-stat credit-stat" aria-label={`${state.ui.fieldCredits} Field Credits`}>
          <span>Credits</span>
          <strong>{state.ui.fieldCredits}</strong>
        </div>
        <button
          type="button"
          class="hud-button speed-button"
          aria-label={`Simulation speed ${state.ui.speed} times. Tap to change.`}
          onClick={() => controller.cycleSpeed()}
        >
          {state.ui.speed}×
        </button>
        <button
          type="button"
          class="hud-button icon-button"
          aria-label={state.ui.paused ? 'Resume simulation' : 'Pause simulation'}
          aria-pressed={state.ui.paused}
          disabled={state.ui.phase !== 'wave'}
          onClick={() => controller.togglePause()}
        >
          {state.ui.paused ? '▶' : 'Ⅱ'}
        </button>
        <button
          type="button"
          class="hud-button icon-button"
          aria-label="Display settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          ◐
        </button>
      </header>

      {settingsOpen && (
        <section class="settings-popover" aria-label="Display settings">
          <button
            type="button"
            aria-pressed={highContrast}
            onClick={() => setHighContrast((enabled) => !enabled)}
          >
            High contrast <span>{highContrast ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            aria-pressed={reducedMotion}
            onClick={() => setReducedMotion((enabled) => !enabled)}
          >
            Reduced motion <span>{reducedMotion ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            aria-pressed={showAirRoute}
            onClick={() => setShowAirRoute((enabled) => !enabled)}
          >
            Air route <span>{showAirRoute ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDiagnosticsOpen(true);
              setSettingsOpen(false);
            }}
          >
            Engine diagnostics <span>Open</span>
          </button>
        </section>
      )}

      {diagnosticsOpen && (
        <section class="diagnostics-panel" aria-label="Engine diagnostics">
          <header>
            <div>
              <span>ENGINE GATE</span>
              <strong>Live diagnostics</strong>
            </div>
            <button
              type="button"
              class="diagnostics-close"
              aria-label="Close engine diagnostics"
              onClick={() => setDiagnosticsOpen(false)}
            >
              Close
            </button>
          </header>
          <div class="diagnostics-grid">
            <div>
              <span>Estimated FPS</span>
              <strong>{diagnosticsSnapshot.frames.estimatedFramesPerSecond.toFixed(1)}</strong>
            </div>
            <div>
              <span>Frame p95</span>
              <strong>{formatMilliseconds(diagnosticsSnapshot.frames.p95Milliseconds)}</strong>
            </div>
            <div>
              <span>20+ ms frames</span>
              <strong>{diagnosticsSnapshot.frames.longFramePercent.toFixed(1)}%</strong>
            </div>
            <div>
              <span>Simulation p95</span>
              <strong>
                {formatMilliseconds(diagnosticsSnapshot.simulation.p95Milliseconds)}
              </strong>
            </div>
            <div>
              <span>Simulation max</span>
              <strong>{formatMilliseconds(diagnosticsSnapshot.simulation.maxMilliseconds)}</strong>
            </div>
            <div>
              <span>Events</span>
              <strong>{diagnosticsSnapshot.presentationEvents.total}</strong>
            </div>
            <div>
              <span>JS heap</span>
              <strong>{formatBytes(diagnosticsSnapshot.jsHeap.current?.usedBytes ?? null)}</strong>
            </div>
            <div>
              <span>Peak JS heap</span>
              <strong>{formatBytes(diagnosticsSnapshot.jsHeap.peakUsedBytes)}</strong>
            </div>
          </div>
          <p>
            {diagnosticsSnapshot.frames.sampleCount} frames ·{' '}
            {(diagnosticsSnapshot.sampleDurationMilliseconds / 1_000).toFixed(0)} seconds ·{' '}
            {diagnosticsSnapshot.simulation.advancedTicks} fixed ticks ·{' '}
            {diagnosticsSnapshot.frames.discardedSuspendGaps} lifecycle gaps
          </p>
          <footer>
            <button type="button" onClick={resetDiagnostics}>Reset sample</button>
            <button type="button" class="diagnostics-export" onClick={copyDiagnostics}>
              Copy JSON
            </button>
          </footer>
          <span class="diagnostics-status" role="status" aria-live="polite">
            {diagnosticsExportStatus}
          </span>
        </section>
      )}

      <section class="arena-region" aria-label="Benchmark Arena">
        {rendererError === null ? (
          <ArenaSurface
            controller={controller}
            state={state}
            preferences={preferences}
            onError={setRendererError}
          />
        ) : (
          <div class="renderer-error" role="alert">
            <strong>Renderer unavailable</strong>
            <span>{rendererError}</span>
          </div>
        )}
        <AccessibleArenaGrid controller={controller} state={state} />
        <div class="phase-chip">{phaseLabel(state.ui.phase)}</div>
        {state.ui.phase === 'wave' && (
          <div class="wave-progress" aria-label={`${Math.round(waveProgress)} percent through wave`}>
            <span style={{ width: `${waveProgress}%` }} />
          </div>
        )}
      </section>

      <section class="command-sheet" aria-label="Contextual controls">
        <div
          class={`feedback feedback-${state.feedback.tone}`}
          role="status"
          aria-live="polite"
          key={state.feedback.sequence}
        >
          {state.feedback.text}
        </div>

        <div class="command-row">
          {selectedTower === undefined ? (
            <div class="selection-summary">
              <span class="tower-glyph" aria-hidden="true" />
              <div>
                <strong>Foundation · Level 1</strong>
                <span>Blocks ground · Airborne ignores towers · weak ground pulse · 10 credits</span>
              </div>
            </div>
          ) : (
            <div class="selection-summary">
              <span class="tower-glyph selected-glyph" aria-hidden="true" />
              <div>
                <strong>
                  {selectedTower.familyId.toUpperCase()} · {selectedTower.id.toUpperCase()}
                </strong>
                <span>{towerDescription(selectedTower.familyId)}</span>
              </div>
              <button
                type="button"
                class="text-button"
                aria-label="Clear tower selection"
                onClick={() => controller.clearSelection()}
              >
                Close
              </button>
            </div>
          )}

          {state.ui.phase === 'victory' || state.ui.phase === 'defeat' ? (
            <button type="button" class="primary-action" onClick={() => controller.retry()}>
              Retry benchmark
            </button>
          ) : state.ui.phase === 'wave' ? (
            <button type="button" class="primary-action" onClick={() => controller.togglePause()}>
              {state.ui.paused ? 'Resume' : 'Pause'}
            </button>
          ) : (
            <button type="button" class="primary-action" onClick={() => controller.startWave()}>
              Launch wave {state.ui.waveNumber}
            </button>
          )}
        </div>

        {selectedTower !== undefined && (
          <div class="tower-actions" aria-label="Selected tower actions">
            {selectedTower.familyId === 'foundation' &&
              state.specialistOptions.map((option) => (
                <button
                  key={option.familyId}
                  type="button"
                  class={`specialist-action specialist-${option.familyId}`}
                  disabled={
                    !state.ui.canDevelopTower ||
                    state.ui.fieldCredits < option.fieldCreditCost
                  }
                  onClick={() => controller.installSelected(option.familyId)}
                >
                  Install {option.displayName} · {option.fieldCreditCost}
                </button>
              ))}
            <button
              type="button"
              class="secondary-action"
              disabled={!state.ui.canDismantle}
              onClick={() => controller.dismantleSelected()}
            >
              Dismantle
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
