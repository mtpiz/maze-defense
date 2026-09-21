import type { BenchmarkCreepId } from '@tower-defense/content';

export interface SwarmMotion {
  readonly lateral: number;
  readonly longitudinal: number;
  readonly rotation: number;
  readonly scale: number;
}

const PROFILES: Record<BenchmarkCreepId, {
  lateral: number;
  longitudinal: number;
  rotation: number;
  scale: number;
  frequency: number;
}> = {
  broodling: { lateral: .22, longitudinal: 0, rotation: .12, scale: .08, frequency: .0028 },
  drone: { lateral: .14, longitudinal: 0, rotation: .04, scale: .045, frequency: .0024 },
  glider: { lateral: .18, longitudinal: .055, rotation: .12, scale: .04, frequency: .0038 },
  carapace: { lateral: .06, longitudinal: 0, rotation: .04, scale: .018, frequency: .0024 },
};

const hashIdentity = (identity: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
};

export function swarmMotion(identity: string, family: BenchmarkCreepId, timeMs: number,
  reducedMotion = false): SwarmMotion {
  if (reducedMotion) return { lateral: 0, longitudinal: 0, rotation: 0, scale: 1 };
  const profile = PROFILES[family];
  const hash = hashIdentity(identity);
  const phase = hash / 0xffffffff * Math.PI * 2;
  const lane = ((hash % 9) - 4) / 4;
  const wave = Math.sin(timeMs * profile.frequency + phase);
  const counterWave = Math.cos(timeMs * profile.frequency * .73 + phase * 1.7);
  const lateralUnit = lane * .72 + wave * .28;

  return {
    lateral: lateralUnit * profile.lateral,
    longitudinal: counterWave * profile.longitudinal,
    rotation: wave * profile.rotation,
    scale: 1 + counterWave * profile.scale,
  };
}

export function smoothHeading(current: number, target: number, elapsedMs: number,
  timeConstantMs = 140): number {
  const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const blend = 1 - Math.exp(-Math.max(0, elapsedMs) / Math.max(1, timeConstantMs));
  return current + delta * blend;
}
