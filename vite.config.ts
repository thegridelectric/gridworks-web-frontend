import { defineConfig } from 'vite'
import { mockDevServerPlugin } from 'vite-plugin-mock-dev-server'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/gridworks-web-frontend/',
  plugins: [
    react(),
    mockDevServerPlugin({
      prefix: ['/api'],
    })
  ],
  build: {
    // Enable production source maps (for both JS and CSS)
    sourcemap: true,
  },
  server: {
    proxy: {
      '^/api': 'http://example.com/'
    },
  }
})


