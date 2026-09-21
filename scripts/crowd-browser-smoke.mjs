import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const require = createRequire(process.env.BROWSER_RUNTIME_PACKAGE
  ?? 'C:/Users/mpitt/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
const results = [];
await mkdir('test-results', { recursive: true });
try {
  for (const viewport of [{ width: 412, height: 839 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5186/neon.html');
    await page.locator('canvas').waitFor();
    await page.getByRole('button', { name: 'Launch wave', exact: true }).click();
    await page.waitForTimeout(6500);
    const active = await page.locator('.wave-readout').innerText();
    const imageA = await page.screenshot({ path: `test-results/crowd-live-${viewport.width}.png` });
    await page.waitForTimeout(700);
    const imageB = await page.screenshot();
    assert.notDeepEqual(imageA, imageB, 'Live combat frames must change');
    const png = PNG.sync.read(imageA);
    let neonPixels = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i] > 130 && png.data[i + 1] < 150 && png.data[i + 2] > 60) neonPixels++;
    }
    assert.ok(neonPixels > 100, 'Expected visible red swarm pixels');
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth
      && document.documentElement.scrollHeight <= innerHeight);
    assert.ok(fits, 'Game must fit viewport');
    results.push({ viewport, active, neonPixels, fits, framesChanged: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile('test-results/crowd-browser-smoke.json', JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} finally { await browser.close(); }
