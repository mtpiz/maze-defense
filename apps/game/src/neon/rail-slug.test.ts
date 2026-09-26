import { describe, expect, it } from 'vitest';
import type { Graphics } from 'pixi.js';
import { drawRailSlug } from './rail-slug.js';

type Stroke = { width: number; alpha: number };

class GraphicsMock {
  strokes: Stroke[] = [];
  moveTo() { return this; }
  lineTo() { return this; }
  stroke(style: Stroke) { this.strokes.push(style); return this; }
  circle() { return this; }
  fill() { return this; }
}

const draw = (level: number, age: number) => {
  const g = new GraphicsMock();
  drawRailSlug(g as unknown as Graphics, { x: 0, y: 0 }, { x: 2, y: 0 }, age, level, 0x48cfff, 0x76dbff, false);
  return g;
};

describe('rail slug level ladder', () => {
  it('keeps Level 1 plain and makes each higher Level longer, wider, and busier', () => {
    const inFlight = [1, 3, 5].map(level => draw(level, 60));
    const streakWidth = inFlight.map(g => Math.max(...g.strokes.map(s => s.width)));
    expect(streakWidth[0]).toBeLessThanOrEqual(.05);
    expect(streakWidth[1]).toBeGreaterThan(streakWidth[0]!);
    expect(streakWidth[2]).toBeGreaterThan(streakWidth[1]!);

    const atHit = (level: number) => draw(level, 90 - 8 * (level - 1) + 10);
    const sparkCount = (level: number) => atHit(level).strokes.filter(s => s.width === .012 + .004 * level).length;
    expect(sparkCount(1)).toBe(2);
    expect(sparkCount(5)).toBe(10);
  });

  it('draws nothing once a Level 1 shot has finished', () => {
    expect(draw(1, 400).strokes).toHaveLength(0);
  });
});
