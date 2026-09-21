// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PresentationEvent } from '@tower-defense/sim';
import { BenchmarkController, type BenchmarkViewState } from '../application/benchmark-controller.js';
import { CREEP_COLORS } from './neon-art.js';
import { projectileColors } from './neon-palette.js';
import { NEON_MISSION } from './neon-mission.js';

const host = vi.hoisted(() => ({
  ticker: null as { update(elapsedMS: number): void } | null,
}));

vi.mock('pixi.js', () => {
  type Call = { name: string; args: unknown[] };
  const point = () => ({ set: vi.fn() });

  class Chainable {
    readonly calls: Call[] = [];
    readonly position = point();
    readonly scale = point();

    clear() { this.calls.length = 0; return this.record('clear'); }
    rect(...args: unknown[]) { return this.record('rect', args); }
    roundRect(...args: unknown[]) { return this.record('roundRect', args); }
    poly(...args: unknown[]) { return this.record('poly', args); }
    circle(...args: unknown[]) { return this.record('circle', args); }
    moveTo(...args: unknown[]) { return this.record('moveTo', args); }
    lineTo(...args: unknown[]) { return this.record('lineTo', args); }
    fill(...args: unknown[]) { return this.record('fill', args); }
    stroke(...args: unknown[]) { return this.record('stroke', args); }
    destroy() {}

    private record(name: string, args: unknown[] = []): this {
      this.calls.push({ name, args });
      return this;
    }
  }

  class Container extends Chainable {
    readonly children: Chainable[] = [];

    addChild(...children: Chainable[]): void { this.children.push(...children); }
    removeChildren(): Chainable[] { return this.children.splice(0); }
  }

  class Graphics extends Chainable {}

  class Ticker {
    readonly callbacks: ((ticker: { elapsedMS: number }) => void)[] = [];
    maxFPS = 0;

    add(callback: (ticker: { elapsedMS: number }) => void): void { this.callbacks.push(callback); }
    update(elapsedMS: number): void {
      for (const callback of this.callbacks) callback({ elapsedMS });
    }
    start() {}
    stop() {}
    destroy() {}
  }

  class Application {
    readonly ticker = new Ticker();
    readonly stage = new Container();
    readonly canvas = document.createElement('canvas');
    readonly renderer = { type: 'canvas' };

    constructor() { host.ticker = this.ticker; }
    async init(): Promise<void> {}
    start() {}
    stop() {}
    destroy() {}
  }

  class Text extends Chainable {
    readonly anchor = point();

    constructor(readonly config: unknown) { super(); }
  }

  return {
    Application,
    Container,
    Graphics,
    Text,
    RendererType: { WEBGL: 'webgl' },
    Texture: { EMPTY: {} },
  };
});

type Call = { name: string; args: unknown[] };
type Family = 'foundation' | 'rail' | 'siege' | 'arc';
type Mechanic = 'direct' | 'rail-line' | 'siege-blast' | 'arc-chain';

const event = (
  sequence: number,
  towerId: string,
  type: 'tower-fired' | 'weapon-impact',
  mechanicId: Mechanic,
  extra: Record<string, string | number> = {},
): PresentationEvent => ({
  id: `event-${sequence}`,
  sequence,
  tick: 0,
  type,
  payload: {
    towerId,
    mechanicId,
    fromXMilli: 0,
    fromYMilli: 0,
    xMilli: 1_000,
    yMilli: 0,
    ...extra,
  },
});

const stateFor = (family: Family): { state: BenchmarkViewState; towerId: string } => {
  const controller = new BenchmarkController(NEON_MISSION);
  controller.tapCell(42);
  if (family !== 'foundation') controller.installSelected(family);
  const state = controller.getState();
  const tower = state.render.towers[0]!;
  const mechanicId: Mechanic = family === 'foundation'
    ? 'direct'
    : family === 'rail'
      ? 'rail-line'
      : family === 'siege'
        ? 'siege-blast'
        : 'arc-chain';
  const extra = family === 'arc'
    ? { targetPositions: '[[1000,0]]' }
    : family === 'siege'
      ? { impactId: 'impact-1' }
      : {};
  return {
    towerId: tower.id,
    state: {
      ...state,
      render: {
        ...state.render,
        impacts: family === 'siege' ? [{
          id: 'impact-1', towerId: tower.id, mechanicId: 'siege-blast', impactTick: 30,
          xMilli: 1_000, yMilli: 0, radiusMilliCells: 1_200,
        }] : [],
      },
      recentEvents: [event(1, tower.id, 'tower-fired', mechanicId, extra)],
    },
  };
};

const effectColors = (calls: Call[]): number[] => calls
  .filter(({ name }) => name === 'fill' || name === 'stroke')
  .flatMap(({ args }) => {
    const value = args[0];
    if (typeof value === 'number') return [value];
    if (typeof value === 'object' && value !== null && 'color' in value && typeof value.color === 'number')
      return [value.color];
    return [];
  });

