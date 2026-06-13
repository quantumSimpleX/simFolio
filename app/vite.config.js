import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Yahoo Finance chart API has no CORS headers — proxy it in dev so
      // candle fetches work from the browser (see useStockDetail.js).
      '/yf': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/yf/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    alias: [
      // All tests run against a mocked Supabase client — no network
      { find: /^(.*)\/lib\/supabase$/, replacement: fileURLToPath(new URL('./src/test/supabaseMock.js', import.meta.url)) },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}', 'supabase/functions/_shared/**/*.ts'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/assets/**', 'src/lib/supabase.js'],
      thresholds: { lines: 80 },
    },
  },
})
