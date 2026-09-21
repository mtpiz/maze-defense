// @vitest-environment jsdom

import type { Container, Graphics, Sprite, Texture, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreepSnapshot, PresentationEvent } from '@tower-defense/sim';
import { BenchmarkController, type BenchmarkViewState } from '../application/benchmark-controller.js';
import type { FrameWorkSample } from '../platform/engine-gate-diagnostics.js';
import { ArenaView } from './arena-view.js';

const host = vi.hoisted(() => ({
  ticker: null as Ticker | null,
  trace: [] as string[],
  delayInit: false,
  finishInit: () => {},
  destroyed: 0,
  maxTextures: 32,
  bindings: [] as number[],
  stage: null as Container | null,
  atlas: null as Texture | null,
  failAsset: false,
  delayAsset: false,
  finishAsset: () => {},
  renderWork: () => {},
}));

vi.mock('pixi.js', async (importOriginal) => {
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const pixi = await importOriginal<typeof import('pixi.js')>();
  context.mockRestore();
  // Keep Pixi's real clock and scene objects; substitute only the GPU application host.
  return { ...pixi, Assets: { load: async () => {
    if (host.delayAsset) await new Promise<void>((resolve) => { host.finishAsset = resolve; });
    if (host.failAsset) throw new Error('Atlas unavailable');
    host.atlas ??= new pixi.Texture({ source: new pixi.TextureSource({ width: 1774, height: 887 }) });
    return host.atlas;
  } }, Application: class {
    readonly ticker = new pixi.Ticker();
    readonly stage = new pixi.Container();
    readonly canvas = document.createElement('canvas');
    readonly screen = { width: 320, height: 568 };
    renderer: object | undefined;
    constructor() { host.ticker = this.ticker; host.stage = this.stage; }
    async init(options: { autoStart?: boolean }) {
      if (host.delayInit) await new Promise<void>((resolve) => { host.finishInit = resolve; });
      this.renderer = {
        type: pixi.RendererType.WEBGL,
        limits: { maxTextures: host.maxTextures },
        texture: {
          unbind: vi.fn(),
          bind: (texture: unknown, unit: number) => {
            expect(texture).toBe(pixi.Texture.EMPTY);
            host.bindings.push(unit);
          },
        },
      };
      this.ticker.add(() => { host.trace.push('render'); host.renderWork(); }, undefined, pixi.UPDATE_PRIORITY.LOW);
      if (options.autoStart ?? true) this.start();
    }
    start() { this.ticker.start(); }
    stop() { this.ticker.stop(); }
    destroy() {
      if (!this.renderer) throw new Error('Cannot destroy an uninitialized renderer');
      host.destroyed += 1;
      this.ticker.destroy();
      this.stage.destroy({ children: true });
      this.canvas.remove();
    }
  } };
});

