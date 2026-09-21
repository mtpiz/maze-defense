import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const fromApp = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@tower-defense/content': fromApp('../../packages/content/src/index.ts'),
      '@tower-defense/sim': fromApp('../../packages/sim/src/index.ts'),
      '@tower-defense/world-01': fromApp('../../content/world-01'),
    },
  },
  build: {
    target: 'ES2022',
    outDir: 'dist',
    rollupOptions: { input: { benchmark: fromApp('./index.html'), neon: fromApp('./neon.html') } },
  },
  server: {
    host: '0.0.0.0',
  },
});
