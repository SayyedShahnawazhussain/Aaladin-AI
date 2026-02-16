
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Explicitly stringify the environment variables for client-side access
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Cleaner production build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep logs for debugging
      }
    }
  }
});
