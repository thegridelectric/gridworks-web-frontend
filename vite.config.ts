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
    // The dev server is opened by whatever host reached it, including a
    // Tailscale address. The gateway is a separate port; the socket is
    // proxied so the browser stays on the page's own host.
    allowedHosts: true,
    proxy: {
      '^/api': 'http://localhost:8000/',
      '^/gridworks-web-frontend/realtime': {
        target: 'http://127.0.0.1:8100',
        ws: true,
        rewrite: (path) => path.replace(/^\/gridworks-web-frontend/, ''),
      },
      // '^/api': {
      //   target: 'https://web-api2.electricity.works/',
      //   changeOrigin: true,
      //   secure: false,
      // },
    }
  }
})


