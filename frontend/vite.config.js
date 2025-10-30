import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate React libraries for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Separate icon library
          'icons': ['lucide-react'],
          // Separate axios for API calls
          'api-vendor': ['axios']
        }
      }
    }
  }
})
