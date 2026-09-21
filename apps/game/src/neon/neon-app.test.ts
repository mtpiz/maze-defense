// @vitest-environment jsdom
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NeonApp } from './neon-app.js';

const renderer = vi.hoisted(() => ({
  frame: (_delta: number, _now: number) => {}, cell: 10, state: null as any,
  aimPreview: null as number | null, aimHandleHit: false,
}));
vi.mock('./neon-arena.js', () => ({ NeonArena: class {
  constructor(_mount: HTMLElement, frame: typeof renderer.frame) { renderer.frame = frame; }
  async initialize() {} update(state: unknown) { renderer.state = state; } destroy() {} setVisible() {} fit() {} pan() {} zoomBy() {}
  get aimPreview() { return renderer.aimPreview; }
  set aimPreview(value: number | null) { renderer.aimPreview = value; }
  cellAt() { return renderer.cell; }
  cellPoint() { return { x: 160, y: 240 }; }
  isAimHandleHit() { return renderer.aimHandleHit; }
} }));

describe('mounted neon radial construction', () => {
  let root: HTMLDivElement;
  const button = (label: string) => [...root.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label)!;
  const credits = () => Number(root.querySelector('.credits strong')!.textContent);
  const pointer = (type: string, x = 160, y = 240, id = 1) => {
    const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(e, 'pointerId', { value: id });
    root.querySelector('.neon-surface')!.dispatchEvent(e);
  };
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    for (const event of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
      Object.defineProperty(HTMLElement.prototype, `on${event}`, { value: null, configurable: true });
    }
    HTMLElement.prototype.setPointerCapture = () => {};
    root = document.createElement('div'); document.body.append(root);
    await act(() => render(h(NeonApp, {}), root));
    const surface = root.querySelector('.neon-surface')!;
    Object.defineProperty(surface, 'clientWidth', { value: 360 });
    Object.defineProperty(surface, 'clientHeight', { value: 500 });
    renderer.cell = 10;
    renderer.aimPreview = null;
    renderer.aimHandleHit = false;
  });
  afterEach(async () => { await act(() => render(null, root)); root.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const hold = async () => {
    await act(() => pointer('pointerdown'));
    await act(() => { vi.advanceTimersByTime(221); renderer.frame(16, performance.now()); });
  };
  it('opens on an empty board without demonstration towers', () => {
    expect(renderer.state.render.towers).toEqual([]);
  });
  it('keeps status in one HUD and removes permanent title, camera and inspector rows', async () => {
    expect(root.querySelector('.neon-header')).toBeNull();
    expect(root.querySelector('.neon-hud')?.contains(button('Settings'))).toBe(true);
    expect(root.querySelector('.neon-arena-region')?.querySelector('.camera-tools')).toBeNull();
    expect(root.querySelector('.tower-readout')).toBeNull();
    await act(() => { pointer('pointerdown'); pointer('pointerup'); });
    expect(root.querySelector('.tower-readout strong')?.textContent).toBe('foundation');
    expect(root.querySelector('.neon-footer')?.contains(button('Launch wave'))).toBe(true);
    await act(() => button('Clear selection').click());
    expect(root.querySelector('.tower-readout')).toBeNull();
  });
  it('builds on tap, then holds/drags/previews/releases a real specialization once', async () => {
    const start = credits();
    await act(() => { pointer('pointerdown'); pointer('pointerup'); });
    expect(credits()).toBe(start - 10);
    await hold();
    expect(button('Upgrade to rail, 35 credits')).toBeTruthy();
    expect((root.querySelector('.radial-layer') as HTMLElement).style.top).toBe('240px');
    expect(root.querySelector('.radial-connector line')?.getAttribute('y1')).toBe('240');
    await act(() => pointer('pointermove', 160, 162));
    await act(() => { vi.advanceTimersByTime(351); renderer.frame(16, performance.now()); });
    expect(root.querySelector('.tower-readout')?.textContent).toContain('Preview');
    await act(() => { pointer('pointerup', 160, 162); pointer('pointerup', 160, 162); });
    expect(credits()).toBe(start - 45);
    expect(root.querySelector('.tower-readout strong')?.textContent).toBe('rail');
    expect(root.querySelector('.radial-layer')).toBeNull();
  });
  it('rotates a selected specialist only by dragging its range handle', async () => {
    await act(() => { pointer('pointerdown'); pointer('pointerup'); });
    await hold();
    await act(() => { pointer('pointermove', 160, 162); pointer('pointerup', 160, 162); });
    const selectedTower = () => renderer.state.render.towers
      .find((tower: { id: string }) => tower.id === renderer.state.selectedTowerId);
    expect(selectedTower().facingMilliDegrees).not.toBe(0);

    await act(() => { pointer('pointerdown', 160, 240); pointer('pointermove', 240, 240); pointer('pointerup', 240, 240); });
    expect(renderer.aimPreview).toBeNull();
    expect(selectedTower().facingMilliDegrees).not.toBe(0);

    renderer.aimHandleHit = true;
    await act(() => { pointer('pointerdown', 160, 240); pointer('pointermove', 240, 240); });
    expect(renderer.aimPreview).toBe(0);
    await act(() => pointer('pointerup', 240, 240));
    expect(renderer.state.feedback.text).toBe('Rail facing locked.');
    expect(selectedTower().facingMilliDegrees).toBe(0);
    expect(renderer.aimPreview).toBeNull();
  });

  it('animates upgrade choices outward from the held tower', async () => {
    await hold();
    const options = [...root.querySelectorAll<HTMLElement>('.radial-option')];
    expect(options).toHaveLength(3);
    expect(options.every(option => option.style.getPropertyValue('--radial-from-x') !== '')).toBe(true);
    expect(options.every(option => option.style.getPropertyValue('--radial-from-y') !== '')).toBe(true);
    expect(options.map(option => option.style.getPropertyValue('--radial-delay'))).toEqual(['0ms', '0ms', '0ms']);
  });
  it('canceling a hold keeps its Foundation but buys no specialist', async () => {
    const start = credits();
    await hold();
    expect(credits()).toBe(start - 10);
    await act(() => { pointer('pointercancel'); pointer('pointerup', 160, 162); });
    expect(credits()).toBe(start - 10);
    expect(root.querySelector('.tower-readout strong')?.textContent).toBe('foundation');
    expect(root.querySelector('.radial-layer')).toBeNull();
  });
  it('moving before hold pans without spending, and reserved cells never open a menu', async () => {
    const start = credits();
    await act(() => { pointer('pointerdown'); pointer('pointermove', 190, 240); });
    await act(() => { vi.advanceTimersByTime(500); renderer.frame(16, performance.now()); pointer('pointerup', 190, 240); });
    expect(credits()).toBe(start);
    renderer.cell = 18;
    await hold();
    expect(root.querySelector('.radial-layer')).toBeNull();
    expect(credits()).toBe(start);
  });
  it('rechecks affordability for click alternatives without spending or installing', async () => {
    for (const cell of [29, 42, 74, 96, 48]) {
      renderer.cell = cell;
      await hold();
      await act(() => button('Upgrade to siege, 50 credits').click());
    }
    renderer.cell = 57;
    await hold();
    await act(() => button('Upgrade to rail, 35 credits').click());
    renderer.cell = 76;
    await hold();
    const before = credits();
    expect(before).toBe(5);
    expect(button('Upgrade to arc, 45 credits').getAttribute('aria-disabled')).toBe('true');
    await act(() => button('Upgrade to arc, 45 credits').click());
    expect(credits()).toBe(before);
    expect(root.querySelector('.tower-readout strong')?.textContent).toBe('foundation');
  });
  it('drops interrupted touch pointers on blur so the next touch still builds', async () => {
    const before = credits();
    await act(() => pointer('pointerdown', 160, 240, 1));
    await act(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });
    await act(() => { pointer('pointerdown', 160, 240, 2); pointer('pointerup', 160, 240, 2); });
    expect(credits()).toBe(before - 10);
  });
});
