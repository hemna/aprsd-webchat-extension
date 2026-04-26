import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/v2/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/sendmsg': {
        target: 'http://localhost:8001',
        ws: true,
      },
      '/socket.io': {
        target: 'http://localhost:8001',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:8001',
      },
      '/stats': {
        target: 'http://localhost:8001',
      },
      '/send-message-status': {
        target: 'http://localhost:8001',
      },
      '/location': {
        target: 'http://localhost:8001',
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
