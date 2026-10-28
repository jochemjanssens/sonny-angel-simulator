import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// One installable app (PWA) for both simulators: a web manifest with a
// shortcut per brand, icons and theme colour in index.html, and a service
// worker. The brand itself is picked in the app (see src/brand.js).
function pwa() {
  const icon = (name, size) => ({ src: `icons/${name}-${size}.png`, sizes: `${size}x${size}`, type: 'image/png' })
  return {
    name: 'pwa',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `    <link rel="manifest" href="manifest.webmanifest" />
    <meta name="theme-color" content="#E4002B" />
    <link rel="apple-touch-icon" href="icons/combo-180.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Blind Box" />
  </head>`,
      )
    },
    generateBundle() {
      const manifest = {
        name: 'Blind Box Simulator',
        short_name: 'Blind Box',
        id: './',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#E4002B',
        background_color: '#FFF9F3',
        icons: [192, 512].map((s) => ({ ...icon('combo', s), purpose: 'any maskable' })),
        // long-press the app icon to jump straight to one of the two
        shortcuts: [
          { name: 'Sonny Angel', url: './?brand=sonny', icons: [icon('sonny', 192)] },
          { name: 'Smiski', url: './?brand=smiski', icons: [icon('smiski', 192)] },
          { name: 'Turbo Minis', url: './?brand=cars', icons: [icon('cars', 192)] },
        ],
      }
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifest, null, 2) })
      // a new cache name for every build, so an update replaces the old files
      const sw = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8').replace('__BUILD__', String(Date.now()))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw })
    },
  }
}

export default defineConfig({
  plugins: [react(), pwa()],
  // Relative asset paths so the build works under any sub-path (e.g. GitHub Pages).
  base: './',
  // Listen on all interfaces so other devices on the local network can open it.
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
