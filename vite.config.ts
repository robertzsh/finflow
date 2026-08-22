import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// viteSingleFile inlines all JS + CSS into one index.html. This removes separate
// asset files, so the browser can never serve a page with its stylesheet missing
// (the recurring "unstyled on hard-refresh" issue on Safari / GitHub Pages CDN).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
