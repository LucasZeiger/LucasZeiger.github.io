import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Base must be '/' for User Pages (username.github.io)
  build: {
    outDir: 'dist',
  },
});