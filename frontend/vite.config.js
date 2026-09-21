import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { parseAllowedHosts } from './config/allowedHosts'

// The app calls the API at the same origin (/api). In development and in
// `vite preview` this proxy forwards those calls to the backend, so the httpOnly
// auth cookie stays first-party and no CORS is needed. Only the target is
// configurable, in one place: API_PROXY_TARGET=http://localhost:5000 (default).
//
// Phone testing goes through an HTTPS tunnel, whose hostname Vite would refuse. Name it in
// VITE_ALLOWED_HOSTS (e.g. .trycloudflare.com); unset, Vite's default host checks apply.
const allowedHosts = parseAllowedHosts(process.env.VITE_ALLOWED_HOSTS)

const apiProxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://localhost:5000',
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy, ...(allowedHosts && { allowedHosts }) },
  preview: { proxy: apiProxy, ...(allowedHosts && { allowedHosts }) },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    restoreMocks: true,
    unstubGlobals: true,
  },
})
