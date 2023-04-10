import { defineConfig } from 'vite'
import visualizer from 'rollup-plugin-visualizer'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [visualizer()],
      output: {
        manualChunks: {
          echarts: ['echarts', 'echarts-for-react'],
          dataGrid: ['@mui/x-data-grid'],
          codemirror: [
            'codemirror', 'react-codemirror2',
            ...['xml', 'yaml', 'shell', 'powershell', 'properties', 'javascript'].map(it => `codemirror/mode/${it}/${it}`),
            'codemirror/addon/hint/show-hint',
            'codemirror/addon/scroll/annotatescrollbar',
            'codemirror/addon/search/matchesonscrollbar',
            'codemirror/addon/search/match-highlighter',
            'codemirror/addon/search/jump-to-line',
            'codemirror/addon/dialog/dialog',
            'codemirror/addon/search/searchcursor',
            'codemirror/addon/search/search'
          ]
        }
      }
    }
  }
})
