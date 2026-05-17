import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // Force PWA Service worker during npm run dev so PWA Install displays on port 5173
        suppressWarnings: true // Silence empty dev glob matching warnings in the terminal
      },
      injectRegister: false, // We register manually in main.jsx to control updates and notifications
      includeAssets: ['favicon.ico', 'favicon1rm.png', 'desktop.png', 'mobile.png'],
      manifest: {
        name: 'Weartual',
        short_name: 'Weartual',
        description: 'Weartual Progressive Web App',
        start_url: '/',
        id: '/', // Standard App ID
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#7c3aed',
        icons: [
          {
            src: 'favicon1rm192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'favicon1rm512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'favicon1dark192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'favicon1dark512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Weartual Studio Desktop View'
          },
          {
            src: 'mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Weartual Studio Mobile View'
          }
        ]
      },
      workbox: {
        // Ensure standard caching is enabled for standard assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Fallback to index.html for React Router SPA routes so that refreshing does not return a 404 offline
        navigateFallback: '/index.html',
        // Make sure it doesn't intercept backend API requests
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  server: {
    host: true,        // allow external access
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "satisfy-tremor-gray.ngrok-free.dev"
    ]
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "satisfy-tremor-gray.ngrok-free.dev"
    ]
  }
})


