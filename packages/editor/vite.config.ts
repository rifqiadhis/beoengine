import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      // Makes `import ... from 'beo'` resolve to the engine source
      beo: path.resolve(__dirname, '../engine/src/index.ts'),
    },
  },
})
