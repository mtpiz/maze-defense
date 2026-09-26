import { levelScale } from './neon-art.js';

export interface ShellPoint { readonly x: number; readonly y: number }

export interface ShellPose extends ShellPoint {
  /** Where the shell's shadow falls: the straight line from muzzle to impact. */
  readonly ground: ShellPoint;
  /** 0 at launch and impact, 1 at the top of the arc. */
  readonly height: number;
}

// Peak height of the lobbed arc, in cells drawn up the screen.
export const SHELL_ARC_HEIGHT = .7;

/** Shell radius in cells: it grows with the firing tower's Level, like the tower, and swells on the arc. */
export const siegeShellRadius = (level: number, height: number): number => .1 * levelScale(level) * (1 + .3 * height);

/** Siege shell position along its lob from the muzzle to the impact point. */
export function siegeShellPose(muzzle: ShellPoint, impact: ShellPoint, progress: number): ShellPose {
  const t = Math.max(0, Math.min(1, progress));
  const ground = { x: muzzle.x + (impact.x - muzzle.x) * t, y: muzzle.y + (impact.y - muzzle.y) * t };
  const height = Math.sin(t * Math.PI);
  return { x: ground.x, y: ground.y - height * SHELL_ARC_HEIGHT, ground, height };
}
