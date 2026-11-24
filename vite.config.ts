import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Entrenos',
        short_name: 'Entrenos',
        description: 'Entrenamiento entre entrenador y cliente',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f2f5f4',
        theme_color: '#0f5c5c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: { environment: 'node' }
})
