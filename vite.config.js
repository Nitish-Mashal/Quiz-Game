import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   devOptions: {
    //     enabled: true,
    //     type: 'module',
    //   },
    //   manifest: {
    //     name: 'Quiz-Game',
    //     short_name: 'MyApp',
    //     description: 'My Awesome App description',
    //     theme_color: '#ffffff',
    //     icons: [
    //       {
    //         "src": "/pwa-192x192.png",
    //         "sizes": "192x192",
    //         "type": "image/png",
    //         "purpose": "any"
    //       },
    //       {
    //         "src": "/pwa-512x512.png",
    //         "sizes": "512x512",
    //         "type": "image/png",
    //         "purpose": "any"
    //       },
    //       {
    //         "src": "/pwa-maskable-192x192.png",
    //         "sizes": "192x192",
    //         "type": "image/png",
    //         "purpose": "maskable"
    //       },
    //       {
    //         "src": "/pwa-maskable-512x512.png",
    //         "sizes": "512x512",
    //         "type": "maskable"
    //       }
    //     ]
    //   }
    // })
  ],
})
