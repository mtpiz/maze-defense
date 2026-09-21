const clampUnit = (value: number): number => {
  if (!Number.isFinite(value)) return value > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, value));
};

export const siegeFlightProgress = (firedTick: number, impactTick: number, currentTick: number): number => {
  const duration = impactTick - firedTick;
  if (!Number.isFinite(duration) || duration <= 0) return 1;
  if (!Number.isFinite(currentTick)) return currentTick > 0 ? 1 : 0;
  return clampUnit((currentTick - firedTick) / duration);
};

export const burstLifetime = (reducedMotion: boolean): number => reducedMotion ? 180 : 620;

export const burstProgress = (ageMs: number, reducedMotion: boolean): number =>
  clampUnit(ageMs / burstLifetime(reducedMotion));
