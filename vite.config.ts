import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'libs': ['crypto-js', 'exceljs', 'xlsx', '@vercel/speed-insights'],
        }
      }
    },
    chunkSizeWarningLimit: 3000,
  }
})