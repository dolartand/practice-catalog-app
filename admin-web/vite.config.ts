import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (dir: string) => fileURLToPath(new URL(`./src/${dir}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': src('app'),
      '@pages': src('pages'),
      '@features': src('features'),
      '@entities': src('entities'),
      '@shared': src('shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
