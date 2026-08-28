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
  build: {
    // Chunks below are intentionally vendor-sized; gzip transfer is what matters
    // (each is well under 250 KB gzipped). Raise the advisory raw-size warning.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split big vendors into their own cacheable chunks. NOTE: xlsx/jspdf/
        // html2canvas/dompurify are intentionally left out so they stay as the
        // lazy async chunks (loaded only when the user exports).
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/xlsx|jspdf|html2canvas|dompurify|purify/.test(id)) return; // keep lazy
          if (/recharts|d3-|victory|internmap|delaunator|robust-predicates/.test(id)) return 'charts';
          if (/framer-motion|popmotion|@motionone|style-value-types|tslib/.test(id)) return 'motion';
          if (/@supabase|@supabase\/.*|@react-native|whatwg-url|websocket/.test(id)) return 'supabase';
          if (/react-router|react-dom|[/\\]react[/\\]|[/\\]scheduler[/\\]/.test(id)) return 'react';
          if (/date-fns/.test(id)) return 'date';
          if (/lucide-react/.test(id)) return 'icons';
          return 'vendor';
        },
      },
    },
  },
});
