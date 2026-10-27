import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Os testes de `e2e/` são do Playwright; o Vitest não deve coletá-los.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    passWithNoTests: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
