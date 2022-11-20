import { defineConfig } from 'vite'
import visualizer from 'rollup-plugin-visualizer'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [visualizer()]
    }
  }
})
