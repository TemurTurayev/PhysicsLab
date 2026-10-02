import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' }, // the Pyodide worker is a code-split ES module
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
