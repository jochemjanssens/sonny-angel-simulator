import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build works under any sub-path (e.g. GitHub Pages).
  base: './',
  // Listen on all interfaces so other devices on the local network can open it.
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
