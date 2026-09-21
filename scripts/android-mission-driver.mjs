// Serialized into the debug WebView. All game changes go through existing UI controls.
export function createMissionDriver() {
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const button = (label) => [...document.querySelectorAll('button')].find((item) =>
    (item.getAttribute('aria-label') ?? '').startsWith(label) || item.textContent.trim().startsWith(label));
  const tap = async (label) => {
    const control = button(label);
    if (!control || control.disabled) throw new Error(`Unavailable control: ${label}`);
    control.click();
    // A timer also flushes Preact when requestAnimationFrame is suspended in the background.
    await wait(0);
  };
  const number = (value) => Number.parseInt(value, 10);
  const read = () => {
    const stats = Object.fromEntries([...document.querySelectorAll('.result-stats > div')].map((item) =>
      [item.querySelector('dt')?.textContent, number(item.querySelector('dd')?.textContent)]));
    return {
      lives: number(document.querySelector('[aria-label$="lives remaining"] strong')?.textContent),
      credits: number(document.querySelector('.credit-stat strong')?.textContent),
      wave: number(document.querySelector('.hud-stat[aria-label^="Wave "]')?.getAttribute('aria-label')?.split(' ')[1]),
      speed: number(document.querySelector('[aria-label^="Simulation speed "]')?.getAttribute('aria-label')?.split(' ')[2]),
      paused: document.querySelector('[aria-label="Resume simulation"]')?.getAttribute('aria-pressed') === 'true',
      phaseText: document.querySelector('.phase-chip')?.textContent ?? '',
      launchDisabled: document.querySelector('.launch-action')?.disabled ?? null,
      towers: [...document.querySelectorAll('[role="gridcell"]')].map((item) => item.getAttribute('aria-label'))
        .filter((label) => label.includes(' tower')),
      result: document.querySelector('.mission-result') ? {
        completedWaves: stats['Waves cleared'], defeated: stats['Creeps defeated'], leaked: stats['Creeps leaked'],
      } : null,
      viewport: { width: innerWidth, height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
    };
  };
  const openDiagnostics = async () => {
    if (document.querySelector('.diagnostics-panel')) return;
    if (!document.querySelector('.settings-popover')) await tap('Display settings');
    await tap('Engine diagnostics');
  };
  const snapshot = async () => {
    const alreadyOpen = !!document.querySelector('.diagnostics-panel');
    const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    let report;
    try {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (value) => { report = JSON.parse(value); },
      } });
      await openDiagnostics();
      await tap('Copy JSON');
      if (!report) throw new Error('The diagnostic export did not produce a report');
    } finally {
      if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
      else delete navigator.clipboard;
      if (!alreadyOpen && document.querySelector('.diagnostics-panel')) await tap('Close engine diagnostics');
    }
    return { report, ui: read() };
  };
  const positions = [42, 83, 47, 76, 29, 66, 24, 102, 100, 88, 38, 78, 51, 74, 33];
  let nextTower = 0;
  const buildAvailable = async () => {
    while (nextTower < positions.length) {
      const cell = positions[nextTower];
      const family = nextTower % 3 === 2 ? 'siege' : 'rail';
      const label = `Row ${Math.floor(cell / 9) + 1}, column ${cell % 9 + 1}:`;
      const foundation = button(label)?.getAttribute('aria-label')?.includes('foundation tower');
      const cost = (foundation ? 0 : 10) + (family === 'siege' ? 50 : 35);
      if (read().credits < cost) break;
      await tap(label);
      const install = document.querySelector(`.specialist-${family}`);
      if (!install || install.disabled) throw new Error(`Unavailable specialist: ${family}`);
      install.click();
      await wait(0);
      if (!button(label)?.getAttribute('aria-label')?.includes(`${family} tower`)) {
        throw new Error(`Specialist installation did not update cell ${cell}`);
      }
      nextTower++;
    }
    if (button('Clear tower selection')) await tap('Clear tower selection');
    return read();
  };
  const graphics = () => {
    const canvas = document.querySelector('canvas.arena-canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    if (!gl) throw new Error('No game WebGL context');
    return { canvas, gl };
  };
  return {
    tap, read, snapshot, buildAvailable,
    async resetSample() {
      await openDiagnostics();
      await tap('Reset sample');
      await tap('Close engine diagnostics');
    },
    capabilities() {
      const { canvas, gl } = graphics();
      return { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER),
        timerExtensions: gl.getSupportedExtensions().filter((name) => /timer|disjoint/.test(name)),
        combatArt: canvas.dataset.combatArt, gpuTiming: 'not-measured' };
    },
    async pixels() {
      await new Promise(requestAnimationFrame);
      const { canvas, gl } = graphics();
      const data = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      let coloredPixels = 0;
      let hash = 2166136261;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2]) coloredPixels++;
        hash = Math.imul(hash ^ data[i], 16777619);
        hash = Math.imul(hash ^ data[i + 1], 16777619);
        hash = Math.imul(hash ^ data[i + 2], 16777619);
      }
      return { width: canvas.width, height: canvas.height, coloredPixels, hash: hash >>> 0, error: gl.getError() };
    },
  };
}
