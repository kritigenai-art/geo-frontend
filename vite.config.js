import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Nominatim (reverse geocoding + search)
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/nominatim/, ''),
        headers: { 'User-Agent': 'TravelGoApp/1.0' },
      },
      // Open-Meteo (weather)
      '/openmeteo': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/openmeteo/, ''),
      },
      // Wikipedia
      '/wikipedia': {
        target: 'https://en.wikipedia.org',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/wikipedia/, ''),
      },
      // Overpass API
      '/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/overpass/, ''),
      },
      // OSRM routing
      '/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/osrm/, ''),
      },
      // Google News RSS
      '/gnews': {
        target: 'https://news.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/gnews/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      },
      // YouTube search proxy
      '/ytsearch': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        secure: false,
        rewrite: p => p.replace(/^\/ytsearch/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml',
        },
      },
    },
  },
})