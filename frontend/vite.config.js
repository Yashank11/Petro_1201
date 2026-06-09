import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Petro_1201/',
  server: {
    host: true,
    allowedHosts: [
      'king-evacuee-pampered.ngrok-free.dev'
    ],
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})