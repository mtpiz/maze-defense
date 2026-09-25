import { describe, expect, it } from 'vitest';
import { KILL_BUCKETS, KILL_BUCKET_TICKS, KillHistory, bandMode, fittedBoard, mazeStats } from './hud-layout.js';

describe('HUD layout helpers', () => {
  it('fits the 9x14 board and reports the empty bands on a tall phone', () => {
    const board = fittedBoard(404, 780);
    expect(board.tile).toBeCloseTo(44);
    expect(board.x).toBeCloseTo(4);
    expect(board.y).toBeCloseTo((780 - 44 * 14) / 2);
    expect(bandMode(board.y)).toBe('full');
  });
  it('degrades band content as space shrinks', () => {
    expect(bandMode(60)).toBe('full');
    expect(bandMode(30)).toBe('compact');
    expect(bandMode(10)).toBe('hidden');
  });
  it('buckets kills by simulation time and resets on retry', () => {
    const history = new KillHistory();
    history.record(0, 0);
    history.record(10, 3);
    history.record(KILL_BUCKET_TICKS + 5, 5);
    const values = history.record(KILL_BUCKET_TICKS * 3, 6);
    expect(values).toHaveLength(KILL_BUCKETS);
    expect(values.slice(-4)).toEqual([3, 2, 0, 1]);
    expect(history.record(0, 0).every(value => value === 0)).toBe(true);
  });
  it('measures maze growth against the open route', () => {
    expect(mazeStats(Array(36).fill(0), 30)).toEqual({ length: 36, gain: 6 });
    expect(mazeStats(Array(30).fill(0), 0)).toEqual({ length: 30, gain: 0 });
  });
});
