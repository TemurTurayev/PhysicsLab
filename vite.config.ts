import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  worker: { format: 'es' }, // the Pyodide worker is a code-split ES module
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})