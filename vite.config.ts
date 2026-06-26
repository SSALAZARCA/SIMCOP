import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3010,
      host: '0.0.0.0',
    },
    plugins: [react(), cesium()],
    define: {
      // Manually inject VITE_GEMINI_API_KEY into import.meta.env
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'global': 'window',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('cesium')) return 'cesium';
              if (id.includes('leaflet')) return 'leaflet';
              if (id.includes('react')) return 'vendor';
              return 'deps';
            }
          }
        }
      }
    }
  };
});

