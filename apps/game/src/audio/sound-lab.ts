// Sound Lab: audition every baked cue, the space ambience, and a rehearsed wave through the real
// AudioDirector budget. Development tool only; the game never imports this file.
import type { PresentationEvent, PresentationEventType } from '@tower-defense/sim';
import { AudioDirector } from './audio-director.js';
import { GameAudio } from './game-audio.js';
import { bakeSound } from './sound-bank.js';
import { SOUND_CATALOG, type SoundId } from './sound-catalog.js';

interface Group {
  readonly title: string;
  readonly note: string;
  readonly sounds: readonly (readonly [SoundId, string, string, string])[];
}

const GROUPS: readonly Group[] = [
  {
    title: 'Player towers',
    note: 'Clean, tuned, synthetic. Each tower family has its own rhythm and register so you can hear which one is working.',
    sounds: [
      ['foundation-fire', 'Foundation pulse', 'Tiny bright tick. Fires constantly, so it sits lowest in the mix.', '#6f8f92'],
      ['rail-fire', 'Rail shot', 'Struck-cable "pew": fast falling chirps over a metallic ring, after Ben Burtt\'s blaster technique.', '#48cfff'],
      ['arc-fire', 'Arc chain', 'Random crackle, a 48 Hz gated buzz, and a snapping zap.', '#ed66ff'],
      ['siege-launch', 'Siege launch', 'Mortar-tube thump: a pitched sub drop with a resonant bore of air.', '#ffce39'],
      ['siege-impact', 'Siege impact', 'Driven noise blast closing down to a rumble, sub punch, scattered debris.', '#ffce39'],
      ['gravity-fire', 'Gravity collapse', 'Rising inhale that implodes into a sub drop.', '#77f0c7'],
    ],
  },
  {
    title: 'The Brood',
    note: 'Organic and wet: band-passed noise formants, chitter, shell cracks. The opposite texture to your towers.',
    sounds: [
      ['broodling-death', 'Broodling', 'Tiny squish. Arrives in swarms, so it is short and quiet.', '#ff538e'],
      ['drone-death', 'Drone', 'Chitinous squeal falling into a wet pop.', '#ff538e'],
      ['glider-death', 'Glider', 'Airy membrane tear with a descending cry.', '#ff538e'],
      ['carapace-death', 'Carapace', 'Fracture clicks, a crunchy thud, then a low groan.', '#ff538e'],
    ],
  },
  {
    title: 'Construction and interface',
    note: 'Short and quantized. These confirm your own actions, so they must never mask combat.',
    sounds: [
      ['build', 'Build', 'Rising shimmer that resolves into two blips.', '#bbffff'],
      ['specialist', 'Specialist installed', 'Power-up arpeggio over a rising detuned shimmer.', '#bbffff'],
      ['dismantle', 'Dismantle', 'Build in reverse.', '#bbffff'],
      ['route-changed', 'Route recalculated', 'Soft two-note data chirp.', '#bbffff'],
      ['ui-tap', 'Tap', 'Click for pause and speed changes.', '#bbffff'],
      ['ui-deny', 'Denied', 'Two low pulses for an action that is not allowed.', '#bbffff'],
    ],
  },
  {
    title: 'Mission flow',
    note: 'Alerts outrank everything. They steal voices from combat when the budget is full.',
    sounds: [
      ['wave-start', 'Wave incoming', 'A plasma "whistler" falls across the band over a low warning horn.', '#aeffd8'],
      ['wave-clear', 'Wave cleared', 'Rising chime chord.', '#aeffd8'],
      ['leak', 'Breach', 'Two-tone klaxon with a sub hit. You lost a Life.', '#ff538e'],
      ['victory', 'Sector secured', 'Synth-brass rise into a bright major chord.', '#ffdf42'],
      ['defeat', 'Signal lost', 'A detuned pad sinks while radio static gates out.', '#ff538e'],
    ],
  },
  {
    title: 'Space events',
    note: 'Modeled on spacecraft plasma-wave recordings. The ambience scatters these every 7 to 16 seconds.',
    sounds: [
      ['amb-whistler', 'Whistler', 'A pure tone falling from about 5 kHz, like lightning energy dispersing along a magnetic field line.', '#8e9aac'],
      ['amb-chorus', 'Chorus', 'A flock of rising chirps, like the "dawn chorus" in Earth\'s radiation belts.', '#8e9aac'],
    ],
  },
];

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const audio = new GameAudio({ effectsEnabled: true, musicEnabled: false });
let analyser: AnalyserNode | null = null;
let scopeData: Uint8Array<ArrayBuffer> | null = null;
let scopeColor = '#55eaff';

