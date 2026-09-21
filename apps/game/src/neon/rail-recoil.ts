interface Recoil { shots: number; left: number; right: number }
export const kickBarrel = (previous: Recoil, now: number): Recoil => ({
  shots: previous.shots + 1,
  left: previous.shots % 2 === 0 ? now : previous.left,
  right: previous.shots % 2 === 1 ? now : previous.right,
});
export const barrelOffset = (firedAt: number, now: number): number => Math.max(0, 1 - (now - firedAt) / 190) * .17;
