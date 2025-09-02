import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: true, // Force use of port 5173, fail if occupied
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        timeout: 30000, // Increase proxy timeout
      }
    }
  },
  resolve: {
    alias: {
      'pg': '/src/lib/pg-browser-mock.ts'
    }
  },
  define: {
    'process.env': {
      DATABASE_URL: JSON.stringify(process.env.DATABASE_URL || 'postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes')
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});