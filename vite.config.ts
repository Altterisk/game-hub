import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-site',
    rollupOptions: {
      input: { index: resolve(__dirname, 'index.html'), demo: resolve(__dirname, 'demo.html') },
    },
  },
});
