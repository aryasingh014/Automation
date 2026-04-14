import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_SERVICENOW_INSTANCE_URL': JSON.stringify(env.SERVICENOW_INSTANCE_URL),
      'import.meta.env.VITE_SERVICENOW_USER': JSON.stringify(env.SERVICENOW_USER),
      'import.meta.env.VITE_SERVICENOW_PASSWORD': JSON.stringify(env.SERVICENOW_PASSWORD),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0', // Bind to 0.0.0.0
      allowedHosts: true, // Allows all hostnames (useful for Cloudflare tunnels)
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/now': {
          target: env.SERVICENOW_INSTANCE_URL || 'http://localhost',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[Vite Proxy] ServiceNow proxy error:', err.message);
            });
          }
        },

        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
  };
});
