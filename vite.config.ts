import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { prerenderPlugin } from './src/build';
import { HUB_URL } from './src/games';
import { Landing } from './pages/Landing';
import { HUB_TAGS } from './pages/hubMeta';

export default defineConfig({
  plugins: [
    react(),
    prerenderPlugin({
      pages: () => ({ pages: [{ path: '/', tags: HUB_TAGS, body: renderToString(createElement(Landing)) }] }),
      url: (path) => HUB_URL + path,
      origin: HUB_URL,
    }),
  ],
  build: {
    outDir: 'dist-site',
    rollupOptions: {
      // demo.html is dev-only: `npm run dev` serves it, the deployed hub never includes it.
      input: { index: resolve(__dirname, 'index.html') },
    },
  },
});
