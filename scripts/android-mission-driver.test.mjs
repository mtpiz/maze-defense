import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createMissionDriver } from './android-mission-driver.mjs';

const mount = (t, html) => {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  return { window: dom.window, driver: dom.window.eval(`(${createMissionDriver.toString()})()`) };
};

test('uses the real gridcell button and refuses unavailable actions', async (t) => {
  const { window, driver } = mount(t, `<button role="gridcell" aria-label="Row 5, column 7: open build tile"></button>
    <button disabled>Early Launch</button>`);
  let clicks = 0;
  window.document.querySelector('[role=gridcell]').onclick = () => clicks++;
  await driver.tap('Row 5, column 7:');
  assert.equal(clicks, 1);
  await assert.rejects(driver.tap('Early Launch'), /Unavailable/);
  await assert.rejects(driver.tap('Missing control'), /Unavailable/);
});

test('captures the real export and restores the clipboard without writing to the host clipboard', async (t) => {
  const { window, driver } = mount(t, `<section class="diagnostics-panel">
    <button>Copy JSON</button></section>`);
  const original = { writeText: () => { throw new Error('Host clipboard should not be called'); } };
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: original });
  window.document.querySelector('button').onclick = () => window.navigator.clipboard.writeText('{"schemaVersion":3}');
  assert.equal((await driver.snapshot()).report.schemaVersion, 3);
  assert.equal(window.navigator.clipboard, original);
});

test('reads actual result counters without treating missing values as zero', (t) => {
  const { driver } = mount(t, `<div class="hud-stat" aria-label="17 lives remaining"><strong>17</strong></div>
    <div class="hud-stat" aria-label="Wave 6 of 6"><strong>6</strong></div>
    <div class="credit-stat"><strong>67</strong></div>
    <button aria-label="Simulation speed 3 times. Tap to change."></button>
    <section class="mission-result"><dl class="result-stats">
    <div><dt>Waves cleared</dt><dd>6 / 6</dd></div>
    <div><dt>Creeps defeated</dt><dd>197</dd></div>
    <div><dt>Creeps leaked</dt><dd>3</dd></div></dl></section>`);
  const state = driver.read();
  assert.equal(state.lives, 17);
  assert.equal(state.credits, 67);
  assert.equal(state.wave, 6);
  assert.equal(state.speed, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(state.result)), { completedWaves: 6, defeated: 197, leaked: 3 });
  const missing = mount(t, '<section class="mission-result"></section>').driver.read();
  assert.equal(missing.result.defeated, undefined);
  assert.ok(Number.isNaN(missing.lives));
});

test('restores the clipboard even when the export control is missing', async (t) => {
  const { window, driver } = mount(t, '<section class="diagnostics-panel"></section>');
  const original = { writeText() {} };
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: original });
  await assert.rejects(driver.snapshot(), /Unavailable control/);
  assert.equal(window.navigator.clipboard, original);
});

test('builds the affordable mixed opening through actual placement and installation clicks', async (t) => {
  const { window, driver } = mount(t, `<div class="credit-stat"><strong>180</strong></div>
    ${[42, 83, 47, 76].map((cell) => `<button role="gridcell" aria-label="Row ${Math.floor(cell / 9) + 1}, column ${cell % 9 + 1}: open build tile"></button>`).join('')}
    <button class="specialist-rail">Rail</button><button class="specialist-siege">Siege</button>`);
  let selected;
  const credit = window.document.querySelector('.credit-stat strong');
  for (const cell of window.document.querySelectorAll('[role=gridcell]')) {
    cell.onclick = () => {
      selected = cell;
      cell.setAttribute('aria-label', cell.getAttribute('aria-label').replace('open build tile', 'foundation tower'));
      credit.textContent = Number(credit.textContent) - 10;
    };
  }
  for (const [family, cost] of [['rail', 35], ['siege', 50]]) {
    window.document.querySelector(`.specialist-${family}`).onclick = () => {
      selected.setAttribute('aria-label', selected.getAttribute('aria-label').replace('foundation tower', `${family} tower`));
      credit.textContent = Number(credit.textContent) - cost;
    };
  }
  const result = await driver.buildAvailable();
  assert.equal(result.credits, 30);
  assert.equal(result.towers.length, 3);
  assert.equal(result.towers.filter((label) => label.includes('rail tower')).length, 2);
  assert.equal(result.towers.filter((label) => label.includes('siege tower')).length, 1);
});
