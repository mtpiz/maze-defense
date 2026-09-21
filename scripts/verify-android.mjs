import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectCdp } from './android-cdp.mjs';
import { createMissionDriver } from './android-mission-driver.mjs';
import {
  assertApkIdentity, assertLifecycleResume, assertMissionClear, assertOpeningRestored,
} from './android-verification.mjs';

const serial = process.argv[2];
if (!serial || process.argv.length !== 3) throw new Error('Usage: node scripts/verify-android.mjs <device-serial>');
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('Set ANDROID_HOME to the Android SDK');
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const applicationId = 'com.towerdefensev2.game';
const activity = `${applicationId}/.MainActivity`;
const runAdb = (...args) => execFileSync(adb, ['-s', serial, ...args], {
  timeout: 20_000, maxBuffer: 12 * 1024 * 1024, windowsHide: true,
});
const adbText = (...args) => runAdb(...args).toString('utf8').trim();
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const until = async (label, probe, timeout = 15_000) => {
  const deadline = Date.now() + timeout;
  do {
    const value = await probe();
    if (value) return value;
    await wait(100);
  } while (Date.now() < deadline);
  throw new Error(`Timed out: ${label}`);
};
const directory = new URL(`../artifacts/android-verification/${new Date().toISOString().replaceAll(':', '-')}/`, import.meta.url);
await mkdir(directory, { recursive: true });
const evidence = { schemaVersion: 1, startedAt: new Date().toISOString(), status: 'failed',
  scope: 'Scripted UI regression, not a performance benchmark or uncoached playtest', serial, waves: [], lifecycle: [] };
let connection;
let port;
let processId;
const screenshot = async (name) => writeFile(new URL(`${name}.png`, directory), runAdb('exec-out', 'screencap', '-p'));
const call = (method, ...args) => connection.evaluate(`window.__androidVerify.${method}(...${JSON.stringify(args)})`);
const loadOpening = async () => {
  await connection.send('Page.navigate', { url: 'https://localhost/' });
  await until('opening Mission and combat renderer', () => connection.evaluate(`
    location.search === '' && document.querySelector('.phase-chip')?.textContent === 'Opening plan' &&
    ['proxy-v1', 'high-contrast'].includes(document.querySelector('canvas.arena-canvas')?.dataset.combatArt)`));
  await connection.evaluate(`window.__androidVerify = (${createMissionDriver.toString()})()`);
  await call('buildAvailable');
};
const resumeCheck = async (phase) => {
  console.log(`Checking Home / explicit Resume during ${phase}...`);
  const sample = { phase };
  evidence.lifecycle.push(sample);
  runAdb('shell', 'input', 'keyevent', 'KEYCODE_HOME');
  await until('Android Home visibility', () => connection.evaluate('document.visibilityState === "hidden"'));
  sample.hidden = await call('snapshot');
  await wait(750);
  sample.hiddenLater = await call('snapshot');
  runAdb('shell', 'am', 'start', '-W', '-n', activity);
  await until('Android foreground visibility', () => connection.evaluate('document.visibilityState === "visible"'));
  sample.returned = await call('snapshot');
  await wait(750);
  sample.returnedLater = await call('snapshot');
  await screenshot(`${phase}-paused`);
  await call('tap', 'Resume simulation');
  await wait(250);
  sample.resumed = await call('snapshot');
  assertLifecycleResume(sample);
};

