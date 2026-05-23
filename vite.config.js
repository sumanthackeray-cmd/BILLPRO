import { VitePWA } from 'vite-plugin-pwa';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    logLevel: 'error',
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
                enabled: true,
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
                maximumFileSizeToCacheInBytes: 5000000,
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