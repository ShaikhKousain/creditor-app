import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'



   export default defineConfig({
     plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
   })

// inside plugins: [ ... ]
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
  manifest: {
    name: "Creditor",
    short_name: "Creditor",
    description: "Customer credit and debit ledger",
    theme_color: "#111827",
    background_color: "#ffffff",
    display: "standalone",
    start_url: "/",
    icons: [
      { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
      { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    navigateFallbackDenylist: [/^\/api/],
  },
})