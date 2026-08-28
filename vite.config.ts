import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Standard multi-file build (separate hashed CSS/JS). Safari does not reliably
// apply a multi-MB inline stylesheet, so we keep CSS as its own file.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // Vitest = unit tests only (src/**/*.test.ts). The Playwright E2E specs live in
  // tests/e2e/*.spec.ts and must NOT be picked up here (Playwright runs those).
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
  },
  build: {
    // Let Vite/Rollup chunk automatically. (A manual React/vendor split broke the
    // load order — React came back undefined at runtime.) Route-level code-splitting
    // and lazy PDF/Excel already do the heavy lifting; just quiet the advisory
    // raw-size warning since gzip transfer is what actually matters.
    chunkSizeWarningLimit: 900,
  },
});
