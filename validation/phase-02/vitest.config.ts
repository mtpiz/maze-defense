import { mergeConfig } from 'vitest/config';
import base from '../../vitest.config.ts';
import { resolve } from 'node:path';

export default mergeConfig(base, {
  // Test an isolated content worker against the current simulation and architect-owned contracts.
  resolve: { alias: {
    '@phase2/player-profile': resolve('apps/game/src/application/player-profile.ts'),
    '@phase2/profile-store': resolve('apps/game/src/platform/profile-store.ts'),
    ...(process.env.P2_CONTENT_ROOT
      ? { '@tower-defense/content': resolve(process.env.P2_CONTENT_ROOT, 'src/index.ts') } : {}),
  } },
  test: { include: ['validation/phase-02/**/*.acceptance.test.ts'] },
});
