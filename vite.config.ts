import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// tibelson.github.io is a user site, so it is served from the domain root.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
