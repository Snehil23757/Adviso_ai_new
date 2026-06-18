import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // This repository is also opened through E:\\Trae\\Adviso_ai, which can be a
  // junction to the canonical workspace. Pinning Vite to the config directory
  // prevents Rollup and the dev server from mixing junction and real paths.
  const projectRoot = fs.realpathSync(path.resolve(__dirname));
  if (fs.realpathSync(process.cwd()) !== projectRoot) {
    process.chdir(projectRoot);
  }
  const env = loadEnv(mode, projectRoot, '');

  return {
    root: projectRoot,
    envDir: projectRoot,
    base: '/',

    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': projectRoot,
        'lucide-react': path.resolve(projectRoot, 'src/components/professional-icons.tsx'),
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

    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('firebase')) return 'firebase-vendor';
            if (id.includes('motion')) return 'motion-vendor';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
            if (id.includes('papaparse')) return 'data-vendor';
            return undefined;
          },
        },
      },
    },
  };
});
