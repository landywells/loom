import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative so the mobile shell can resolve its own bundle:
  // Tauri serves Android from a custom origin where root-absolute paths 404.
  base: './',
  plugins: [react()],
})
