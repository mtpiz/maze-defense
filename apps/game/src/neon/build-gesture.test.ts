import { describe, expect, it, vi } from 'vitest';
import { BuildGesture, HOLD_MS, radialCenter, radialSlot } from './build-gesture.js';

const setup = () => {
  const tap = vi.fn();
  const hold = vi.fn();
  const pan = vi.fn();
  const release = vi.fn();
  return { gesture: new BuildGesture({ tap, hold, pan, release }), tap, hold, pan, release };
};

describe('direct Foundation gestures', () => {
  it('places once on a short tap, not on pointer down', () => {
    const { gesture, tap, hold } = setup();
    gesture.down(4, 20, 30, 0);
    expect(tap).not.toHaveBeenCalled();
    gesture.up(20, 30);
    gesture.up(20, 30);
    expect(tap).toHaveBeenCalledExactlyOnceWith(4);
    expect(hold).not.toHaveBeenCalled();
  });
  it('holds once, then release commits only via the radial handler', () => {
    const { gesture, tap, hold, release } = setup();
    gesture.down(8, 40, 50, 0);
    expect(HOLD_MS).toBe(220);
    gesture.update(219);
    expect(hold).not.toHaveBeenCalled();
    gesture.update(220);
    gesture.update(700);
    gesture.move(90, 10);
    gesture.up(90, 10);
    expect(hold).toHaveBeenCalledExactlyOnceWith(8, 40, 50);
    expect(release).toHaveBeenCalledExactlyOnceWith(90, 10);
    expect(tap).not.toHaveBeenCalled();
  });
  it('movement before hold pans without accidental construction', () => {
    const { gesture, tap, hold, pan, release } = setup();
    gesture.down(8, 40, 50, 0);
    gesture.move(65, 50);
    gesture.update(500);
    gesture.up(65, 50);
    expect(pan).toHaveBeenCalledWith(25, 0);
    expect(tap).not.toHaveBeenCalled();
    expect(hold).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });
  it('cancel and second-touch cancellation never build or commit', () => {
    const { gesture, tap, hold, release } = setup();
    gesture.down(4, 20, 30, 0);
    gesture.cancel();
    gesture.update(500);
    gesture.up(20, 30);
    expect(tap).not.toHaveBeenCalled();
    expect(hold).not.toHaveBeenCalled();
    gesture.down(4, 20, 30, 600);
    gesture.update(1000);
    gesture.cancel();
    gesture.up(90, 10);
    expect(release).not.toHaveBeenCalled();
  });
  it('clamps the radial at edges and leaves center/outside as cancellation zones', () => {
    expect(radialCenter(3, 4, 360, 500)).toEqual({ x: 116, y: 116 });
    expect(radialCenter(359, 499, 360, 500)).toEqual({ x: 244, y: 384 });
    expect(radialSlot(0, 0)).toBeNull();
    expect(radialSlot(200, 0)).toBeNull();
    expect(radialSlot(0, -78)).toBe(0);
    expect(radialSlot(68, 39)).toBe(1);
    expect(radialSlot(-68, 39)).toBe(2);
  });
});