try {
  assert.equal(adbText('get-state'), 'device', 'The requested device must be online and authorized');
  const build = JSON.parse(await readFile(new URL('../artifacts/builds/latest.json', import.meta.url), 'utf8'));
  assert.match(build.apk, /^maze-defense-debug-[a-f0-9]{12}\.apk$/, 'Invalid staged APK filename');
  const apk = await readFile(new URL(`../artifacts/builds/${build.apk}`, import.meta.url));
  const installedPath = adbText('shell', 'pm', 'path', applicationId).replace(/^package:/, '');
  assert.match(installedPath, /^\/data\/app\/[-A-Za-z0-9_+/=~.]+\/base\.apk$/, 'Expected one installed debug APK');
  const installedHash = adbText('shell', 'sha256sum', installedPath).split(/\s+/)[0];
  evidence.build = { ...build, installedHash };
  assertApkIdentity(build, apk, installedHash);
  evidence.device = {
    model: adbText('shell', 'getprop', 'ro.product.model'),
    sdk: adbText('shell', 'getprop', 'ro.build.version.sdk'),
    emulator: adbText('shell', 'getprop', 'ro.kernel.qemu') === '1',
  };
  console.log(`Verified installed APK ${build.sha256.slice(0, 12)}; starting a fresh test Mission...`);
  runAdb('shell', 'am', 'force-stop', applicationId);
  runAdb('shell', 'am', 'start', '-W', '-n', activity);
  processId = adbText('shell', 'pidof', applicationId);
  assert.match(processId, /^\d+$/);
  port = adbText('forward', 'tcp:0', `localabstract:webview_devtools_remote_${processId}`);
  assert.match(port, /^\d+$/);
  const target = await until('game WebView startup', async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1_000) });
      const targets = await response.json();
      return targets.find((entry) => entry.url.startsWith('https://localhost/'));
    } catch { return null; }
  });
  connection = await connectCdp(target.webSocketDebuggerUrl);
  await connection.send('Page.enable');
  await loadOpening();
  evidence.graphics = await call('capabilities');
  evidence.opening = await call('snapshot');
  assert.equal(evidence.opening.ui.towers.length, 3, 'Expected the affordable three-tower opening');
  await screenshot('opening');
  await call('tap', 'Simulation speed 1 times.');
  await call('tap', 'Simulation speed 2 times.');
  await call('resetSample');

  for (let wave = 1; wave <= 6; wave++) {
    assert.equal((await call('read')).wave, wave, 'A planning interval was skipped');
    if (wave > 1) await call('buildAvailable');
    await call('tap', wave === 1 ? 'Launch wave 1' : 'Early Launch');
    console.log(`Running wave ${wave}/6 through UI commands...`);
    if (wave === 1) {
      await wait(250);
      const before = await call('pixels');
      await wait(400);
      const after = await call('pixels');
      evidence.movingCanvas = { before, after };
      for (const frame of [before, after]) {
        assert.equal(frame.error, 0, 'WebGL error during pixel readback');
        assert.ok(frame.coloredPixels > 0, 'Game canvas is blank');
      }
      assert.notEqual(before.hash, after.hash, 'Active-wave canvas did not change');
      await resumeCheck('wave');
    }
    await until(`wave ${wave} completion`, async () => {
      const ui = await call('read');
      return ui.result || ui.phaseText.startsWith('Planning');
    }, 45_000);
    evidence.waves.push(wave);
    if (wave === 1) await resumeCheck('planning');
    if ((await call('read')).result) break;
  }
  evidence.result = await call('snapshot');
  await screenshot('mission-result');
  assertMissionClear(evidence);
  await call('tap', 'Retry opening');
  evidence.retry = await call('snapshot');
  assertOpeningRestored(evidence.opening, evidence.retry);
  await screenshot('retry');
  console.log('Checking stress-screen return and saved settings...');
  await connection.send('Page.navigate', { url: 'https://localhost/?stress&fps=60' });
  await until('stress renderer before document reload', () => connection.evaluate(`
    document.querySelector('.stress-hud')?.textContent.includes('120/120') &&
    document.querySelector('canvas.arena-canvas')?.dataset.combatArt === 'proxy-v1'`));
  await loadOpening();
  evidence.documentReload = await call('snapshot');
  assertOpeningRestored(evidence.opening, evidence.documentReload);
  const reloadedPixels = await call('pixels');
  assert.equal(reloadedPixels.error, 0, 'WebGL error after document reload');
  assert.ok(reloadedPixels.coloredPixels > 0, 'Game canvas is blank after document reload');
  evidence.documentReload.pixels = reloadedPixels;
  await screenshot('document-reload');
  assert.equal(adbText('shell', 'pidof', applicationId), processId, 'The app process changed during verification');
  const log = adbText('logcat', '-d', `--pid=${processId}`, '-v', 'threadtime');
  await writeFile(new URL('app-logcat.txt', directory), log);
  evidence.appLogErrors = log.split(/\r?\n/).filter((line) =>
    /FATAL EXCEPTION|ANR in com\.towerdefensev2\.game|Uncaught (?:Type|Reference)Error|unbound texture|GL_INVALID|Combat atlas unavailable/i.test(line));
  assert.equal(evidence.appLogErrors.length, 0, 'App-process logs contain a crash or rendering failure');
  evidence.status = 'passed';
} catch (error) {
  evidence.error = error.stack ?? String(error);
  try { await screenshot('failure'); } catch { /* The selected device may be disconnected. */ }
  process.exitCode = 1;
} finally {
  const cleanupErrors = [];
  if (connection) {
    try { await connection.evaluate('delete window.__androidVerify'); }
    catch (error) { cleanupErrors.push(String(error)); }
    connection.close();
  }
  if (port) {
    try { runAdb('forward', '--remove', `tcp:${port}`); }
    catch (error) { cleanupErrors.push(String(error)); }
  }
  if (cleanupErrors.length) { evidence.cleanupErrors = cleanupErrors; evidence.status = 'failed'; process.exitCode = 1; }
  evidence.finishedAt = new Date().toISOString();
  await writeFile(new URL('report.json', directory), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ status: evidence.status, report: fileURLToPath(new URL('report.json', directory)),
    error: evidence.error, cleanupErrors: evidence.cleanupErrors,
    lives: evidence.result?.ui.lives, waves: evidence.waves.length }, null, 2));
}
