import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { connectCdp } from './android-cdp.mjs';

const port = Number(process.argv[2]);
const frameRate = Number(process.argv[3]);
const deviceSerial = process.argv[4];
if (!Number.isInteger(port) || port < 1 || port > 65535 || ![30, 60].includes(frameRate) || !deviceSerial) {
  throw new Error('Usage: node scripts/capture-android-stress.mjs <game-CDP-port> <30|60> <device-serial>');
}
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (!sdk) throw new Error('Set ANDROID_HOME to the SDK containing the forwarded device');
const adb = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
execFileSync(adb, ['-s', deviceSerial, 'get-state']);

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find((entry) => entry.url.startsWith('https://localhost/'));
if (!target) throw new Error('The forwarded port has no local game WebView');
const connection = await connectCdp(target.webSocketDebuggerUrl);
const { send } = connection;

// Inject observation only: reset and export use the same controls as a manual run.
const observe = async () => {
  try {
    window.__gateStressCaptureStarted = true;
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const deadline = performance.now() + 12_000;
    while (!document.querySelector('.stress-hud')?.textContent.includes('120/120') ||
      document.querySelector('canvas.arena-canvas')?.dataset.combatArt !== 'proxy-v1') {
      if (performance.now() > deadline) throw new Error('Full load was not reached');
      await wait(50);
    }
    const button = (text) => [...document.querySelectorAll('button')].find((item) => item.textContent === text);
    let report;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: async (value) => { report = JSON.parse(value); } },
    });
    button('Reset sample').click();
    await wait(45_000);
    button('Copy JSON').click();
    await wait(0);
    window.__gateStressCapture = { report };
  } catch (error) {
    window.__gateStressCapture = { error: error.message };
  }
};

let scriptId;
try {
  await send('Page.enable');
  ({ identifier: scriptId } = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(${observe.toString()})()`,
  }));
  await send('Page.navigate', { url: `https://localhost/?stress&fps=${frameRate}` });
  const deadline = Date.now() + 65_000;
  let capture;
  while (!capture) {
    if (Date.now() > deadline) throw new Error('Stress capture did not finish in time');
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const result = await send('Runtime.evaluate', {
      expression: 'window.__gateStressCapture', returnByValue: true,
    });
    capture = result.result?.value;
  }
  if (capture.error) throw new Error(capture.error);
  const { report } = capture;
  const { context, diagnostics } = report;
  if (report.schemaVersion !== 3 ||
      ['frameUpdate', 'scene', 'renderSubmission'].some((phase) =>
        diagnostics.cpuWork?.[phase]?.sampleCount !== diagnostics.frames.sampleCount) ||
      !(diagnostics.cpuWork?.uiCommit?.sampleCount > 0)) {
    throw new Error(`Missing or inconsistent CPU timing evidence: ${JSON.stringify(report)}`);
  }
  if (context.sampleStartActiveCreeps !== 120 || context.activeCreeps !== 120 ||
      context.towerCount !== 40 || context.frameRate !== frameRate ||
      context.sampleStartCombatArt !== 'proxy-v1' || context.combatArt !== 'proxy-v1' ||
      diagnostics.sampleDurationMilliseconds < 44_500 || diagnostics.sampleDurationMilliseconds > 46_000 ||
      diagnostics.frames.discardedSuspendGaps !== 0 ||
      diagnostics.lifecycle.some((event) => event.type === 'visibility:hidden')) {
    throw new Error(`Rejected interrupted or non-full-load sample: ${JSON.stringify(report)}`);
  }
  const directory = new URL('../artifacts/emulator/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const stem = `stress-native-${frameRate}-${new Date().toISOString().replaceAll(':', '-')}`;
  await writeFile(new URL(`${stem}.json`, directory), `${JSON.stringify(report, null, 2)}\n`);
  // WebView CDP screenshots omit the GPU canvas; capture the Android compositor instead.
  const screenshot = execFileSync(adb, ['-s', deviceSerial, 'exec-out', 'screencap', '-p'], { maxBuffer: 10 * 1024 * 1024 });
  await writeFile(new URL(`${stem}.png`, directory), screenshot);
  console.log(JSON.stringify({ artifact: `artifacts/emulator/${stem}.json`, report }, null, 2));
} finally {
  try {
    if (scriptId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
  } finally {
    connection.close();
  }
}
