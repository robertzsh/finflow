import { defineConfig } from 'vite';
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
});
