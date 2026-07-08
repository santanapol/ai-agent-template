import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Harness dev loop (scripts/dev-up.sh) overrides these per PORT_OFFSET so
// multiple worktrees can run isolated frontend instances side by side.
const port = Number(process.env.BACKOFFICE_PORT ?? 5175)
const authTarget = process.env.AUTH_PROXY_TARGET ?? 'http://127.0.0.1:3001'
const gatewayTarget = process.env.GATEWAY_PROXY_TARGET ?? 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port,
    proxy: {
      '/auth': { target: authTarget, changeOrigin: true },
      '/api': { target: gatewayTarget, changeOrigin: true },
    },
  },
})
