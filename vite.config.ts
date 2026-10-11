import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-site',
    rollupOptions: {
      // demo.html is dev-only: `npm run dev` serves it, the deployed hub never includes it.
      input: { index: resolve(__dirname, 'index.html') },
    },
  },
});
