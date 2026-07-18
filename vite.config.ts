import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages'te yayınlanırken base path: '/saat-katip/'
  // Lokal geliştirme için '/' olarak değiştirilebilir
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
