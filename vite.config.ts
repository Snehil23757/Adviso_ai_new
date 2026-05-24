import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',

    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'lucide-react': path.resolve(__dirname, 'src/components/professional-icons.tsx'),
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',

      watch: process.env.DISABLE_HMR === 'true' ? null : {},

      proxy: {
        '/api': {
          target:
            process.env.PYTHON_API_URL ||
            env.PYTHON_API_URL ||
            'http://127.0.0.1:8000',

          changeOrigin: true,
        },
      },
    },
  };
});