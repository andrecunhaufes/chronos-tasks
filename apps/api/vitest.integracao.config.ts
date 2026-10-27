import swc from 'unplugin-swc';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Requer PostgreSQL, Redis e o seed do administrador da plataforma.
// O plugin SWC emite os metadados de decorator que a injeção do Nest exige.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
