import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.trace', 'console.log', 'console.info']
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        // Hash unique pour cache busting automatique
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
        },
      },
      onwarn(warning, warn) {
        // Ignorer les warnings de chunk size pour le build
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      }
    },
    chunkSizeWarningLimit: 1000,
    // Améliorer la compatibilité mobile
    target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari13'],
  },
  publicDir: 'public',
  resolve: {
    dedupe: ['react', 'react-dom'], // Force une seule instance de React
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['jspdf', 'jspdf-autotable', 'react', 'react-dom'],
    esbuildOptions: {
      target: 'es2015'
    }
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  // Améliorer la gestion des erreurs
  logLevel: 'info',
});
