import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The accounts API runs in `wrangler dev` on 8787; the dev site reaches it as /api.
  server: { proxy: { '/api': 'http://localhost:8787' } },
  worker: { format: 'es' }, // the Pyodide worker is a code-split ES module
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
  },
})
