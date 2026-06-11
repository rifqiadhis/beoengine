import { defineConfig } from 'vite'
import path from 'path'

/**
 * Vite config for building the BeoEngine runtime as a self-contained IIFE.
 * Output: dist/beo.runtime.js
 * Exposes everything via window.BeoEngine
 *
 * Usage: npx vite build --config vite.runtime.config.ts
 */
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'BeoEngine',
      formats: ['iife'],
      fileName: () => 'beo.runtime.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'oxc',
  },
})
