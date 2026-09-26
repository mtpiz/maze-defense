import type { Graphics } from 'pixi.js';

interface Point { readonly x: number; readonly y: number }

// Level 1 timings. The whole Level 1 shot is gone within about 200 ms.
const SLUG_TRAVEL_MS = 90;
const STREAK_CATCH_UP_MS = 70;

/**
 * A Rail slug at Tower Level 1 to 5. Level 1 is deliberately plain: a small slug with a short streak and
 * two sparks. Each Level lengthens and brightens the streak and widens the hit spray; a hit ring joins at
 * Level 3 and an afterimage along the whole path at Level 4. `age` is milliseconds since firing.
 */
export function drawRailSlug(g: Graphics, muzzle: Point, target: Point, age: number, level: number,
  color: number, core: number, reducedMotion: boolean): void {
  const t = level - 1;
  const dx = target.x - muzzle.x, dy = target.y - muzzle.y, distance = Math.hypot(dx, dy) || .001;
  const ux = dx / distance, uy = dy / distance;
  const at = (d: number): Point => ({ x: muzzle.x + ux * d, y: muzzle.y + uy * d });
  const segment = (a: Point, b: Point, stroke: number, width: number, alpha: number) => {
    if (alpha > 0) g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: stroke, width, alpha, cap: 'round' });
  };
  const travel = SLUG_TRAVEL_MS - 8 * t, length = .16 + .1 * t, width = .022 + .012 * t, coreAlpha = .75 + .05 * t;
  const streakEnd = travel + STREAK_CATCH_UP_MS;

  const flashLife = 60 + 25 * level;
  if (age < flashLife) g.circle(muzzle.x, muzzle.y, .025 + .015 * level).fill({ color: core, alpha: .7 * (1 - age / flashLife) });

  if (age < streakEnd) {
    // Reduced motion shows the streak resting at the target and fading, without travel.
    const head = reducedMotion ? distance : Math.min(1, age / travel) * distance;
    const catchUp = reducedMotion ? 0 : Math.min(1, Math.max(0, age - travel) / STREAK_CATCH_UP_MS);
    const tail = Math.max(0, head - length * (1 - catchUp));
    const fade = reducedMotion ? 1 - age / streakEnd : 1;
    segment(at(tail), at(head), color, width * 2.2, .35 * fade);
    segment(at(tail), at(head), core, width * .7, coreAlpha * fade);
    if (!reducedMotion && age < travel) {
      const p = at(head);
      g.circle(p.x, p.y, width * .9).fill({ color: core, alpha: coreAlpha });
    }
  }
  if (level >= 4 && age < 400) segment(muzzle, target, color, .008 + .004 * t, .2 * (level - 3) * (1 - age / 400));

  const hitAge = age - (reducedMotion ? 0 : travel), hitLife = 50 + 60 * level;
  if (hitAge < 0 || hitAge >= hitLife) return;
  const p = hitAge / hitLife;
  g.circle(target.x, target.y, (.03 + .015 * level) * (1 - p * .5)).fill({ color: core, alpha: .75 * (1 - p) });
  const sparkLife = 70 + 20 * t;
  if (!reducedMotion && hitAge < sparkLife) {
    const q = hitAge / sparkLife, sparks = 2 * level, spread = .6 + .35 * level, heading = Math.atan2(uy, ux);
    for (let i = 0; i < sparks; i++) {
      const a = heading + (i / (sparks - 1) - .5) * spread;
      const d0 = .03 + (.06 + .05 * level) * q, d1 = d0 + .04 + .02 * level;
      segment({ x: target.x + Math.cos(a) * d0, y: target.y + Math.sin(a) * d0 },
        { x: target.x + Math.cos(a) * d1, y: target.y + Math.sin(a) * d1 }, core, .012 + .004 * level, .75 * (1 - q));
    }
  }
  if (level >= 3) g.circle(target.x, target.y, (.06 + .05 * level) * p).stroke({ color, width: .015, alpha: .7 * (1 - p) });
}
