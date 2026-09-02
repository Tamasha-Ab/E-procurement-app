import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'https://e-procument-app-backend.onrender.com'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API requests to the Spring Boot server.
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       // Every request starting with /api will be forwarded to Spring Boot
//       '/api': {
//         target: 'http://localhost:8081',   // ← your Spring Boot port
//         changeOrigin: true,
//         secure: false,
//       },
//     },
//   },
// })