// @vitest-environment jsdom

import { render } from 'preact';
import { act } from 'preact/test-utils';
import { expect, it, vi } from 'vitest';

const preferences = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('@capacitor/preferences', () => ({ Preferences: preferences }));
vi.mock('../presentation/arena-view.js', () => ({
  ArenaView: class {
    async initialize() {}
    render() {}
    setFrameRate() {}
    destroy() {}
  },
}));

it('opens the real game with saved opt-outs after the first native settings callback is lost', async () => {
  vi.useFakeTimers();
  const root = document.createElement('div');
  root.id = 'app';
  document.body.appendChild(root);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  preferences.get.mockReturnValueOnce(new Promise(() => {})).mockResolvedValue({
    value: JSON.stringify({ schemaVersion: 1, settings: {
      highContrast: true, reducedMotion: true, effectsEnabled: false, hapticsEnabled: false, frameRate: 30,
    } }),
  });
  try {
    await import('../main.js');
    expect(root.childElementCount).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(preferences.get).toHaveBeenCalledTimes(2);
    expect(root.querySelector('main.high-contrast')).not.toBeNull();
    await act(() => root.querySelector<HTMLButtonElement>('[aria-label="Display settings"]')!.click());
    for (const label of ['Sound effects', 'Haptics']) {
      const control = [...root.querySelectorAll('button')].find((button) => button.textContent?.startsWith(label));
      expect(control?.getAttribute('aria-pressed')).toBe('false');
    }
    expect(root.querySelector<HTMLInputElement>('input[value="30"]')?.checked).toBe(true);
    expect(preferences.set).not.toHaveBeenCalled();
  } finally {
    await act(() => render(null, root));
    root.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
