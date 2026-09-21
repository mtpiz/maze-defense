import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  assertApkIdentity, assertLifecycleResume, assertMissionClear, assertOpeningRestored,
} from './android-verification.mjs';

const apk = Buffer.from('test APK');
const hash = createHash('sha256').update(apk).digest('hex');
const build = {
  schemaVersion: 1, applicationId: 'com.towerdefensev2.game', buildType: 'debug',
  apk: `maze-defense-debug-${hash.slice(0, 12)}.apk`, sha256: hash, bytes: apk.length,
};

test('accepts only the exact staged and installed debug APK', () => {
  assert.doesNotThrow(() => assertApkIdentity(build, apk, hash));
  assert.throws(() => assertApkIdentity(build, apk, 'a'.repeat(64)), /installed APK/i);
  assert.throws(() => assertApkIdentity(build, Buffer.from('stale'), hash), /staged APK/i);
  for (const field of [{ bytes: 1 }, { applicationId: 'another.app' }, { buildType: 'release' },
    { schemaVersion: 2 }, { apk: '../outside.apk' }]) {
    assert.throws(() => assertApkIdentity({ ...build, ...field }, apk, hash));
  }
});

const snapshot = (tick, visible, paused, phase = 'wave') => ({
  report: { context: { simulationTick: tick, visibilityState: visible, phase } },
  ui: { paused, launchDisabled: phase === 'planning' ? paused : null },
});
const lifecycle = (phase = 'wave') => ({
  phase,
  hidden: snapshot(100, 'hidden', true, phase),
  hiddenLater: snapshot(100, 'hidden', true, phase),
  returned: snapshot(100, 'visible', true, phase),
  returnedLater: snapshot(100, 'visible', true, phase),
  resumed: snapshot(110, 'visible', false, phase),
});

test('accepts actual hidden/visible transitions and explicit wave or planning resume', () => {
  assert.doesNotThrow(() => assertLifecycleResume(lifecycle()));
  assert.doesNotThrow(() => assertLifecycleResume(lifecycle('planning')));
});

test('rejects simulated visibility, hidden advancement, auto-resume, and a stuck clock', () => {
  for (const field of ['hidden', 'hiddenLater', 'returned', 'returnedLater']) {
    const sample = lifecycle();
    sample[field].ui.paused = false;
    assert.throws(() => assertLifecycleResume(sample), /pause/i);
  }
  for (const field of ['hiddenLater', 'returned', 'returnedLater']) {
    const sample = lifecycle();
    sample[field].report.context.simulationTick++;
    assert.throws(() => assertLifecycleResume(sample), /advanced/i);
  }
  const noHide = lifecycle();
  noHide.hidden.report.context.visibilityState = 'visible';
  assert.throws(() => assertLifecycleResume(noHide), /visibility/i);
  const stuck = lifecycle();
  stuck.resumed.report.context.simulationTick = 100;
  assert.throws(() => assertLifecycleResume(stuck), /resume/i);
  const planning = lifecycle('planning');
  planning.returned.ui.launchDisabled = false;
  assert.throws(() => assertLifecycleResume(planning), /launch/i);
});

const mission = () => ({
  waves: [1, 2, 3, 4, 5, 6],
  result: {
    report: {
      schemaVersion: 3,
      context: { phase: 'victory', simulationVersion: 12, combatArt: 'proxy-v1' },
      diagnostics: { frames: { sampleCount: 50 }, simulation: { advancedTicks: 100 },
        cpuWork: Object.fromEntries(['frameUpdate', 'scene', 'renderSubmission', 'uiCommit']
          .map((name) => [name, { sampleCount: 50 }])) },
    },
    ui: { lives: 17, result: { completedWaves: 6, defeated: 197, leaked: 3 },
      viewport: { width: 390, height: 844, scrollWidth: 390, scrollHeight: 844 } },
  },
});

test('requires the complete Mission, consistent creep accounting, timing evidence, and fitted UI', () => {
  assert.doesNotThrow(() => assertMissionClear(mission()));
  for (const change of [
    (run) => { run.waves.pop(); },
    (run) => { run.waves[2] = 4; },
    (run) => { run.result.report.context.phase = 'defeat'; },
    (run) => { run.result.ui.result.defeated = 0; },
    (run) => { run.result.ui.lives = 0; },
    (run) => { run.result.ui.lives = 18; },
    (run) => { run.result.report.schemaVersion = 2; },
    (run) => { run.result.report.diagnostics.cpuWork.scene.sampleCount = 0; },
    (run) => { run.result.report.context.combatArt = 'fallback'; },
    (run) => { run.result.ui.viewport.scrollWidth = 420; },
  ]) {
    const run = mission();
    change(run);
    assert.throws(() => assertMissionClear(run));
  }
});

test('retry restores only the opening layout, credits, lives, speed, and tick', () => {
  const opening = { report: { context: { phase: 'opening', simulationTick: 0 } },
    ui: { lives: 20, credits: 30, speed: 1, paused: false, towers: ['rail at 42', 'siege at 47'] } };
  assert.doesNotThrow(() => assertOpeningRestored(opening, structuredClone(opening)));
  for (const field of [{ lives: 17 }, { credits: 67 }, { speed: 3 }, { paused: true },
    { towers: ['rail at 42'] }]) {
    assert.throws(() => assertOpeningRestored(opening, { ...opening, ui: { ...opening.ui, ...field } }));
  }
  assert.throws(() => assertOpeningRestored(opening, {
    ...opening, report: { context: { phase: 'opening', simulationTick: 1 } },
  }));
});

test('retry and document reload preserve every saved display and feedback setting', () => {
  const opening = { report: { context: { phase: 'opening', simulationTick: 0,
    highContrast: true, reducedMotion: true, showAirRoute: false,
    effectsEnabled: false, hapticsEnabled: false, frameRate: 30 } },
    ui: { lives: 20, credits: 30, speed: 1, paused: false, towers: [] } };
  assert.doesNotThrow(() => assertOpeningRestored(opening, structuredClone(opening)));
  for (const field of ['highContrast', 'reducedMotion', 'showAirRoute', 'effectsEnabled', 'hapticsEnabled', 'frameRate']) {
    const reloaded = structuredClone(opening);
    reloaded.report.context[field] = field === 'frameRate' ? 60 : !opening.report.context[field];
    assert.throws(() => assertOpeningRestored(opening, reloaded), new RegExp(field));
  }
});
