import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
    logLevel: 'error',
    resolve: {
        alias: {
            "@": fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    plugins: [
        base44({
            legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
            hmrNotifier: true,
            navigationNotifier: true,
            analyticsTracker: true,
            visualEditAgent: true
        }),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: false,
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json,woff2}'],
                maximumFileSizeToCacheInBytes: 5000000,
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/__/],
                runtimeCaching: [
                    {
                        urlPattern: ({ request }) => request.mode === 'navigate',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'easybmt-pages',
                            networkTimeoutSeconds: 8,
                            expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
                        },
                    },
                    {
                        urlPattern: /\.(?:js|css|woff2?)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'easybmt-static',
                            expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                        },
                    },
                ],
            },
            manifest: {
                name: 'EasyBMT Enterprise POS',
                short_name: 'EasyBMT',
                description: 'Advanced Billing & Management Terminal',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                start_url: "/",
                icons: [
                    {
                        src: '/vite.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: '/vite.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    }
                ]
            }
        }),
        ViteImageOptimizer({
            png: { quality: 80 },
            jpeg: { quality: 80 },
            jpg: { quality: 80 },
            webp: { lossless: true },
            avif: { lossless: true },
        }),
    ],
    server: {
        port: 5174,
        strictPort: false
    },
    build: {
        target: 'esnext',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false, // DO NOT drop console to allow debugging
                drop_debugger: true,
            },
        }
    }
});