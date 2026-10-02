import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { newsPlugin } from './scripts/lib/news-plugin.mjs';

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), newsPlugin({ command, mode })],
  base: '/', // Base must be '/' for User Pages (username.github.io)
  build: {
    outDir: 'dist',
  },
}));
