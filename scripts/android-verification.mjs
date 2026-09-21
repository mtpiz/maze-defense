import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export function assertApkIdentity(build, stagedApk, installedHash) {
  assert.equal(build.schemaVersion, 1, 'Unknown build manifest schema');
  assert.equal(build.applicationId, 'com.towerdefensev2.game');
  assert.equal(build.buildType, 'debug');
  assert.match(build.sha256, /^[a-f0-9]{64}$/);
  assert.equal(build.apk, `maze-defense-debug-${build.sha256.slice(0, 12)}.apk`);
  assert.equal(stagedApk.length, build.bytes, 'Staged APK size does not match the manifest');
  assert.equal(createHash('sha256').update(stagedApk).digest('hex'), build.sha256,
    'Staged APK hash does not match the manifest');
  assert.equal(installedHash, build.sha256, 'Installed APK is not the latest staged build; install it first');
}

export function assertLifecycleResume(sample) {
  const tick = sample.hidden.report.context.simulationTick;
  assert.ok(Number.isInteger(tick) && tick > 0, 'Lifecycle sample needs an active clock');
  for (const key of ['hidden', 'hiddenLater', 'returned', 'returnedLater']) {
    const { report, ui } = sample[key];
    assert.equal(report.context.visibilityState, key.startsWith('hidden') ? 'hidden' : 'visible',
      `${key}: missing real visibility transition`);
    assert.equal(report.context.phase, sample.phase, `${key}: Mission phase changed while paused`);
    assert.equal(ui.paused, true, `${key}: must stay paused until explicit Resume`);
    assert.equal(report.context.simulationTick, tick, `${key}: simulation advanced without Resume`);
    if (sample.phase === 'planning') assert.equal(ui.launchDisabled, true, 'Paused Early Launch must be disabled');
  }
  assert.equal(sample.resumed.report.context.visibilityState, 'visible');
  assert.equal(sample.resumed.ui.paused, false, 'Resume did not unpause');
  assert.ok(sample.resumed.report.context.simulationTick > tick, 'Resume did not advance the clock');
}

export function assertMissionClear({ waves, result: { report, ui } }) {
  assert.deepEqual(waves, [1, 2, 3, 4, 5, 6], 'Every authored wave must be observed in order');
  assert.equal(report.schemaVersion, 3);
  assert.equal(report.context.simulationVersion, 12, 'Update the scenario when simulation rules change');
  assert.equal(report.context.phase, 'victory', 'The scripted Mission did not clear');
  assert.ok(['proxy-v1', 'high-contrast'].includes(report.context.combatArt), 'Combat renderer did not load');
  assert.equal(ui.result.completedWaves, 6);
  for (const value of [ui.lives, ui.result.defeated, ui.result.leaked]) {
    assert.ok(Number.isInteger(value) && value >= 0, 'Invalid result counters');
  }
  assert.ok(ui.lives > 0 && ui.lives <= 20, 'No Lives retained');
  assert.equal(ui.result.defeated + ui.result.leaked, 200, 'Creep accounting is incomplete');
  assert.equal(ui.lives + ui.result.leaked, 20, 'Life loss does not match leaks');
  assert.ok(report.diagnostics.frames.sampleCount > 0 && report.diagnostics.simulation.advancedTicks > 0);
  for (const phase of ['frameUpdate', 'scene', 'renderSubmission', 'uiCommit']) {
    assert.ok(report.diagnostics.cpuWork[phase].sampleCount > 0, `Missing ${phase} timing evidence`);
  }
  assert.ok(ui.viewport.scrollWidth <= ui.viewport.width && ui.viewport.scrollHeight <= ui.viewport.height,
    'Mission result overflows the viewport');
}

export function assertOpeningRestored(opening, retry) {
  assert.equal(retry.report.context.phase, 'opening');
  assert.equal(retry.report.context.simulationTick, 0);
  for (const field of ['lives', 'credits', 'speed', 'paused', 'towers']) {
    assert.deepEqual(retry.ui[field], opening.ui[field], `Retry did not restore opening ${field}`);
  }
  for (const field of ['highContrast', 'reducedMotion', 'showAirRoute', 'effectsEnabled', 'hapticsEnabled', 'frameRate']) {
    assert.equal(retry.report.context[field], opening.report.context[field], `Opening did not preserve ${field}`);
  }
}
