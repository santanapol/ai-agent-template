import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/auth': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
})
