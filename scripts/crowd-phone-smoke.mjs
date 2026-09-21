import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { connectCdp } from './android-cdp.mjs';

const serial = process.argv[2];
assert.ok(serial && process.env.ANDROID_HOME, 'Pass an authorized phone serial and ANDROID_HOME');
const adb = (...args) => execFileSync(`${process.env.ANDROID_HOME}/platform-tools/adb.exe`, ['-s', serial, ...args]);
const pid = adb('shell', 'pidof', 'com.towerdefensev2.game').toString().trim();
assert.match(pid, /^\d+$/);
const port = adb('forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`).toString().trim();
let cdp;
try {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = pages.find(p => p.type === 'page' && p.url.includes('localhost'));
  assert.ok(page, 'Game WebView is available');
  cdp = await connectCdp(page.webSocketDebuggerUrl);
  // Observe only: the owner may already be playing the newly installed build.
  await mkdir('test-results', { recursive: true });
  const first = adb('exec-out', 'screencap', '-p');
  await writeFile('test-results/crowd-phone-live.png', first);
  await new Promise(resolve => setTimeout(resolve, 700));
  assert.notDeepEqual(adb('exec-out', 'screencap', '-p'), first, 'Native frames change');
  const ui = await cdp.evaluate(`({text: document.body.innerText.slice(0, 500),
    canvas: !!document.querySelector('canvas'), fits: document.documentElement.scrollWidth <= innerWidth
      && document.documentElement.scrollHeight <= innerHeight})`);
  assert.ok(ui.canvas && ui.fits);
  const build = JSON.parse(await readFile('artifacts/builds/latest.json', 'utf8'));
  const evidence = { serial, apk: build.apk, ...ui, framesChanged: true };
  await writeFile('test-results/crowd-phone-smoke.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally {
  cdp?.close();
  adb('forward', '--remove', `tcp:${port}`);
}
