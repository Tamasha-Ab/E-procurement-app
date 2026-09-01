import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Every request starting with /api will be forwarded to Spring Boot
      '/api': {
        target: 'http://localhost:8081',   // ← your Spring Boot port
        changeOrigin: true,
        secure: false,
      },
    },
  },
})