const effectsOf = (arena: { effects: unknown }): number[] => effectColors(
  (arena.effects as { calls: Call[] }).calls,
);

describe('neon arena projectile effects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    host.ticker = null;
  });

  it.each([
    ['foundation', 'direct'],
    ['rail', 'rail-line'],
    ['siege', 'siege-blast'],
    ['arc', 'arc-chain'],
  ] as const)('paints %s effects with its canonical color and core', async (family, _mechanic) => {
    const { NeonArena } = await import('./neon-arena.js');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const mount = document.createElement('div');
    Object.defineProperties(mount, { clientWidth: { value: 360 }, clientHeight: { value: 560 } });
    const frames: number[] = [];
    const arena = new NeonArena(mount, (delta) => frames.push(delta));
    await arena.initialize();

    const { state } = stateFor(family);
    arena.update(state);
    host.ticker!.update(16);

    const { color, core } = projectileColors(family);
    expect(frames).toEqual([16]);
    expect(new Set(effectsOf(arena))).toEqual(new Set([color, core]));
    arena.destroy();
  });

  it('keeps siege effect colors after the source tower is removed before impact', async () => {
    const { NeonArena } = await import('./neon-arena.js');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const mount = document.createElement('div');
    Object.defineProperties(mount, { clientWidth: { value: 360 }, clientHeight: { value: 560 } });
    const arena = new NeonArena(mount, () => {});
    await arena.initialize();

    const { state, towerId } = stateFor('siege');
    arena.update(state);
    host.ticker!.update(16);
    arena.update({
      ...state,
      render: { ...state.render, tick: 1, towers: [], impacts: [] },
      recentEvents: [event(2, towerId, 'weapon-impact', 'siege-blast', { impactId: 'impact-1', radiusMilliCells: 1_200 })],
    });
    host.ticker!.update(32);

    const { color, core } = projectileColors('siege');
    expect(new Set(effectsOf(arena))).toEqual(new Set([color, core]));
    arena.destroy();
  });

  it.each([false, true])('renders a short dim round-ended Rail bolt (reduced motion: %s)', async (reduced) => {
    const { NeonArena } = await import('./neon-arena.js');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const mount = document.createElement('div');
    Object.defineProperties(mount, { clientWidth: { value: 360 }, clientHeight: { value: 560 } });
    const arena = new NeonArena(mount, () => {});
    await arena.initialize();
    arena.reducedMotion = reduced;
    arena.update(stateFor('rail').state);
    host.ticker!.update(16);
    const calls = () => (arena.effects as unknown as { calls: Call[] }).calls;
    const head = () => calls().find(call => call.name === 'lineTo')!.args as number[];
    const firstHead = [...head()];
    const checkBolt = () => {
      let from: number[] = [];
      for (const { name, args } of calls()) {
        if (name === 'moveTo') from = args as number[];
        if (name === 'lineTo') expect(Math.hypot(Number(args[0]) - from[0]!, Number(args[1]) - from[1]!)).toBeLessThanOrEqual(.281);
        if (name === 'stroke') {
          const stroke = args[0] as { width: number; alpha: number; cap: string };
          expect(stroke.cap).toBe('round');
          expect(stroke.width).toBeLessThanOrEqual(.05);
          expect(stroke.alpha).toBeLessThanOrEqual(.75);
        }
      }
      expect(calls().some(call => call.name === 'poly')).toBe(false);
    };
    const initialPeakAlpha = Math.max(...calls()
      .filter(({ name }) => name === 'stroke')
      .map(({ args }) => Number((args[0] as { alpha?: number }).alpha)));
    expect(initialPeakAlpha).toBeGreaterThanOrEqual(reduced ? .45 : .7);
    checkBolt();
    host.ticker!.update(64);
    checkBolt();
    if (reduced) expect(head()).toEqual(firstHead);
    else expect(head()[0]).toBeGreaterThan(firstHead[0]!);
    host.ticker!.update(100);
    expect(calls().some(call => call.name === 'lineTo')).toBe(false);
    host.ticker!.update(40);
    expect(effectsOf(arena)).toEqual([]);
    arena.destroy();
  });
});

