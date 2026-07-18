import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // The engine is pure and framework-free — a Node environment is all it needs.
    environment: 'node',
    include: ['src/lib/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/color/**/*.ts'],
      exclude: ['src/lib/color/**/*.{test,spec}.ts', 'src/lib/color/index.ts'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
