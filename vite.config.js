import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Garante caminhos relativos para funcionar no Netlify
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Otimização para bibliotecas grandes como o Three.js
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  publicDir: 'public',
  server: {
    port: 3000
  }
});