describe('neon arena directional coverage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    host.ticker = null;
  });

  it('draws the selected Rail range as a sector instead of a full circle', async () => {
    const { NeonArena } = await import('./neon-arena.js');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const mount = document.createElement('div');
    Object.defineProperties(mount, { clientWidth: { value: 360 }, clientHeight: { value: 560 } });
    const arena = new NeonArena(mount, () => {});
    await arena.initialize();
    arena.update(stateFor('rail').state);
    host.ticker!.update(16);

    const calls = (arena.route as unknown as { calls: Call[] }).calls;
    expect(calls.some(({ name }) => name === 'poly')).toBe(true);
    expect(calls.some(({ name, args }) => name === 'circle' && args[2] === .17)).toBe(true);
    arena.destroy();
  });

  it('frames the board with a bright neon perimeter while leaving cell lines subdued', async () => {
    const { NeonArena } = await import('./neon-arena.js');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const mount = document.createElement('div');
    Object.defineProperties(mount, { clientWidth: { value: 360 }, clientHeight: { value: 560 } });
    const arena = new NeonArena(mount, () => {});
    await arena.initialize();
    arena.update(stateFor('foundation').state);
    host.ticker!.update(16);

    const calls = (arena.board as unknown as { calls: Call[] }).calls;
    expect(calls.some(({ name, args }) => name === 'stroke'
      && (args[0] as { color?: number; alpha?: number }).color === 0x00d9d2
      && Number((args[0] as { alpha?: number }).alpha) >= .7)).toBe(true);
    arena.destroy();
  });
});

describe('neon arena creep styling', () => {
  it('interpolates body positions between combat snapshots instead of stepping at 30 Hz', async () => {
    const { NeonArena } = await import('./neon-arena.js');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const arena = new NeonArena(document.createElement('div'), () => {});
    await arena.initialize();
    const state = stateFor('foundation').state;
    const frame = (tick: number, xMilli: number) => ({ ...state, ui: { ...state.ui, phase: 'wave' as const }, render: { ...state.render, tick,
      towers: [], creeps: [{ id: 'creep-1', creepId: 'broodling' as const, layer: 'ground' as const,
        health: 6, maxHealth: 6, armor: 0, fromCell: 0, toCell: 1, progressPermille: 0,
        xMilli, yMilli: 0, radiusMilliCells: 80 }] } });
    arena.update(frame(1, 0));
    host.ticker!.update(16);
    arena.update(frame(2, 100));
    for (const alpha of [0, .5, 1]) {
      arena.interpolationAlpha = alpha;
      host.ticker!.update(8);
      const polygon = (arena.units as unknown as { calls: Call[] }).calls.find(c => c.name === 'poly')!;
      const points = polygon.args[0] as number[];
      const x = points.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b) / 4;
      expect(x - .012).toBeCloseTo(.5 + .1 * alpha, 5);
    }
    arena.update(frame(4, 300));
    arena.interpolationAlpha = 0;
    host.ticker!.update(8);
    const points = (arena.units as unknown as { calls: Call[] }).calls.find(c => c.name === 'poly')!.args[0] as number[];
    expect(points.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b) / 4 - .012).toBeCloseTo(.7, 5);
    const paused = frame(4, 300);
    arena.update({ ...paused, ui: { ...paused.ui, paused: true } });
    host.ticker!.update(8);
    const frozen = (arena.units as unknown as { calls: Call[] }).calls.find(c => c.name === 'poly')!.args[0] as number[];
    expect(frozen.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b) / 4 - .012).toBeCloseTo(.8, 5);
    arena.update(frame(4, 300));
    host.ticker!.update(8);
    const resumed = (arena.units as unknown as { calls: Call[] }).calls.find(c => c.name === 'poly')!.args[0] as number[];
    expect(resumed.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b) / 4 - .012).toBeCloseTo(.8, 5);
    arena.destroy();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    host.ticker = null;
  });

  it('renders creep bodies as luminous outlines with restrained interior fill', async () => {
    const { NeonArena } = await import('./neon-arena.js');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    const mount = document.createElement('div');
    Object.defineProperties(mount, { clientWidth: { value: 360 }, clientHeight: { value: 560 } });
    const arena = new NeonArena(mount, () => {});
    await arena.initialize();
    const state = stateFor('foundation').state;
    arena.update({
      ...state,
      render: {
        ...state.render,
        creeps: [{
          id: 'creep-17', creepId: 'broodling', layer: 'ground',
          health: 6, maxHealth: 6, armor: 0, fromCell: 0, toCell: 1, progressPermille: 500,
          xMilli: 500, yMilli: 120, radiusMilliCells: 110,
        }],
      },
    });
    host.ticker!.update(16);

    const calls = (arena.units as unknown as { calls: Call[] }).calls;
    const bodyFills = calls.filter(({ name, args }) => name === 'fill'
      && typeof args[0] === 'object' && args[0] !== null
      && (args[0] as { color?: number }).color === CREEP_COLORS.broodling)
      .map(({ args }) => Number((args[0] as { alpha?: number }).alpha));
    const outlines = calls.filter(({ name, args }) => name === 'stroke'
      && (args[0] as { color?: number }).color === CREEP_COLORS.broodling)
      .map(({ args }) => args[0] as { width?: number; alpha?: number });

    expect(Math.max(...bodyFills)).toBeLessThanOrEqual(.25);
    expect(outlines.some(({ width, alpha }) => (width ?? 0) >= .012 && (width ?? 0) <= .02 && (alpha ?? 0) >= .9)).toBe(true);
    arena.destroy();
  });
});
