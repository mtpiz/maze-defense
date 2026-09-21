import { Capacitor } from '@capacitor/core';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
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
import {
  BrowserSemanticFeedbackOutput,
  SemanticFeedback,
} from '../platform/semantic-feedback.js';
import type { LocalSettings, LocalSettingsStore } from '../platform/local-settings.js';
import { copyDiagnosticsReport } from '../platform/copy-diagnostics-report.js';

interface ArenaSurfaceProps {
  readonly controller: BenchmarkController;
  readonly diagnostics: EngineGateDiagnostics;
  readonly frameRate: 30 | 60;
  readonly preferences: VisualPreferences;
  readonly onError: (message: string | null) => void;
}

const ArenaSurface = ({ controller, diagnostics, frameRate, preferences, onError }: ArenaSurfaceProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ArenaView | null>(null);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) return;
    let disposed = false;
    const view = new ArenaView(mount, (cell) => controller.tapCell(cell), (elapsed) => {
      diagnostics.recordFrame(elapsed, controller.advanceFrame(elapsed));
    }, (sample) => diagnostics.recordFrameWork(sample));
    viewRef.current = view;
    const unsubscribe = controller.subscribe((state) => view.render(state, preferencesRef.current));
    void view.initialize().catch((error: unknown) => {
      if (disposed) return;
      onError(error instanceof Error ? error.message : 'The Arena renderer could not start.');
    });
    return () => {
      disposed = true;
      unsubscribe();
      viewRef.current = null;
      view.destroy();
    };
  }, [controller, diagnostics, onError]);

  useEffect(() => {
    viewRef.current?.render(controller.getState(), preferences);
  }, [controller, preferences]);

  useEffect(() => {
    viewRef.current?.setFrameRate(frameRate);
    diagnostics.setFrameRate(frameRate);
  }, [diagnostics, frameRate]);

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
  const towers = new Map(state.render.towers.map(({ cell, familyId }) => [cell, familyId]));
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
                    ? `${towers.get(cell)} tower`
                    : 'open build tile';
        return (
          <button
            key={cell}
            type="button"
            role="gridcell"
            aria-label={`Row ${row}, column ${column}: ${kind}`}
            disabled={inactive.has(cell) || state.ui.phase === 'victory' || state.ui.phase === 'defeat'}
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
      return 'Mission clear';
    case 'defeat':
      return 'Mission lost';
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

interface BenchmarkAppProps {
  readonly initialSettings: LocalSettings;
  readonly settingsStore: LocalSettingsStore;
}

export const BenchmarkApp = ({ initialSettings, settingsStore }: BenchmarkAppProps) => {
  const renderStartedAt = performance.now();
  const controller = useMemo(() => new BenchmarkController(), []);
  const diagnostics = useMemo(() => new EngineGateDiagnostics(), []);
  useLayoutEffect(() => {
    if (document.visibilityState === 'visible') diagnostics.recordUiCommit(performance.now() - renderStartedAt);
  });
  const feedbackOutput = useMemo(() => new BrowserSemanticFeedbackOutput(), []);
  const semanticFeedback = useMemo(() => new SemanticFeedback(feedbackOutput), [feedbackOutput]);
  const [state, setState] = useState<BenchmarkViewState>(() => controller.getState());
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [settings, setSettings] = useState(initialSettings);
  const settingsRef = useRef(initialSettings);
  const { highContrast, reducedMotion, showAirRoute, effectsEnabled, hapticsEnabled, frameRate } = settings;
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsSnapshot, setDiagnosticsSnapshot] =
    useState<EngineGateDiagnosticsSnapshot>(() => diagnostics.snapshot());
  const [diagnosticsExportStatus, setDiagnosticsExportStatus] = useState('');
  const setSetting = <Key extends keyof LocalSettings>(key: Key, value: LocalSettings[Key]): void => {
    if (settingsRef.current[key] === value) return;
    const next = Object.freeze({ ...settingsRef.current, [key]: value });
    settingsRef.current = next;
    setSettings(next);
    if (!next.effectsEnabled) feedbackOutput.stopSound();
    if (!next.hapticsEnabled) feedbackOutput.stopHaptics();
    if (key === 'effectsEnabled' && next.effectsEnabled) feedbackOutput.unlock();
    void settingsStore.save(next).then(
      () => setSettingsError(null),
      () => setSettingsError('Settings could not be saved.'),
    );
  };
  const toggleSetting = (key: keyof Omit<LocalSettings, 'frameRate'>): void => {
    setSetting(key, !settingsRef.current[key]);
  };

  useEffect(
    () =>
      controller.subscribe((nextState) => {
        diagnostics.recordPresentationEvents(nextState.recentEvents);
        semanticFeedback.consume(
          nextState.recentEvents,
          nextState.render.tick,
          performance.now(),
          settingsRef.current,
        );
        setState(nextState);
      }),
    [controller, diagnostics, semanticFeedback],
  );

  useEffect(() => {
    const unlock = (): void => {
      if (settingsRef.current.effectsEnabled) feedbackOutput.unlock();
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      feedbackOutput.dispose();
    };
  }, [feedbackOutput]);

  useEffect(() => {
    const updateVisibility = (visible: boolean): void => {
      diagnostics.recordVisibility(visible);
      controller.setForeground(visible);
      if (!visible) {
        feedbackOutput.stopSound();
        feedbackOutput.stopHaptics();
      }
    };
    const onVisibilityChange = (): void => updateVisibility(document.visibilityState === 'visible');
    onVisibilityChange();
    const onPageHide = (event: PageTransitionEvent): void => {
      updateVisibility(false);
      diagnostics.recordLifecycle(`pagehide:${event.persisted ? 'cached' : 'discarded'}`);
    };
    const onPageShow = (event: PageTransitionEvent): void => {
      onVisibilityChange();
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
  }, [controller, diagnostics, feedbackOutput]);

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
  const missionOver = state.ui.phase === 'victory' || state.ui.phase === 'defeat';
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (missionOver) resultRef.current?.focus();
  }, [missionOver]);
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
      combatArt: document.querySelector<HTMLCanvasElement>('canvas.arena-canvas')?.dataset.combatArt ?? 'unavailable',
      simulationVersion: state.render.simulationVersion,
      simulationTick: state.render.tick,
      routeVersion: state.render.routeVersion,
      towerCount: state.render.towers.length,
      phase: state.ui.phase,
      highContrast,
      reducedMotion,
      showAirRoute,
      effectsEnabled,
      hapticsEnabled,
      frameRate,
    });

    setDiagnosticsExportStatus(await copyDiagnosticsReport(report));
  };

  const resetDiagnostics = (): void => {
    diagnostics.reset();
    diagnostics.recordVisibility(document.visibilityState === 'visible');
    setDiagnosticsSnapshot(diagnostics.snapshot());
    setDiagnosticsExportStatus('Sample reset.');
  };

  return (
    <main class={`game-shell${highContrast ? ' high-contrast' : ''}`}>
      <header class="mission-hud" aria-label="Mission status">
        <div class="mission-mark">
          <span class="mission-kicker">Combat trial</span>
          <strong>Brood Range</strong>
        </div>
        <div class="hud-stat" aria-label={`${state.ui.lives} lives remaining`}>
          <span>Lives</span>
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
          disabled={missionOver}
          onClick={() => controller.cycleSpeed()}
        >
          {state.ui.speed}×
        </button>
        <button
          type="button"
          class="hud-button icon-button"
          aria-label={state.ui.paused ? 'Resume simulation' : 'Pause simulation'}
          aria-pressed={state.ui.paused}
          disabled={state.ui.phase !== 'wave' && state.ui.phase !== 'planning'}
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
          <fieldset class="frame-rate-setting">
            <legend>Frame rate</legend>
            <div class="frame-rate-options">
              {([30, 60] as const).map((rate) => (
                <label key={rate} class={`frame-rate-option${frameRate === rate ? ' selected' : ''}`}>
                  <input type="radio" name="frame-rate" value={rate} checked={frameRate === rate}
                    onChange={() => setSetting('frameRate', rate)} />
                  <span>{rate === 30 ? 'Battery' : 'Quality'}<small>{rate} FPS</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            aria-pressed={highContrast}
            onClick={() => toggleSetting('highContrast')}
          >
            High contrast <span>{highContrast ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            aria-pressed={reducedMotion}
            onClick={() => toggleSetting('reducedMotion')}
          >
            Reduced motion <span>{reducedMotion ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            aria-pressed={showAirRoute}
            onClick={() => toggleSetting('showAirRoute')}
          >
            Air route <span>{showAirRoute ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            aria-pressed={effectsEnabled}
            onClick={() => toggleSetting('effectsEnabled')}
          >
            Sound effects <span>{effectsEnabled ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            aria-pressed={hapticsEnabled}
            onClick={() => toggleSetting('hapticsEnabled')}
          >
            Haptics <span>{hapticsEnabled ? 'On' : 'Off'}</span>
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
          {settingsError !== null && <p class="settings-error" role="status">{settingsError}</p>}
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
              <span>{diagnosticsSnapshot.frames.longFrameThresholdMilliseconds}+ ms frames</span>
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

      <section class="arena-region" aria-label="Brood Range Arena">
        {rendererError === null ? (
          <ArenaSurface
            controller={controller}
            diagnostics={diagnostics}
            frameRate={frameRate}
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
        {!missionOver && (
          <div class="phase-chip">
            {state.ui.paused ? 'Paused' : phaseLabel(state.ui.phase)}
            {state.ui.phase === 'planning' && ` · ${Math.ceil(state.ui.planningTicksRemaining / 30)}s`}
          </div>
        )}
        {missionOver && (
          <section class="mission-result" aria-label="Mission result" tabIndex={-1} ref={resultRef}>
            <h1>{state.ui.phase === 'victory' ? 'Mission clear' : 'Mission lost'}</h1>
            <p>{state.ui.phase === 'victory' ? 'Brood Range secured' : `Wave ${state.ui.waveNumber} · ${state.briefing.title}`}</p>
            {state.ui.phase === 'victory' && (
              <div class="result-stars" aria-label={`${state.ui.stars} of 3 Stars`}>
                {[1, 2, 3].map((star) => <span key={star} class={star <= state.ui.stars ? 'earned' : ''} aria-hidden="true">★</span>)}
              </div>
            )}
            <dl class="result-stats">
              <div><dt>Lives retained</dt><dd>{state.ui.lives} / {state.ui.startingLives}</dd></div>
              <div><dt>Waves cleared</dt><dd>{state.ui.completedWaves} / {state.ui.waveCount}</dd></div>
              <div><dt>Creeps defeated</dt><dd>{state.ui.defeatedCreeps}</dd></div>
              <div><dt>Creeps leaked</dt><dd>{state.ui.leakedCreeps}</dd></div>
            </dl>
            {state.ui.leakedCreeps > 0 && (
              <p class="leak-summary">
                Leaks: {Object.entries(state.ui.leaksByFamily).map(([family, count]) => `${family} ${count}`).join(' · ')}
              </p>
            )}
          </section>
        )}
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
          {missionOver ? (
            <div class="retry-summary">
              <strong>Opening plan</strong>
              <span>Same Arena and waves</span>
            </div>
          ) : selectedTower === undefined ? (
            <div class="wave-briefing" aria-label="Wave briefing">
              <strong>{state.briefing.title}</strong>
              <ul>
                {state.briefing.families.map(({ definition, count }) => (
                  <li key={definition.id}>
                    <span class={`creep-marker creep-${definition.id}`} aria-hidden="true" />
                    <span>{count} {definition.displayName}{count === 1 ? '' : 's'}
                      <small>{definition.layer === 'air' ? 'Airborne' : definition.armor > 0 ? `Ground · Armor ${definition.armor}` : 'Ground'}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <span class="wave-income">
                {state.ui.guaranteedWaveIncome > 0 ? `Clear allotment +${state.ui.guaranteedWaveIncome}` : 'Final wave'}
              </span>
            </div>
          ) : (
            <div class="selection-summary">
              <span class="tower-glyph selected-glyph" aria-hidden="true" />
              <div>
                <strong>
                  {selectedTower.familyId.toUpperCase()} · {selectedTower.id.toUpperCase()}
                </strong>
                <span>{towerDescription(selectedTower.familyId)}</span>
                <span class="tower-spec">Damage {selectedTower.weapon.damage} · Range {selectedTower.weapon.rangeMilliCells / 1_000}</span>
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

          {missionOver ? (
            <div class="retry-actions">
              <button type="button" class="primary-action" onClick={() => controller.retry()}>
                Retry opening
              </button>
              <button type="button" class="text-button" onClick={() => controller.retry(false)}>
                Clear plan
              </button>
            </div>
          ) : state.ui.phase === 'wave' ? (
            <button type="button" class="primary-action" onClick={() => controller.togglePause()}>
              {state.ui.paused ? 'Resume' : 'Pause'}
            </button>
          ) : (
            <button type="button" class="primary-action launch-action" disabled={state.ui.paused} onClick={() => controller.startWave()}>
              {state.ui.phase === 'planning' ? 'Early Launch' : 'Launch wave 1'}
              {state.ui.phase === 'planning' && <small>+{state.ui.earlyLaunchCredits} credits · {Math.ceil(state.ui.planningTicksRemaining / 30)}s</small>}
            </button>
          )}
        </div>

        {selectedTower !== undefined && !missionOver && (
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
                  {option.displayName} · {option.fieldCreditCost}
                  {option.familyId === 'siege' && <small>Loaned</small>}
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
        {!missionOver && selectedTower === undefined && <div class="foundation-price">Foundation · 10 credits</div>}
      </section>
    </main>
  );
};
