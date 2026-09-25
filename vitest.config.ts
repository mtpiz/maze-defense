import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@tower-defense/content': fromRoot('./packages/content/src/index.ts'),
      '@tower-defense/sim': fromRoot('./packages/sim/src/index.ts'),
      '@tower-defense/balance': fromRoot('./packages/balance/src/index.ts'),
      '@tower-defense/testkit': fromRoot('./packages/testkit/src/index.ts'),
      '@tower-defense/world-01': fromRoot('./content/world-01'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    coverage: {
      include: ['packages/*/src/**/*.ts'],
    },
  },
});