const ensureAudio = (): void => {
  audio.unlock();
  if (analyser === null) {
    analyser = audio.createAnalyser();
    if (analyser !== null) scopeData = new Uint8Array(analyser.fftSize);
  }
};

const drawWave = (canvas: HTMLCanvasElement, data: Float32Array, color: string): void => {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * ratio;
  const height = canvas.clientHeight * ratio;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) return;
  context.clearRect(0, 0, width, height);
  context.fillStyle = color;
  const step = data.length / width;
  for (let x = 0; x < width; x += 1) {
    let peak = 0;
    const start = Math.floor(x * step);
    for (let index = start; index < Math.min(data.length, start + step); index += 1) peak = Math.max(peak, Math.abs(data[index]!));
    const bar = Math.max(1, peak * height * 0.92);
    context.fillRect(x, (height - bar) / 2, 1, bar);
  }
};

const renderPads = (): void => {
  const root = byId('groups');
  for (const group of GROUPS) {
    const section = document.createElement('section');
    section.className = 'group';
    section.innerHTML = `<header><h2>${group.title}</h2><p>${group.note}</p></header><div class="pads"></div>`;
    const pads = section.querySelector('.pads')!;
    for (const [id, name, description, color] of group.sounds) {
      const spec = SOUND_CATALOG[id];
      const pad = document.createElement('button');
      pad.className = 'pad';
      pad.id = `pad-${id}`;
      pad.style.setProperty('--tone', color);
      pad.innerHTML = `<canvas aria-hidden="true"></canvas><span class="pad-name">${name}</span>
        <span class="pad-desc">${description}</span>
        <span class="pad-meta"><span>${spec.duration.toFixed(2)} s</span><span>${spec.bus}</span><span>×${spec.maxVoices}</span><span>${spec.minIntervalMs} ms</span></span>`;
      pad.addEventListener('click', () => {
        ensureAudio();
        scopeColor = color;
        audio.play(id, 0, 1);
        pad.classList.remove('hit');
        void pad.offsetWidth;
        pad.classList.add('hit');
      });
      pads.append(pad);
      void bakeSound(id, 44_100).then((buffer) => drawWave(pad.querySelector('canvas')!, buffer.getChannelData(0), color));
    }
    root.append(section);
  }
};

const drawScope = (): void => {
  const canvas = byId<HTMLCanvasElement>('scope');
  const context = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== canvas.clientWidth * ratio) {
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
  }
  if (context !== null) {
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = '#163038';
    context.lineWidth = ratio;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
    if (analyser !== null && scopeData !== null) {
      analyser.getByteTimeDomainData(scopeData);
      context.strokeStyle = scopeColor;
      context.lineWidth = 1.5 * ratio;
      context.shadowColor = scopeColor;
      context.shadowBlur = 8 * ratio;
      context.beginPath();
      for (let index = 0; index < scopeData.length; index += 1) {
        const x = (index / (scopeData.length - 1)) * width;
        const y = (scopeData[index]! / 255) * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.shadowBlur = 0;
    }
  }
  byId('voices').textContent = String(audio.activeVoices);
  requestAnimationFrame(drawScope);
};

// --- Wave rehearsal: synthetic presentation events at 30 Hz through the real director budget. ----

const ARENA_WIDTH = 9;
let rehearsal: number | null = null;