describe('Arena frame ownership', () => {
  let mount: HTMLDivElement;
  let view: ArenaView;

  beforeEach(() => {
    host.trace = [];
    host.delayInit = false;
    host.destroyed = 0;
    host.maxTextures = 32;
    host.bindings = [];
    host.atlas = null;
    host.failAsset = false;
    host.delayAsset = false;
    host.renderWork = () => {};
    mount = document.createElement('div');
    document.body.appendChild(mount);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });

  afterEach(() => {
    view.destroy();
    host.atlas?.destroy(true);
    mount.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('updates before submitting the frame and forwards uncapped foreground intervals', async () => {
    const elapsed: number[] = [];
    view = new ArenaView(mount, () => {}, (milliseconds) => {
      elapsed.push(milliseconds);
      host.trace.push('update');
    });
    await view.initialize();
    host.ticker!.update(600);
    expect(elapsed).toEqual([600]);
    expect(host.trace).toEqual(['update', 'render']);
  });

  it('measures update, scene, and render-submission CPU work around the real ticker order', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const samples: FrameWorkSample[] = [];
    host.renderWork = () => { now += 3; };
    view = new ArenaView(mount, () => {}, () => { now += 2; }, (sample) => {
      host.trace.push('measured');
      samples.push(sample);
    });
    await view.initialize();
    host.ticker!.update(100);
    expect(host.trace).toEqual(['render', 'measured']);
    expect(samples).toEqual([{ updateMilliseconds: 2, sceneMilliseconds: 0, renderSubmissionMilliseconds: 3 }]);
    view.destroy();
    expect(samples).toHaveLength(1);
  });

  it('caps both updates and rendering at the selected rate on a fast display', async () => {
    view = new ArenaView(mount, () => {}, () => host.trace.push('update'));
    view.setFrameRate(30);
    await view.initialize();
    for (let frame = 1; frame <= 240; frame += 1) host.ticker!.update(frame * 1_000 / 240);
    const battery = host.trace.filter((event) => event === 'update').length;
    expect(battery).toBeGreaterThanOrEqual(28);
    expect(battery).toBeLessThanOrEqual(30);
    expect(host.trace.filter((event) => event === 'render')).toHaveLength(battery);
    host.trace = [];
    view.setFrameRate(60);
    for (let frame = 1; frame <= 240; frame += 1) host.ticker!.update(1_000 + frame * 1_000 / 240);
    const quality = host.trace.filter((event) => event === 'update').length;
    expect(quality).toBeGreaterThanOrEqual(58);
    expect(quality).toBeLessThanOrEqual(60);
    expect(host.trace.filter((event) => event === 'render')).toHaveLength(quality);
  });

  it('stops the frame clock while hidden and removes lifecycle listeners on disposal', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(host.ticker!.started).toBe(false);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(host.ticker!.started).toBe(true);
    view.destroy();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(host.ticker!.started).toBe(false);
    expect(host.destroyed).toBe(1);
  });

  it('safely disposes a renderer that finishes initialization after unmount', async () => {
    host.delayInit = true;
    view = new ArenaView(mount, () => {});
    const ready = view.initialize();
    expect(() => view.destroy()).not.toThrow();
    host.finishInit();
    await ready;
    expect(mount.childElementCount).toBe(0);
    expect(host.ticker!.started).toBe(false);
    expect(host.destroyed).toBe(1);
  });

  it.each([8, 16, 32])('initializes all %i supported texture slots before rendering', async (count) => {
    host.maxTextures = count;
    view = new ArenaView(mount, () => {});
    await view.initialize();
    expect(host.bindings).toEqual(Array.from({ length: count }, (_, unit) => unit));
    expect(host.trace).toEqual([]);
  });

  it('rebinds texture slots on context restoration and removes the listener on disposal', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    const canvas = mount.querySelector('canvas')!;
    host.bindings = [];
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(host.bindings).toEqual(Array.from({ length: 32 }, (_, unit) => unit));
    view.destroy();
    host.bindings = [];
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(host.bindings).toEqual([]);
  });

  const preferences = { highContrast: false, reducedMotion: false, showAirRoute: false };
  const sprites = (label: string): Sprite[] =>
    host.stage!.getChildByLabel(label)!.children as Sprite[];
  const creep = (creepId: CreepSnapshot['creepId'], index = 0): CreepSnapshot => ({
    id: `creep-${index}`, creepId, layer: creepId === 'glider' ? 'air' : 'ground',
    health: 20, maxHealth: 20, armor: creepId === 'carapace' ? 10 : 0,
    fromCell: 18, toCell: 19, progressPermille: 500,
    xMilli: 500, yMilli: 2_000, radiusMilliCells: 110,
  });
  const stateWith = (creeps: readonly CreepSnapshot[], tick = 0): BenchmarkViewState => {
    const controller = new BenchmarkController();
    controller.tapCell(42);
    const state = controller.getState();
    return { ...state, render: { ...state.render, creeps, tick } };
  };

  it('renders every Gate unit from a distinct, in-bounds region of one shared atlas', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    const state = stateWith(['drone', 'carapace', 'broodling', 'glider'].map((family, index) =>
      creep(family as CreepSnapshot['creepId'], index)));
    const tower = state.render.towers[0]!;
    view.render({ ...state, render: { ...state.render, towers: ['foundation', 'rail', 'siege'].map((familyId, index) =>
      ({ ...tower, id: `tower-${index}`, cell: 42 + index, familyId: familyId as typeof tower.familyId })) } }, preferences);
    host.ticker!.update(100);
    expect(mount.querySelector('canvas')!.dataset.combatArt).toBe('proxy-v1');
    const units = [...sprites('combat-towers'), ...sprites('combat-creeps')];
    expect(units).toHaveLength(7);
    expect(new Set(units.map((unit) => unit.texture.frame.x))).toHaveLength(7);
    for (const unit of units) {
      expect(unit.texture.source).toBe(host.atlas!.source);
      expect(unit.texture.frame.right).toBeLessThanOrEqual(1774);
      expect(unit.texture.frame.bottom).toBeLessThanOrEqual(887);
      expect(unit.anchor.x).toBe(0.5);
      expect(unit.eventMode).toBe('none');
      expect(Math.max(unit.width, unit.height)).toBeLessThanOrEqual(33 * 0.8);
    }
  });

  it('reuses live sprites at full load and releases removed units without destroying the shared atlas', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    const state = stateWith(Array.from({ length: 120 }, (_, index) => creep('broodling', index)));
    view.render(state, preferences);
    host.ticker!.update(100);
    const original = [...sprites('combat-creeps')];
    for (let frame = 2; frame < 20; frame += 1) {
      view.render(state, preferences);
      host.ticker!.update(frame * 100);
      expect(sprites('combat-creeps')).toEqual(original);
    }
    view.render(stateWith([creep('broodling')]), preferences);
    host.ticker!.update(2_000);
    expect(sprites('combat-creeps')).toEqual([original[0]]);
    expect(original[1]!.destroyed).toBe(true);
    view.destroy();
    expect(original[0]!.destroyed).toBe(true);
    expect(host.atlas!.destroyed).toBe(false);
    expect(host.atlas!.source.destroyed).toBe(false);
  });

  it('follows route progress and preserves distinct family sizes', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    const state = stateWith([creep('broodling'), creep('carapace', 1), creep('glider', 2)]);
    view.render(state, preferences);
    host.ticker!.update(100);
    const [small, armored, air] = sprites('combat-creeps');
    expect(small!.rotation).toBeCloseTo(Math.PI / 2);
    expect(armored!.width).toBeGreaterThan(small!.width);
    expect(air!.width).toBeGreaterThan(small!.width);
    const previousX = small!.x;
    view.render({ ...state, render: { ...state.render, creeps: [{ ...creep('broodling'), progressPermille: 1_000, xMilli: 1_000 }] } }, preferences);
    host.ticker!.update(200);
    expect(small!.x - previousX).toBeCloseTo(16.5);
  });

  it('turns towers toward their last shot, suppresses recoil with reduced motion, and clears it on retry', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    const state = stateWith([], 30);
    const event: PresentationEvent = {
      id: 'shot-1', sequence: 1, tick: 30, type: 'tower-fired',
      payload: { towerId: state.render.towers[0]!.id, fromXMilli: 0, fromYMilli: 0, xMilli: 1_000, yMilli: 0 },
    };
    view.render({ ...state, recentEvents: [event] }, preferences);
    host.ticker!.update(100);
    const tower = sprites('combat-towers')[0]!;
    const recoiledX = tower.x;
    expect(tower.rotation).toBeCloseTo(Math.PI / 2);
    view.render(state, { ...preferences, reducedMotion: true });
    host.ticker!.update(200);
    expect(tower.x).toBeGreaterThan(recoiledX);
    view.render(stateWith([]), preferences);
    host.ticker!.update(300);
    expect(sprites('combat-towers')[0]!.rotation).toBe(0);
  });

  it('uses the geometric accessibility renderer in high contrast and restores the atlas afterwards', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    view.render(stateWith([creep('drone')]), { ...preferences, highContrast: true });
    host.ticker!.update(100);
    expect(host.stage!.getChildByLabel('combat-creeps')!.visible).toBe(false);
    const overlays = host.stage!.getChildByLabel('creep-overlays') as Graphics;
    expect(overlays.context.instructions.length).toBeGreaterThan(0);
    expect(mount.querySelector('canvas')!.dataset.combatArt).toBe('high-contrast');
    view.render(stateWith([creep('drone')]), preferences);
    host.ticker!.update(200);
    expect(host.stage!.getChildByLabel('combat-creeps')!.visible).toBe(true);
    expect(overlays.context.instructions).toHaveLength(0);
    expect(mount.querySelector('canvas')!.dataset.combatArt).toBe('proxy-v1');
  });

  it('keeps the Arena usable and marks fallback when the atlas cannot load', async () => {
    host.failAsset = true;
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    view = new ArenaView(mount, () => {});
    await view.initialize();
    await Promise.resolve();
    view.render(stateWith([creep('drone')]), preferences);
    host.ticker!.update(100);
    expect(mount.querySelector('canvas')!.dataset.combatArt).toBe('fallback');
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Combat atlas'), expect.any(Error));
    expect(host.trace).toContain('render');
  });

  it('ignores an atlas that finishes loading after unmount', async () => {
    host.delayAsset = true;
    view = new ArenaView(mount, () => {});
    await view.initialize();
    view.destroy();
    host.finishAsset();
    await Promise.resolve();
    await Promise.resolve();
    expect(mount.childElementCount).toBe(0);
    expect(host.destroyed).toBe(1);
    expect(host.atlas!.destroyed).toBe(false);
  });

  it('replaces provisional geometry when loading finishes during an untimed opening', async () => {
    host.delayAsset = true;
    view = new ArenaView(mount, () => {});
    await view.initialize();
    view.render(stateWith([]), preferences);
    host.ticker!.update(100);
    expect(mount.querySelector('canvas')!.dataset.combatArt).toBe('loading');
    host.finishAsset();
    await Promise.resolve();
    await Promise.resolve();
    host.ticker!.update(200);
    expect(mount.querySelector('canvas')!.dataset.combatArt).toBe('proxy-v1');
    expect(sprites('combat-towers')).toHaveLength(1);
  });

  it('preserves construction opacity until a tower becomes operational', async () => {
    view = new ArenaView(mount, () => {});
    await view.initialize();
    const state = stateWith([]);
    view.render(state, preferences);
    host.ticker!.update(100);
    const tower = sprites('combat-towers')[0]!;
    expect(tower.alpha).toBe(0.45);
    view.render({ ...state, render: { ...state.render, tick: state.render.towers[0]!.operationalAtTick } }, preferences);
    host.ticker!.update(200);
    expect(tower.alpha).toBe(1);
  });
});
