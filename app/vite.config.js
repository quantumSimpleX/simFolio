import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
