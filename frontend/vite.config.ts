import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Read .env from the repo root (one shared .env for the whole project, per Phase 1.4)
  // instead of requiring a duplicate frontend/.env.
  envDir: fileURLToPath(new URL('..', import.meta.url)),
})
