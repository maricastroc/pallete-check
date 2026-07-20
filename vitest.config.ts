import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'eval/**/*.{test,spec}.ts'],
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
