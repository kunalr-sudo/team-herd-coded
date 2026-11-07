import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // three.js + drei + postprocessing dominate the single-screen bundle (~365 kB gzip).
  build: { chunkSizeWarningLimit: 1500 },
})
