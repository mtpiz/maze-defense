// @vitest-environment jsdom

import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalSettingsStore, type LocalSettings } from '../platform/local-settings.js';
import { AudioFixture } from '../test/feedback-fixture.js';
import { BenchmarkApp } from './benchmark-app.js';

const preferences = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
const arena = vi.hoisted(() => ({ frameRate: 60 }));
vi.mock('@capacitor/preferences', () => ({ Preferences: preferences }));

// The DOM runner has no GPU. Keep the controller, settings, feedback, and UI real.
vi.mock('../presentation/arena-view.js', () => ({
  ArenaView: class {
    async initialize() {}
    render() {}
    setFrameRate(frameRate: number) { arena.frameRate = frameRate; }
    destroy() {}
  },
}));

const defaults: LocalSettings = {
  highContrast: false,
  reducedMotion: false,
  showAirRoute: true,
  effectsEnabled: true,
  hapticsEnabled: true,
  frameRate: 60,
};

describe('mounted settings and feedback lifecycle', () => {
  let root: HTMLDivElement;
  let stored: Map<string, string>;
  let vibrations: (number | number[])[];

  const button = (label: string): HTMLButtonElement => {
    const match = [...root.querySelectorAll('button')].find((element) =>
      element.getAttribute('aria-label') === label || element.textContent?.trim().startsWith(label));
    if (match === undefined) throw new Error(`Missing button: ${label}`);
    return match;
  };
  const tap = (element: HTMLButtonElement): void => {
    element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    element.click();
  };
  const mount = async (initialSettings = defaults): Promise<void> => {
    await act(() => render(h(BenchmarkApp, {
      initialSettings,
      settingsStore: new LocalSettingsStore(),
    }), root));
  };
  const openSettings = async (): Promise<void> => {
    await act(() => tap(button('Display settings')));
  };
  const build = async (): Promise<void> => {
    await act(() => tap(button('Row 2, column 2: open build tile')));
    expect(button('Row 2, column 2: foundation tower')).toBeDefined();
  };

  beforeEach(() => {
    vi.resetAllMocks();
    AudioFixture.instances = [];
    arena.frameRate = 60;
    vibrations = [];
    stored = new Map();
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
    preferences.get.mockImplementation(async ({ key }: { key: string }) => ({ value: stored.get(key) ?? null }));
    preferences.set.mockImplementation(async ({ key, value }: { key: string; value: string }) => { stored.set(key, value); });
    vi.stubGlobal('AudioContext', AudioFixture);
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(performance, 'now').mockReturnValue(1_000);
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => { vibrations.push(pattern); return true; },
    });
  });

  afterEach(async () => {
    await act(() => render(null, root));
    root.remove();
    Reflect.deleteProperty(navigator, 'vibrate');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('waits for stored opt-outs before mounting an interactive game', async () => {
    let finishRead!: (value: { value: string }) => void;
    preferences.get.mockReturnValue(new Promise((resolve) => { finishRead = resolve; }));
    await import('../main.js');
    expect(root.childElementCount).toBe(0);
    window.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(AudioFixture.instances).toHaveLength(0);

    await act(async () => finishRead({ value: JSON.stringify({
      schemaVersion: 1,
      settings: { highContrast: true, reducedMotion: true, showAirRoute: false, effectsEnabled: false, hapticsEnabled: false },
    }) }));
    await vi.waitFor(() => expect(root.querySelector('main')?.classList.contains('high-contrast')).toBe(true));
    await openSettings();
    expect(button('Reduced motion').getAttribute('aria-pressed')).toBe('true');
    expect(button('Air route').getAttribute('aria-pressed')).toBe('false');
    expect(button('Sound effects').getAttribute('aria-pressed')).toBe('false');
    expect(button('Haptics').getAttribute('aria-pressed')).toBe('false');
    await build();
    expect(AudioFixture.instances).toHaveLength(0);
    expect(vibrations).toEqual([]);
  });

  it('includes actual root UI commits in the exported diagnostic report', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      await mount();
      await openSettings();
      await act(() => tap(button('Engine diagnostics')));
      await act(() => tap(button('Copy JSON')));
      expect(writeText).toHaveBeenCalledOnce();
      const report = JSON.parse(writeText.mock.calls[0]![0]);
      expect(report.schemaVersion).toBe(3);
      expect(report.diagnostics.cpuWork.uiCommit.sampleCount).toBeGreaterThan(0);
      expect(report.diagnostics.gpuTiming).toBe('not-measured');
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('retains rapid mixed toggles in both the UI and the persisted settings', async () => {
    await mount();
    await openSettings();
    await act(() => {
      tap(button('High contrast'));
      tap(button('Reduced motion'));
      tap(button('Air route'));
      tap(button('Sound effects'));
      tap(button('Haptics'));
      tap(button('High contrast'));
    });
    await vi.waitFor(() => expect(JSON.parse(stored.get('maze-defense.settings')!)).toEqual({
      schemaVersion: 1,
      settings: { highContrast: false, reducedMotion: true, showAirRoute: false, effectsEnabled: false, hapticsEnabled: false, frameRate: 60 },
    }));
    expect(button('High contrast').getAttribute('aria-pressed')).toBe('false');
    expect(button('Reduced motion').getAttribute('aria-pressed')).toBe('true');
    expect(button('Air route').getAttribute('aria-pressed')).toBe('false');
    expect(button('Sound effects').getAttribute('aria-pressed')).toBe('false');
    expect(button('Haptics').getAttribute('aria-pressed')).toBe('false');
  });

  it('activates feedback on the first construction gesture', async () => {
    await mount();
    await build();
    expect(AudioFixture.current.voices.size).toBe(1);
    expect(vibrations).toEqual([12]);
  });

  it('persists the selected frame rate without changing independent mute settings', async () => {
    await mount({ ...defaults, effectsEnabled: false, hapticsEnabled: false });
    await openSettings();
    const battery = root.querySelector<HTMLInputElement>('input[name="frame-rate"][value="30"]');
    expect(battery).not.toBeNull();
    await act(async () => { battery!.click(); });
    await vi.waitFor(() => expect(JSON.parse(stored.get('maze-defense.settings')!).settings).toMatchObject({
      frameRate: 30, effectsEnabled: false, hapticsEnabled: false,
    }));
    expect(battery!.checked).toBe(true);
    expect(arena.frameRate).toBe(30);
    const quality = root.querySelector<HTMLInputElement>('input[name="frame-rate"][value="60"]');
    expect(quality!.checked).toBe(false);
  });

  it('cancels in-progress feedback through the actual mute controls', async () => {
    await mount();
    await build();
    await openSettings();
    await act(() => {
      tap(button('Sound effects'));
      tap(button('Haptics'));
    });
    expect(AudioFixture.current.voices.size).toBe(0);
    expect(vibrations).toEqual([12, 0]);
    vi.spyOn(performance, 'now').mockReturnValue(2_000);
    await act(() => tap(button('Row 2, column 3: open build tile')));
    expect(button('Row 2, column 3: foundation tower')).toBeDefined();
    expect(AudioFixture.current.voices.size).toBe(0);
    expect(vibrations).toEqual([12, 0]);
  });

  it('enables feedback after starting with saved opt-outs', async () => {
    await mount({ ...defaults, effectsEnabled: false, hapticsEnabled: false });
    await openSettings();
    await act(() => {
      tap(button('Sound effects'));
      tap(button('Haptics'));
    });
    vibrations.length = 0;
    await build();
    expect(AudioFixture.current.voices.size).toBe(1);
    expect(vibrations).toEqual([12]);
  });

  it('cancels feedback when the document becomes hidden', async () => {
    await mount();
    await build();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(AudioFixture.current.voices.size).toBe(0);
    expect(vibrations).toEqual([12, 0]);
  });

  it('leaves a backgrounded wave paused until the player resumes it', async () => {
    await mount();
    await act(() => tap(button('Launch wave 1')));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(button('Resume simulation').getAttribute('aria-pressed')).toBe('true');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(button('Resume simulation').getAttribute('aria-pressed')).toBe('true');
    await act(() => tap(button('Resume simulation')));
    expect(button('Pause simulation').getAttribute('aria-pressed')).toBe('false');
  });

  it('releases feedback and gesture listeners when the game unmounts', async () => {
    await mount();
    await build();
    await act(() => render(null, root));
    expect(AudioFixture.current.voices.size).toBe(0);
    expect(AudioFixture.current.state).toBe('closed');
    expect(vibrations).toEqual([12, 0]);
    window.dispatchEvent(new MouseEvent('pointerdown'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(AudioFixture.instances).toHaveLength(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(vibrations).toEqual([12, 0]);
  });

  it('reports a failed save and clears the error after a successful retry', async () => {
    preferences.set.mockRejectedValueOnce(new Error('Storage unavailable'));
    await mount();
    await openSettings();
    await act(async () => tap(button('High contrast')));
    await vi.waitFor(() => expect(root.querySelector('.settings-error')?.textContent).toContain('could not be saved'));
    expect(button('High contrast').getAttribute('aria-pressed')).toBe('true');
    await act(async () => tap(button('Reduced motion')));
    await vi.waitFor(() => expect(root.querySelector('.settings-error')).toBeNull());
    expect(JSON.parse(stored.get('maze-defense.settings')!).settings).toEqual({
      highContrast: true, reducedMotion: true, showAirRoute: true, effectsEnabled: true, hapticsEnabled: true, frameRate: 60,
    });
  });
});
