import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The app calls the API at the same origin (/api). In development and in
// `vite preview` this proxy forwards those calls to the backend, so the httpOnly
// auth cookie stays first-party and no CORS is needed. Only the target is
// configurable, in one place: API_PROXY_TARGET=http://localhost:5000 (default).
const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    restoreMocks: true,
  },
})