const runRehearsal = (): void => {
  ensureAudio();
  if (rehearsal !== null) return;
  const director = new AudioDirector(ARENA_WIDTH);
  const button = byId<HTMLButtonElement>('rehearse');
  button.disabled = true;
  audio.setIntensity(1);
  let tick = 0;
  let sequence = 0;
  let emitted = 0;
  let played = 0;
  const totalTicks = 30 * 12;
  const random = Math.random;
  const x = (): number => Math.floor(random() * ARENA_WIDTH * 1_000);
  const siegeImpacts: number[] = [];
  const started = performance.now();

  rehearsal = window.setInterval(() => {
    tick += 1;
    const events: PresentationEvent[] = [];
    const emit = (type: PresentationEventType, payload: PresentationEvent['payload'] = {}): void => {
      sequence += 1;
      events.push({ id: `lab-${sequence}`, sequence, tick, type, payload });
    };
    const busy = tick > 20 && tick < totalTicks - 40;
    if (tick === 1) emit('wave-started', { waveNumber: 1 });
    if (busy) {
      for (let tower = 0; tower < 6; tower += 1) if (random() < 1 / 9) emit('tower-fired', { mechanicId: 'direct', fromXMilli: x() });
      for (let tower = 0; tower < 3; tower += 1) if (random() < 1 / 36) emit('tower-fired', { mechanicId: 'rail-line', fromXMilli: x() });
      for (let tower = 0; tower < 2; tower += 1) if (random() < 1 / 18) emit('tower-fired', { mechanicId: 'arc-chain', fromXMilli: x() });
      if (random() < 1 / 45) {
        emit('tower-fired', { mechanicId: 'siege-blast', fromXMilli: x() });
        siegeImpacts.push(tick + 15);
      }
      if (random() < 0.12) for (let count = 0; count < 1 + Math.floor(random() * 4); count += 1) emit('creep-died', { creepType: 'broodling', xMilli: x() });
      if (random() < 0.05) emit('creep-died', { creepType: 'drone', xMilli: x() });
      if (random() < 0.02) emit('creep-died', { creepType: 'glider', xMilli: x() });
      if (random() < 0.008) emit('creep-died', { creepType: 'carapace', xMilli: x() });
      if (tick === 180) emit('creep-leaked', { creepType: 'drone', xMilli: 4_500 });
    }
    while (siegeImpacts.length > 0 && siegeImpacts[0]! <= tick) {
      siegeImpacts.shift();
      emit('weapon-impact', { mechanicId: 'siege-blast', hitCount: 5, xMilli: x() });
      for (let count = 0; count < 4; count += 1) emit('creep-died', { creepType: 'broodling', xMilli: x() });
    }
    if (tick === totalTicks) emit('wave-completed', { waveNumber: 1 });

    emitted += events.length;
    const requests = director.consume(events, tick, performance.now() - started);
    played += requests.length;
    audio.playAll(requests);
    byId('emitted').textContent = String(emitted);
    byId('played').textContent = String(played);
    byId('ratio').textContent = emitted > 0 ? `${Math.round((1 - played / emitted) * 100)}%` : '–';
    byId('clock').textContent = `${(tick / 30).toFixed(1)} s`;

    if (tick >= totalTicks) {
      window.clearInterval(rehearsal!);
      rehearsal = null;
      button.disabled = false;
      audio.setIntensity(ambienceIntensity());
    }
  }, 1_000 / 30);
};

const ambienceIntensity = (): number => Number(byId<HTMLInputElement>('intensity').value) / 100;

const wireControls = (): void => {
  const music = byId<HTMLInputElement>('ambience');
  music.addEventListener('change', () => {
    ensureAudio();
    audio.setPreferences({ effectsEnabled: true, musicEnabled: music.checked });
    audio.setIntensity(ambienceIntensity());
  });
  byId<HTMLInputElement>('intensity').addEventListener('input', () => audio.setIntensity(ambienceIntensity()));
  byId<HTMLInputElement>('volume').addEventListener('input', (event) => {
    audio.setMasterVolume(Number((event.currentTarget as HTMLInputElement).value) / 100);
  });
  byId('rehearse').addEventListener('click', runRehearsal);
  window.addEventListener('pointerdown', ensureAudio, { capture: true, once: true });
};

renderPads();
wireControls();
requestAnimationFrame(drawScope);
