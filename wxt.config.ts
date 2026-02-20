import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'downloads']
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      nodePolyfills({
        include: ['path', 'fs', 'util', 'stream', 'buffer', 'process'],
        globals: {
          Buffer: true,
          global: true,
          process: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        'node:async_hooks': path.resolve(__dirname, './lib/polyfills/async_hooks.ts'),
        async_hooks: path.resolve(__dirname, './lib/polyfills/async_hooks.ts')
      }
    }
  })
});
